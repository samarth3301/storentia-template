// End-to-end smoke test against a REAL store: drives a running server through
// browse -> add to cart -> checkout -> order, using only fetch.
//
// Usage: node scripts/smoke.mjs [baseUrl]
//
// The server must be configured with live Storentia credentials and the store
// must have at least one ACTIVE product. Steps that need a signed-in customer
// are skipped unless you supply a JWT, because the email sign-in code is
// delivered out of band and cannot be automated:
//
//   SMOKE_CUSTOMER_JWT=<jwt>     token from auth.verifyAuthenticationEmail
//   SMOKE_DISCOUNT_CODE=<code>   a real, currently valid discount code

import assert from "node:assert/strict";

const base = process.argv[2] ?? "http://localhost:3000";
const jar = new Map();

function saveCookies(res) {
  for (const raw of res.headers.getSetCookie?.() ?? []) {
    const [pair] = raw.split(";");
    const index = pair.indexOf("=");
    jar.set(pair.slice(0, index), pair.slice(index + 1));
  }
}

const cookieHeader = () => [...jar].map(([k, v]) => `${k}=${v}`).join("; ");

async function get(path) {
  const res = await fetch(base + path, {
    headers: { cookie: cookieHeader() },
    redirect: "manual",
  });
  saveCookies(res);
  if (res.status >= 300 && res.status < 400) {
    return {
      status: res.status,
      location: res.headers.get("location"),
      html: "",
    };
  }
  return { status: res.status, location: null, html: await res.text() };
}

/**
 * Submits a Server Action the way a browser without JavaScript does: multipart
 * form data containing the `$ACTION_ID_<id>` marker, posted to the same URL.
 * `index` picks which action on the page to call (0 = first rendered form).
 */
async function post(path, fields, index = 0) {
  const page = await get(path);
  const ids = [...page.html.matchAll(/\$ACTION_ID_([a-f0-9]{40,})/gi)].map(
    (m) => m[1],
  );
  const actionId = [...new Set(ids)][index];
  assert.ok(actionId, `no server action #${index} found on ${path}`);

  const body = new FormData();
  body.append(`$ACTION_ID_${actionId}`, "");
  for (const [key, value] of Object.entries(fields)) body.append(key, value);

  const res = await fetch(base + path, {
    method: "POST",
    headers: { cookie: cookieHeader(), origin: base },
    body,
    redirect: "manual",
  });
  saveCookies(res);
  assert.ok(res.status < 400, `action on ${path} returned ${res.status}`);
  return { status: res.status, location: res.headers.get("location") };
}

/** Keeps failures readable: never dumps the whole HTML document. */
function has(html, needle, label) {
  assert.ok(html.includes(needle), `${label ?? "page"} is missing “${needle}”`);
}
function lacks(html, needle, label) {
  assert.ok(
    !html.includes(needle),
    `${label ?? "page"} unexpectedly contains “${needle}”`,
  );
}

const CUSTOMER_JWT = process.env.SMOKE_CUSTOMER_JWT ?? "";
const DISCOUNT_CODE = process.env.SMOKE_DISCOUNT_CODE ?? "";

const steps = [];
function skip(name, why) {
  steps.push(`  skip ${name} (${why})`);
}
async function step(name, fn) {
  try {
    await fn();
    steps.push(`  ok   ${name}`);
  } catch (error) {
    steps.push(`  FAIL ${name}: ${error.message}`);
    throw error;
  }
}

let productId;

try {
  await step("home page renders products", async () => {
    const { status, html } = await get("/");
    assert.equal(status, 200);
    has(html, "Latest products", "home");
    productId = html.match(/\/products\/([\w-]+)"/)?.[1];
    assert.ok(productId, "no product link on home page");
  });

  await step("product listing renders", async () => {
    const { status, html } = await get("/products");
    assert.equal(status, 200);
    has(html, "All products", "listing");
  });

  await step("search filters the listing", async () => {
    const { status, html } = await get("/products?q=zzzznotathing");
    assert.equal(status, 200);
    has(html, "No products found", "empty search");
  });

  await step("product detail renders with add-to-cart", async () => {
    const { status, html } = await get(`/products/${productId}`);
    assert.equal(status, 200);
    has(html, "Add to cart", "product detail");
  });

  await step("empty cart shows the empty state", async () => {
    const { status, html } = await get("/cart");
    assert.equal(status, 200);
    has(html, "Your cart is empty", "cart");
  });

  await step("add to cart persists a line", async () => {
    await post(`/products/${productId}`, { productId, quantity: "2" });
    const { html } = await get("/cart");
    has(html, "Summary", "cart");
    lacks(html, "Your cart is empty", "cart");
  });

  await step("quantity update and removal work", async () => {
    await post("/cart", { productId, variantId: "", quantity: "3" }, 0);
    has((await get("/cart")).html, "Summary", "cart");

    await post("/cart", { productId, variantId: "" }, 1);
    has((await get("/cart")).html, "Your cart is empty", "cart after removal");

    // Put it back so the checkout steps below have something to buy.
    await post(`/products/${productId}`, { productId, quantity: "2" });
  });

  if (DISCOUNT_CODE) {
    await step("discount code applies", async () => {
      await post("/cart", { code: DISCOUNT_CODE }, 2);
      const { html } = await get("/cart");
      has(html, "Discount", "cart");
    });
  } else {
    skip("discount code applies", "set SMOKE_DISCOUNT_CODE to a valid code");
  }

  await step("checkout redirects anonymous shoppers to sign in", async () => {
    const { status, location } = await get("/checkout");
    assert.equal(status, 307);
    assert.ok(location.startsWith("/account"), `redirected to ${location}`);
  });

  await step("sign-in page asks for an email", async () => {
    const { status, html } = await get("/account");
    assert.equal(status, 200);
    has(html, "Send code", "account");
  });

  if (!CUSTOMER_JWT) {
    for (const name of [
      "checkout renders the order summary",
      "placing an order clears the cart",
      "account page shows the signed-in customer",
    ]) {
      skip(name, "set SMOKE_CUSTOMER_JWT to a customer token");
    }
    console.log(
      `smoke: ${steps.filter((s) => s.startsWith("  ok")).length} steps passed against ${base}`,
    );
    console.log(steps.join("\n"));
    process.exit(0);
  }

  // The email code is delivered out of band, so reuse a token obtained earlier.
  jar.set("storentia_customer_token", CUSTOMER_JWT);

  await step("checkout renders the order summary", async () => {
    const { status, html } = await get("/checkout");
    assert.equal(status, 200);
    has(html, "Place order", "checkout");
  });

  await step("placing an order clears the cart", async () => {
    await post("/checkout", {});
    const { html } = await get("/orders");
    has(html, "Your orders", "orders");
    lacks(html, "have not placed any orders", "orders");

    const cart = await get("/cart");
    has(cart.html, "Your cart is empty", "cart after checkout");
  });

  await step("account page shows the signed-in customer", async () => {
    const { html } = await get("/account");
    has(html, "Sign out", "account");
  });

  console.log(`smoke: all ${steps.length} steps passed against ${base}`);
  console.log(steps.join("\n"));
} catch (error) {
  console.error(steps.join("\n"));
  console.error(`\nsmoke failed: ${error.message}`);
  process.exit(1);
}
