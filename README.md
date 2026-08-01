# Storentia store template

An end-to-end storefront on Next.js 16 (App Router) built on the official
[`@storentia/sdk`](../sdks/storentiajs) client — no hand-written GraphQL.

Browse → product detail with variants → cart → discount code → passwordless
sign-in → checkout → order history. Every mutation is a Server Action posted
from a plain `<form>`, so the whole flow works with JavaScript disabled.

**Stack:** Next.js 16 · React 19 · Tailwind CSS 4 · TypeScript · Biome · Vitest

## Quick start

```bash
pnpm install                  # npm install also works
cp .env.example .env.local    # then fill in your Storentia credentials
pnpm dev                      # http://localhost:3000
```

Requires Node 20+. Every product, collection, order and discount comes from your
store through the SDK — there is no demo catalog or offline fallback. Missing
credentials raise a configuration error naming the variable rather than
rendering placeholder data. The SDK performs the OAuth2 client-credentials
exchange and refreshes the token on its own.

## Configuration

| Variable | Required | Purpose |
| --- | --- | --- |
| `STORENTIA_CLIENT_ID` / `STORENTIA_CLIENT_SECRET` | yes | SDK OAuth credentials |
| `STORENTIA_API_BASE_URL` | no | Override the API host (default `https://apis.storentia.com`) |
| `STORENTIA_STORE_TOKEN` | for sign-in | Public store token; used by customer email-code auth |
| `STORENTIA_STORE_ID` | for discounts | Store UUID; used by discount-code validation |
| `NEXT_PUBLIC_STORE_NAME` | no | Name in the header, footer and page titles |
| `NEXT_PUBLIC_CDN_BASE` | no | Prefix for media `fileKey`s (default `https://cdn.storentia.com`) |
| `NEXT_PUBLIC_CURRENCY` | no | ISO currency code for price formatting (default `INR`) |

`NEXT_PUBLIC_*` values are inlined into the client bundle — keep secrets out of
them. Everything else stays server-only.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Dev server on :3000 |
| `pnpm build` / `pnpm start` | Production build and serve |
| `pnpm test` | Vitest unit tests |
| `pnpm smoke -- <url>` | No-JS end-to-end drive against a running server |
| `pnpm lint` / `pnpm format` | Biome check / write |

## Routes

| Route | Contents |
| --- | --- |
| `/` | Featured products and collections |
| `/products`, `/products/[id]` | Catalog listing, detail with variant picker |
| `/collections/[id]` | Products in a collection |
| `/cart` | Cookie cart, quantity edits, discount code |
| `/checkout` | Address form, places the order |
| `/orders`, `/orders/[id]` | Customer order history and detail |
| `/account` | Email-code sign-in / sign-out |

## Layout

```
src/lib/sdk.ts          SDK client factory (per request), env checks, media URLs
src/lib/storefront.ts   every SDK call + type normalization
src/lib/cart.ts         pure cart maths (lines, totals, cookie parsing)
src/lib/session.ts      cart + customer-token cookies
src/lib/money.ts        currency formatting
src/lib/types.ts        storefront-facing types
src/app/actions.ts      Server Actions: cart, discounts, auth, place order
src/app/…               routes: home, products, collections, cart, checkout, orders, account
src/components/…        header, product card, product image
scripts/smoke.mjs       no-JS end-to-end script
```

Server Actions in `src/app/actions.ts`: `addToCartAction`,
`updateQuantityAction`, `removeFromCartAction`, `applyDiscountAction`,
`sendCodeAction`, `verifyCodeAction`, `logoutAction`, `placeOrderAction`.

## How the SDK is used

- `sdk.products`, `sdk.collections` — catalog reads, authenticated with the app's
  OAuth credentials (`x-API-Key`).
- `sdk.auth.sendAuthenticationEmail` / `verifyAuthenticationEmail` — customer
  sign-in; these take the public store token. The returned JWT is restored onto a
  client per request with `setCustomerToken()`.
- `sdk.orders.createOrder` / `getOrders` / `getOrder` — customer-scoped, so they
  run on a client carrying that shopper's JWT.
- `sdk.discounts.validate` — discount codes.
- A new `Storentia` instance is created per request: the SDK stores the customer
  JWT on the instance, so a shared client would leak sessions between shoppers.
- SDK response types mark most fields optional (they are shared with the admin
  surface); `src/lib/storefront.ts` normalizes them into the storefront's own
  types in one place.

## Notes on the data model

- The cart lives in an httpOnly cookie, so guests can shop before signing in.
  Prices and titles are always re-read from the API in the action — the form
  only submits ids and quantities.
- Auth is the API's passwordless email code
  (`sendAuthenticationEmail` → `verifyAuthenticationEmail`); the returned JWT
  goes into an httpOnly cookie.
- `createOrder` accepts `productId`, `quantity` and `price` only, so a chosen
  variant affects the line price but is not sent as a separate id.
- The SDK's cart resource (`sdk.carts`) requires a signed-in customer, so this
  template keeps its own cookie cart to support guest shopping instead.
- `sdk.collections` does not select a collection image, so collection tiles fall
  back to the generated gradient.
- Orders are created in `PAYMENT_PENDING`; no payment provider is wired up.

## Test

```bash
pnpm test             # unit: cart maths, cookie parsing, SDK wiring and call mapping
pnpm build
npx next start -p 3300 &
pnpm smoke -- http://localhost:3300
```

Unit tests stub the SDK client and assert the calls made and the shapes
returned; they never stand in for store data at runtime.

`pnpm smoke` drives a running server exactly like a no-JavaScript browser:
it follows `Set-Cookie` headers and posts Server Actions as multipart forms. It
needs a server configured against a real store with at least one ACTIVE
product. Because the sign-in code arrives by email, the customer-scoped steps
are skipped unless you supply credentials obtained beforehand:

```bash
SMOKE_CUSTOMER_JWT=<token from verifyAuthenticationEmail> \
SMOKE_DISCOUNT_CODE=<a valid code> \
  pnpm smoke -- http://localhost:3300
```

## Troubleshooting

- **Config error on boot** — `.env.local` absent or incomplete; the app fails
  loudly naming the variable instead of rendering fake data.
- **Empty catalog** — the store has no ACTIVE products, or the credentials point
  at a different store.
- **Sign-in does nothing** — `STORENTIA_STORE_TOKEN` is unset; email-code auth
  needs the public store token.
- **Discount code always invalid** — `STORENTIA_STORE_ID` is unset.
- **Module-resolution errors on the SDK** — `@storentia/sdk` is linked from
  `../sdks/storentiajs`, so `next.config.ts` points the Turbopack root at the
  monorepo. Build from within the monorepo checkout.
