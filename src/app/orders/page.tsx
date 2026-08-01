import Link from "next/link";
import { redirect } from "next/navigation";
import { money } from "@/lib/money";
import { readCustomerToken } from "@/lib/session";
import { listOrders } from "@/lib/storefront";

export const metadata = { title: "Orders" };

export default async function OrdersPage() {
  const token = await readCustomerToken();
  if (!token) redirect(`/account?next=${encodeURIComponent("/orders")}`);

  const orders = await listOrders(token).catch(() => []);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Your orders</h1>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <p className="text-zinc-500">You have not placed any orders yet.</p>
          <Link
            href="/products"
            className="rounded-full bg-black px-6 py-3 text-sm font-medium text-white dark:bg-white dark:text-black"
          >
            Start shopping
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/orders/${order.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/10 p-5 hover:shadow-sm dark:border-white/15"
              >
                <div>
                  <p className="font-medium">Order {order.id.slice(0, 8)}</p>
                  <p className="text-sm text-zinc-500">
                    {new Date(order.createdAt).toLocaleDateString()} ·{" "}
                    {order.items.length} item
                    {order.items.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{money(order.totalAmount)}</p>
                  <p className="text-sm text-zinc-500">{order.status}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
