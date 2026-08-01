"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { addLine, removeLine, setQuantity, subtotal, totals } from "@/lib/cart";
import { mediaUrl } from "@/lib/sdk";
import {
  clearCart,
  clearCustomerToken,
  readCart,
  readCustomerToken,
  writeCart,
  writeCustomerToken,
} from "@/lib/session";
import {
  createOrder,
  getProduct,
  sendAuthEmail,
  validateDiscount,
  verifyAuthEmail,
} from "@/lib/storefront";

function str(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function int(data: FormData, key: string, fallback: number): number {
  const value = Number.parseInt(str(data, key), 10);
  return Number.isFinite(value) ? value : fallback;
}

export async function addToCartAction(data: FormData): Promise<void> {
  const productId = str(data, "productId");
  const variantId = str(data, "variantId") || null;
  const quantity = Math.min(Math.max(int(data, "quantity", 1), 1), 99);

  // Price and title come from the API, never from the submitted form.
  const product = await getProduct(productId);
  if (!product) throw new Error("Product not found");
  const variant = variantId
    ? (product.variants.find((v) => v.id === variantId) ?? null)
    : null;
  if (variantId && !variant) throw new Error("Variant not found");

  const stock = variant ? variant.stock : product.stock;
  if (stock <= 0) throw new Error("Out of stock");

  const cart = addLine(await readCart(), {
    productId: product.id,
    variantId: variant?.id ?? null,
    title: product.title,
    variantTitle: variant?.title ?? null,
    price: variant?.sellingPrice ?? product.sellingPrice,
    quantity: Math.min(quantity, stock),
    image: mediaUrl(variant?.media[0]?.fileKey ?? product.media[0]?.fileKey),
  });

  await writeCart(cart);
  redirect("/cart");
}

export async function updateQuantityAction(data: FormData): Promise<void> {
  const key = {
    productId: str(data, "productId"),
    variantId: str(data, "variantId") || null,
  };
  const quantity = Math.min(Math.max(int(data, "quantity", 1), 0), 99);
  await writeCart(setQuantity(await readCart(), key, quantity));
  refresh();
}

export async function removeFromCartAction(data: FormData): Promise<void> {
  const key = {
    productId: str(data, "productId"),
    variantId: str(data, "variantId") || null,
  };
  await writeCart(removeLine(await readCart(), key));
  refresh();
}

export async function applyDiscountAction(data: FormData): Promise<void> {
  const code = str(data, "code");
  const cart = await readCart();

  if (!code) {
    await writeCart({ ...cart, discountCode: null, discountAmount: 0 });
    redirect("/cart");
  }

  const discount = await validateDiscount(code, subtotal(cart));
  if (!discount) {
    redirect(`/cart?error=${encodeURIComponent("That code is not valid.")}`);
  }

  await writeCart({
    ...cart,
    discountCode: discount.code.code,
    discountAmount: discount.discountAmount,
  });
  redirect("/cart");
}

export async function sendCodeAction(data: FormData): Promise<void> {
  const email = str(data, "email").toLowerCase();
  const next = str(data, "next") || "/account";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    redirect(
      `/account?error=${encodeURIComponent("Enter a valid email address.")}`,
    );
  }

  try {
    await sendAuthEmail(email);
  } catch (error) {
    redirect(`/account?error=${encodeURIComponent((error as Error).message)}`);
  }
  redirect(
    `/account?email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`,
  );
}

export async function verifyCodeAction(data: FormData): Promise<void> {
  const email = str(data, "email").toLowerCase();
  const code = str(data, "code");
  const next = str(data, "next") || "/account";

  let token: string;
  try {
    ({ token } = await verifyAuthEmail(email, code));
  } catch (error) {
    redirect(
      `/account?email=${encodeURIComponent(email)}&error=${encodeURIComponent(
        (error as Error).message,
      )}`,
    );
  }

  await writeCustomerToken(token);
  redirect(next);
}

export async function logoutAction(): Promise<void> {
  await clearCustomerToken();
  redirect("/");
}

export async function placeOrderAction(): Promise<void> {
  const token = await readCustomerToken();
  if (!token) redirect(`/account?next=${encodeURIComponent("/checkout")}`);

  const cart = await readCart();
  if (cart.lines.length === 0) redirect("/cart");

  const amounts = totals(cart);
  let orderId: string;
  try {
    const order = await createOrder(
      token,
      cart.lines.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
        price: line.price,
      })),
      amounts.total,
    );
    orderId = order.id;
  } catch (error) {
    redirect(`/checkout?error=${encodeURIComponent((error as Error).message)}`);
  }

  await clearCart();
  redirect(`/orders/${orderId}?placed=1`);
}
