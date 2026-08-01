import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { getCollection } from "@/lib/storefront";

export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const collection = await getCollection(id).catch(() => null);
  return { title: collection?.name ?? "Collection" };
}

export default async function CollectionPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const collection = await getCollection(id).catch(() => null);
  if (!collection) notFound();

  const products = collection.products.filter((p) => p.status === "ACTIVE");

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{collection.name}</h1>
        {collection.description && (
          <p className="max-w-2xl text-zinc-600 dark:text-zinc-400">
            {collection.description}
          </p>
        )}
      </header>

      {products.length === 0 ? (
        <p className="py-16 text-center text-zinc-500">
          Nothing in this collection yet.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
