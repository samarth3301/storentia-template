import { describe, expect, it } from "vitest";
import {
  addLine,
  emptyCart,
  FREE_SHIPPING_ABOVE,
  itemCount,
  parseCart,
  removeLine,
  serializeCart,
  setQuantity,
  shipping,
  subtotal,
  totals,
} from "./cart";
import type { CartLine } from "./types";

const line = (over: Partial<CartLine> = {}): CartLine => ({
  productId: "p1",
  variantId: null,
  title: "Tee",
  variantTitle: null,
  price: 1000,
  quantity: 1,
  image: null,
  ...over,
});

describe("cart lines", () => {
  it("merges the same product+variant and keeps variants separate", () => {
    let cart = addLine(emptyCart(), line({ quantity: 2 }));
    cart = addLine(cart, line({ quantity: 3 }));
    cart = addLine(cart, line({ variantId: "v1", quantity: 1 }));

    expect(cart.lines).toHaveLength(2);
    expect(cart.lines[0].quantity).toBe(5);
    expect(itemCount(cart)).toBe(6);
  });

  it("drops a line when quantity is set to zero", () => {
    const cart = setQuantity(
      addLine(emptyCart(), line()),
      {
        productId: "p1",
        variantId: null,
      },
      0,
    );
    expect(cart.lines).toHaveLength(0);
  });

  it("removes only the matching variant", () => {
    let cart = addLine(emptyCart(), line());
    cart = addLine(cart, line({ variantId: "v1" }));
    cart = removeLine(cart, { productId: "p1", variantId: "v1" });

    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0].variantId).toBeNull();
  });
});

describe("totals", () => {
  it("charges flat shipping below the free threshold and none above it", () => {
    const small = addLine(emptyCart(), line({ price: 500 }));
    const big = addLine(emptyCart(), line({ price: FREE_SHIPPING_ABOVE }));

    expect(shipping(small)).toBeGreaterThan(0);
    expect(shipping(big)).toBe(0);
    expect(shipping(emptyCart())).toBe(0);
  });

  it("sums line totals and applies the discount before shipping", () => {
    const cart = {
      ...addLine(emptyCart(), line({ price: 1000, quantity: 2 })),
      discountCode: "TEN",
      discountAmount: 200,
    };
    const t = totals(cart);

    expect(subtotal(cart)).toBe(2000);
    expect(t.discount).toBe(200);
    expect(t.total).toBe(2000 - 200 + t.shipping);
  });

  it("never lets a stale discount exceed the subtotal", () => {
    const cart = {
      ...addLine(emptyCart(), line({ price: 100 })),
      discountCode: "HUGE",
      discountAmount: 9999,
    };
    const t = totals(cart);

    expect(t.discount).toBe(100);
    expect(t.total).toBe(t.shipping);
  });
});

describe("parseCart", () => {
  it("round-trips a serialized cart", () => {
    const cart = addLine(emptyCart(), line({ quantity: 2 }));
    expect(parseCart(serializeCart(cart))).toEqual(cart);
  });

  it("returns an empty cart for missing or malformed cookies", () => {
    expect(parseCart(undefined).lines).toHaveLength(0);
    expect(parseCart("not json").lines).toHaveLength(0);
    expect(parseCart('{"lines":"nope"}').lines).toHaveLength(0);
  });

  it("drops tampered lines: negative price, zero/float quantity, missing id", () => {
    const raw = JSON.stringify({
      lines: [
        { ...line(), price: -5 },
        { ...line(), quantity: 0 },
        { ...line(), quantity: 1.5 },
        { ...line(), productId: 42 },
        line({ quantity: 3 }),
      ],
      discountAmount: -10,
    });
    const cart = parseCart(raw);

    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0].quantity).toBe(3);
    expect(cart.discountAmount).toBe(0);
  });
});
