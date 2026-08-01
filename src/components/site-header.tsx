import Link from "next/link";
import { itemCount } from "@/lib/cart";
import { readCart, readCustomerToken } from "@/lib/session";
import { listCollections } from "@/lib/storefront";

export const STORE_NAME = process.env.NEXT_PUBLIC_STORE_NAME ?? "Storentia";

export async function SiteHeader() {
  const [cart, token, collections] = await Promise.all([
    readCart(),
    readCustomerToken(),
    listCollections().catch(() => []),
  ]);
  const count = itemCount(cart);

  return (
    <header className="sticky top-0 z-20 border-b border-black/5 bg-white/85 backdrop-blur dark:border-white/10 dark:bg-black/80">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          {STORE_NAME}
        </Link>

        <nav className="hidden items-center gap-4 text-sm text-zinc-600 sm:flex dark:text-zinc-400">
          <Link
            href="/products"
            className="hover:text-black dark:hover:text-white"
          >
            All products
          </Link>
          {collections.slice(0, 3).map((collection) => (
            <Link
              key={collection.id}
              href={`/collections/${collection.id}`}
              className="hover:text-black dark:hover:text-white"
            >
              {collection.name}
            </Link>
          ))}
        </nav>

        <form action="/products" className="ml-auto hidden md:block">
          <input
            type="search"
            name="q"
            placeholder="Search products"
            aria-label="Search products"
            className="w-56 rounded-full border border-black/10 bg-transparent px-4 py-1.5 text-sm outline-none focus:border-black dark:border-white/15 dark:focus:border-white"
          />
        </form>

        <div className="ml-auto flex items-center gap-4 text-sm md:ml-0">
          <Link
            href={token ? "/orders" : "/account"}
            className="hover:underline"
          >
            {token ? "Orders" : "Sign in"}
          </Link>
          <Link href="/cart" className="font-medium hover:underline">
            Cart
            {count > 0 && (
              <span className="ml-1 rounded-full bg-black px-2 py-0.5 text-xs text-white dark:bg-white dark:text-black">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
