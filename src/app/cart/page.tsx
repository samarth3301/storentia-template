import Link from "next/link";
import {
  applyDiscountAction,
  removeFromCartAction,
  updateQuantityAction,
} from "@/app/actions";
import { ProductImage } from "@/components/product-image";
import { FREE_SHIPPING_ABOVE, totals } from "@/lib/cart";
import { money } from "@/lib/money";
import { readCart } from "@/lib/session";

export const metadata = { title: "Cart" };

export default async function CartPage(props: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [cart, params] = await Promise.all([readCart(), props.searchParams]);
  const amounts = totals(cart);

  if (cart.lines.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <h1 className="text-2xl font-semibold">Your cart is empty</h1>
        <p className="text-zinc-500">
          Add something you like and it will show up here.
        </p>
        <Link
          href="/products"
          className="mt-2 rounded-full bg-black px-6 py-3 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">Cart</h1>

      <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
        <ul className="flex flex-col divide-y divide-black/5 dark:divide-white/10">
          {cart.lines.map((line) => (
            <li
              key={`${line.productId}:${line.variantId ?? ""}`}
              className="flex gap-4 py-5"
            >
              <Link
                href={`/products/${line.productId}`}
                className="h-24 w-24 shrink-0 overflow-hidden rounded-lg"
              >
                <ProductImage
                  src={line.image}
                  alt={line.title}
                  seed={line.productId}
                />
              </Link>

              <div className="flex flex-1 flex-col gap-2">
                <div className="flex justify-between gap-4">
                  <div>
                    <Link
                      href={`/products/${line.productId}`}
                      className="font-medium hover:underline"
                    >
                      {line.title}
                    </Link>
                    {line.variantTitle && (
                      <p className="text-sm text-zinc-500">
                        {line.variantTitle}
                      </p>
                    )}
                  </div>
                  <p className="font-medium">
                    {money(line.price * line.quantity)}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <form
                    action={updateQuantityAction}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="hidden"
                      name="productId"
                      value={line.productId}
                    />
                    <input
                      type="hidden"
                      name="variantId"
                      value={line.variantId ?? ""}
                    />
                    <label
                      htmlFor={`qty-${line.productId}`}
                      className="sr-only"
                    >
                      Quantity for {line.title}
                    </label>
                    <input
                      id={`qty-${line.productId}`}
                      name="quantity"
                      type="number"
                      min={0}
                      max={99}
                      defaultValue={line.quantity}
                      className="w-16 rounded-lg border border-black/15 bg-transparent px-2 py-1 text-sm dark:border-white/20"
                    />
                    <button type="submit" className="text-sm underline">
                      Update
                    </button>
                  </form>

                  <form action={removeFromCartAction}>
                    <input
                      type="hidden"
                      name="productId"
                      value={line.productId}
                    />
                    <input
                      type="hidden"
                      name="variantId"
                      value={line.variantId ?? ""}
                    />
                    <button
                      type="submit"
                      className="text-sm text-zinc-500 underline"
                    >
                      Remove
                    </button>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="flex h-fit flex-col gap-4 rounded-xl border border-black/10 p-6 dark:border-white/15">
          <h2 className="text-lg font-semibold">Summary</h2>

          <form action={applyDiscountAction} className="flex gap-2">
            <input
              name="code"
              defaultValue={cart.discountCode ?? ""}
              placeholder="Discount code"
              aria-label="Discount code"
              className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20"
            />
            <button type="submit" className="rounded-lg border px-4 text-sm">
              Apply
            </button>
          </form>
          {params.error && (
            <p className="text-sm text-red-600">{params.error}</p>
          )}

          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd>{money(amounts.subtotal)}</dd>
            </div>
            {amounts.discount > 0 && (
              <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                <dt>
                  Discount {cart.discountCode && `(${cart.discountCode})`}
                </dt>
                <dd>−{money(amounts.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt>Shipping</dt>
              <dd>
                {amounts.shipping === 0 ? "Free" : money(amounts.shipping)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-black/10 pt-2 text-base font-semibold dark:border-white/15">
              <dt>Total</dt>
              <dd>{money(amounts.total)}</dd>
            </div>
          </dl>

          {amounts.shipping > 0 && (
            <p className="text-xs text-zinc-500">
              Spend {money(FREE_SHIPPING_ABOVE - amounts.subtotal)} more for
              free shipping.
            </p>
          )}

          <Link
            href="/checkout"
            className="flex h-12 items-center justify-center rounded-full bg-black text-sm font-medium text-white dark:bg-white dark:text-black"
          >
            Checkout
          </Link>
        </aside>
      </div>
    </div>
  );
}
