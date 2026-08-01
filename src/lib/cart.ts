import type { CartLine } from "./types";

export type Cart = {
  lines: CartLine[];
  discountCode: string | null;
  discountAmount: number;
};

export const emptyCart = (): Cart => ({
  lines: [],
  discountCode: null,
  discountAmount: 0,
});

const lineKey = (line: Pick<CartLine, "productId" | "variantId">) =>
  `${line.productId}:${line.variantId ?? ""}`;

export function addLine(cart: Cart, line: CartLine): Cart {
  const lines = [...cart.lines];
  const existing = lines.findIndex((l) => lineKey(l) === lineKey(line));
  if (existing >= 0) {
    lines[existing] = {
      ...lines[existing],
      quantity: lines[existing].quantity + line.quantity,
    };
  } else {
    lines.push(line);
  }
  return { ...cart, lines };
}

export function setQuantity(
  cart: Cart,
  key: { productId: string; variantId: string | null },
  quantity: number,
): Cart {
  const lines = cart.lines
    .map((l) => (lineKey(l) === lineKey(key) ? { ...l, quantity } : l))
    .filter((l) => l.quantity > 0);
  return { ...cart, lines };
}

export function removeLine(
  cart: Cart,
  key: { productId: string; variantId: string | null },
): Cart {
  return {
    ...cart,
    lines: cart.lines.filter((l) => lineKey(l) !== lineKey(key)),
  };
}

export const itemCount = (cart: Cart) =>
  cart.lines.reduce((sum, l) => sum + l.quantity, 0);

export const subtotal = (cart: Cart) =>
  cart.lines.reduce((sum, l) => sum + l.price * l.quantity, 0);

/** Shipping is free above the threshold; a flat fee below it. */
export const SHIPPING_FLAT = 99;
export const FREE_SHIPPING_ABOVE = 4999;

export function shipping(cart: Cart): number {
  if (cart.lines.length === 0) return 0;
  return subtotal(cart) >= FREE_SHIPPING_ABOVE ? 0 : SHIPPING_FLAT;
}

export function totals(cart: Cart) {
  const sub = subtotal(cart);
  // A stale discount must never exceed the current subtotal.
  const discount = Math.min(Math.max(cart.discountAmount, 0), sub);
  const ship = shipping(cart);
  return {
    subtotal: sub,
    discount,
    shipping: ship,
    total: sub - discount + ship,
  };
}

/** Cookie payloads are untrusted input: drop anything malformed. */
export function parseCart(raw: string | undefined): Cart {
  if (!raw) return emptyCart();
  try {
    const parsed = JSON.parse(raw) as Partial<Cart>;
    const lines = Array.isArray(parsed.lines) ? parsed.lines : [];
    return {
      lines: lines.filter(
        (l): l is CartLine =>
          !!l &&
          typeof l.productId === "string" &&
          typeof l.title === "string" &&
          Number.isFinite(l.price) &&
          l.price >= 0 &&
          Number.isInteger(l.quantity) &&
          l.quantity > 0,
      ),
      discountCode:
        typeof parsed.discountCode === "string" ? parsed.discountCode : null,
      discountAmount: Number.isFinite(parsed.discountAmount)
        ? Math.max(0, Number(parsed.discountAmount))
        : 0,
    };
  } catch {
    return emptyCart();
  }
}

export const serializeCart = (cart: Cart) => JSON.stringify(cart);
