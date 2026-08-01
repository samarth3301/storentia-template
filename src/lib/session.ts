import { cookies } from "next/headers";
import { type Cart, emptyCart, parseCart, serializeCart } from "./cart";

const CART_COOKIE = "storentia_cart";
const TOKEN_COOKIE = "storentia_customer_token";

const YEAR = 60 * 60 * 24 * 365;

export async function readCart(): Promise<Cart> {
  const store = await cookies();
  return parseCart(store.get(CART_COOKIE)?.value);
}

export async function writeCart(cart: Cart): Promise<void> {
  const store = await cookies();
  store.set(CART_COOKIE, serializeCart(cart), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: YEAR,
  });
}

export async function clearCart(): Promise<void> {
  await writeCart(emptyCart());
}

export async function readCustomerToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(TOKEN_COOKIE)?.value ?? null;
}

export async function writeCustomerToken(token: string): Promise<void> {
  const store = await cookies();
  store.set(TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearCustomerToken(): Promise<void> {
  const store = await cookies();
  store.delete(TOKEN_COOKIE);
}
