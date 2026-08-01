import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { ProductImage } from "@/components/product-image";
import { STORE_NAME } from "@/components/site-header";
import { mediaUrl } from "@/lib/sdk";
import { listCollections, listProducts } from "@/lib/storefront";

export default async function Home() {
  const [{ data: products }, collections] = await Promise.all([
    listProducts({ limit: 8 }),
    listCollections().catch(() => []),
  ]);

  return (
    <div className="flex flex-col gap-14">
      <section className="rounded-2xl bg-zinc-50 px-6 py-16 text-center dark:bg-zinc-950">
        <h1 className="mx-auto max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
          {STORE_NAME}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
          Considered goods, fair prices, fast delivery.
        </p>
        <Link
          href="/products"
          className="mt-8 inline-flex h-11 items-center rounded-full bg-black px-6 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          Shop everything
        </Link>
      </section>

      {collections.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">Collections</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((collection) => (
              <Link
                key={collection.id}
                href={`/collections/${collection.id}`}
                className="group relative flex h-40 overflow-hidden rounded-xl"
              >
                <ProductImage
                  src={mediaUrl(collection.image)}
                  alt={collection.name}
                  seed={collection.id}
                  className="transition-transform duration-300 group-hover:scale-105"
                />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-lg font-medium text-white">
                  {collection.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold">Latest products</h2>
          <Link href="/products" className="text-sm hover:underline">
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}
