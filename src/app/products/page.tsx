import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { listProducts } from "@/lib/storefront";

export const metadata = { title: "All products" };

export default async function ProductsPage(props: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await props.searchParams;
  const query = params.q ?? "";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const { data, pageInfo } = await listProducts({ page, limit: 12, query });
  const href = (p: number) =>
    `/products?${new URLSearchParams({ ...(query ? { q: query } : {}), page: String(p) })}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold">
          {query ? `Results for “${query}”` : "All products"}
        </h1>
        <p className="text-sm text-zinc-500">{pageInfo.total} products</p>
      </div>

      <form action="/products" className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search products"
          aria-label="Search products"
          className="w-full rounded-full border border-black/10 bg-transparent px-4 py-2 text-sm outline-none focus:border-black dark:border-white/15 dark:focus:border-white"
        />
        <button
          type="submit"
          className="rounded-full bg-black px-5 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          Search
        </button>
      </form>

      {data.length === 0 ? (
        <p className="py-16 text-center text-zinc-500">
          No products found.{" "}
          <Link href="/products" className="underline">
            Clear search
          </Link>
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {data.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {pageInfo.totalPages > 1 && (
        <nav className="flex items-center justify-center gap-4 pt-4 text-sm">
          {page > 1 && (
            <Link
              href={href(page - 1)}
              className="rounded-full border px-4 py-2"
            >
              ← Previous
            </Link>
          )}
          <span className="text-zinc-500">
            Page {page} of {pageInfo.totalPages}
          </span>
          {pageInfo.hasNextPage && (
            <Link
              href={href(page + 1)}
              className="rounded-full border px-4 py-2"
            >
              Next →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
