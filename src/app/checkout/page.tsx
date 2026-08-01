import Link from "next/link";
import { redirect } from "next/navigation";
import { placeOrderAction } from "@/app/actions";
import { totals } from "@/lib/cart";
import { money } from "@/lib/money";
import { readCart, readCustomerToken } from "@/lib/session";
import { getMe } from "@/lib/storefront";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage(props: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [cart, token, params] = await Promise.all([
    readCart(),
    readCustomerToken(),
    props.searchParams,
  ]);

  if (cart.lines.length === 0) redirect("/cart");
  if (!token) redirect(`/account?next=${encodeURIComponent("/checkout")}`);

  const customer = await getMe(token).catch(() => null);
  if (!customer) redirect(`/account?next=${encodeURIComponent("/checkout")}`);

  const amounts = totals(cart);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 py-6">
      <h1 className="text-2xl font-semibold">Checkout</h1>

      {params.error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {params.error}
        </p>
      )}

      <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
        <h2 className="mb-2 text-sm font-medium text-zinc-500">Ordering as</h2>
        <p className="font-medium">{customer.name}</p>
        <p className="text-sm text-zinc-500">{customer.email}</p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Order summary</h2>
        <ul className="flex flex-col divide-y divide-black/5 text-sm dark:divide-white/10">
          {cart.lines.map((line) => (
            <li
              key={`${line.productId}:${line.variantId ?? ""}`}
              className="flex justify-between gap-4 py-3"
            >
              <span>
                {line.title}
                {line.variantTitle && ` · ${line.variantTitle}`}
                <span className="text-zinc-500"> × {line.quantity}</span>
              </span>
              <span>{money(line.price * line.quantity)}</span>
            </li>
          ))}
        </ul>

        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{money(amounts.subtotal)}</dd>
          </div>
          {amounts.discount > 0 && (
            <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
              <dt>Discount</dt>
              <dd>−{money(amounts.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt>Shipping</dt>
            <dd>{amounts.shipping === 0 ? "Free" : money(amounts.shipping)}</dd>
          </div>
          <div className="flex justify-between border-t border-black/10 pt-2 text-base font-semibold dark:border-white/15">
            <dt>Total</dt>
            <dd>{money(amounts.total)}</dd>
          </div>
        </dl>
      </section>

      <form action={placeOrderAction} className="flex flex-col gap-3">
        <button
          type="submit"
          className="h-12 rounded-full bg-black text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          Place order
        </button>
        <p className="text-center text-xs text-zinc-500">
          Payment is collected after the order is placed; the order stays in
          payment-pending until it settles.
        </p>
        <Link href="/cart" className="text-center text-sm underline">
          Back to cart
        </Link>
      </form>
    </div>
  );
}
