import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ProductImage } from "@/components/product-image";
import { money } from "@/lib/money";
import { mediaUrl } from "@/lib/sdk";
import { readCustomerToken } from "@/lib/session";
import { getOrder } from "@/lib/storefront";

export const metadata = { title: "Order" };

export default async function OrderPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ placed?: string }>;
}) {
  const [{ id }, { placed }, token] = await Promise.all([
    props.params,
    props.searchParams,
    readCustomerToken(),
  ]);
  if (!token) redirect(`/account?next=${encodeURIComponent(`/orders/${id}`)}`);

  const order = await getOrder(token, id).catch(() => null);
  if (!order) notFound();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 py-6">
      {placed && (
        <div className="rounded-xl bg-emerald-50 p-6 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          <h1 className="text-xl font-semibold">Thanks — your order is in.</h1>
          <p className="mt-1 text-sm">
            A confirmation is on its way to your email.
          </p>
        </div>
      )}

      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-2xl font-semibold">Order {order.id.slice(0, 8)}</h2>
        <p className="text-sm text-zinc-500">
          Placed {new Date(order.createdAt).toLocaleString()}
        </p>
      </header>

      <div className="flex gap-3 text-sm">
        <span className="rounded-full border px-3 py-1">
          Status: {order.status}
        </span>
        <span className="rounded-full border px-3 py-1">
          Payment: {order.paymentStatus}
        </span>
      </div>

      <ul className="flex flex-col divide-y divide-black/5 dark:divide-white/10">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-center gap-4 py-4">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg">
              <ProductImage
                src={mediaUrl(item.product?.media?.[0]?.fileKey)}
                alt={item.product?.title ?? "Product"}
                seed={item.productId}
              />
            </div>
            <div className="flex-1">
              <Link
                href={`/products/${item.productId}`}
                className="font-medium hover:underline"
              >
                {item.product?.title ?? item.productId}
              </Link>
              <p className="text-sm text-zinc-500">Qty {item.quantity}</p>
            </div>
            <p className="font-medium">{money(item.price * item.quantity)}</p>
          </li>
        ))}
      </ul>

      <div className="flex justify-between border-t border-black/10 pt-4 text-lg font-semibold dark:border-white/15">
        <span>Total</span>
        <span>{money(order.totalAmount)}</span>
      </div>

      <Link href="/orders" className="text-sm underline">
        ← All orders
      </Link>
    </div>
  );
}
