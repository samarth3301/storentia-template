import Link from "next/link";
import { notFound } from "next/navigation";
import { addToCartAction } from "@/app/actions";
import { ProductCard } from "@/components/product-card";
import { ProductImage } from "@/components/product-image";
import { discountPercent, money } from "@/lib/money";
import { mediaUrl } from "@/lib/sdk";
import { getProduct, listProducts } from "@/lib/storefront";

export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const product = await getProduct(id).catch(() => null);
  return {
    title: product?.title ?? "Product",
    description: product?.description?.slice(0, 160),
  };
}

export default async function ProductPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const product = await getProduct(id).catch(() => null);
  if (!product || product.status !== "ACTIVE") notFound();

  const [{ data: related }] = await Promise.all([listProducts({ limit: 5 })]);
  const off = discountPercent(product.originalPrice, product.sellingPrice);
  const inStock =
    product.stock > 0 || product.variants.some((v) => v.stock > 0);
  const gallery = product.media.length > 0 ? product.media : [null];

  return (
    <div className="flex flex-col gap-16">
      <nav className="text-sm text-zinc-500">
        <Link href="/products" className="hover:underline">
          Products
        </Link>{" "}
        /{" "}
        <span className="text-zinc-700 dark:text-zinc-300">
          {product.title}
        </span>
      </nav>

      <div className="grid gap-10 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div className="aspect-square overflow-hidden rounded-2xl">
            <ProductImage
              src={mediaUrl(gallery[0]?.fileKey)}
              alt={product.title}
              seed={product.id}
            />
          </div>
          {product.media.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {product.media.slice(1, 5).map((media) => (
                <div
                  key={media.id}
                  className="aspect-square overflow-hidden rounded-lg"
                >
                  <ProductImage
                    src={mediaUrl(media.fileKey)}
                    alt={media.name}
                    seed={media.id}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              {product.title}
            </h1>
            <p className="flex items-baseline gap-3">
              <span className="text-2xl font-semibold">
                {money(product.sellingPrice)}
              </span>
              {off > 0 && (
                <>
                  <span className="text-lg text-zinc-500 line-through">
                    {money(product.originalPrice)}
                  </span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Save {off}%
                  </span>
                </>
              )}
            </p>
            <p className="text-sm text-zinc-500">
              {inStock
                ? `In stock · ${product.stock} available`
                : "Currently out of stock"}
              {product.sku && ` · SKU ${product.sku}`}
            </p>
          </div>

          <p className="whitespace-pre-line leading-7 text-zinc-600 dark:text-zinc-400">
            {product.description}
          </p>

          <form action={addToCartAction} className="flex flex-col gap-5">
            <input type="hidden" name="productId" value={product.id} />

            {product.variants.length > 0 && (
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-sm font-medium">
                  {product.options[0]?.name ?? "Variant"}
                </legend>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((variant, index) => (
                    <label
                      key={variant.id}
                      className="cursor-pointer rounded-full border border-black/15 px-4 py-2 text-sm has-[:checked]:border-black has-[:checked]:bg-black has-[:checked]:text-white has-[:disabled]:opacity-40 dark:border-white/20 dark:has-[:checked]:border-white dark:has-[:checked]:bg-white dark:has-[:checked]:text-black"
                    >
                      <input
                        type="radio"
                        name="variantId"
                        value={variant.id}
                        defaultChecked={index === 0}
                        disabled={variant.stock <= 0}
                        className="sr-only"
                      />
                      {variant.title} · {money(variant.sellingPrice)}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            <div className="flex items-center gap-3">
              <label htmlFor="quantity" className="text-sm font-medium">
                Quantity
              </label>
              <input
                id="quantity"
                name="quantity"
                type="number"
                min={1}
                max={99}
                defaultValue={1}
                className="w-20 rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20"
              />
            </div>

            <button
              type="submit"
              disabled={!inStock}
              className="h-12 rounded-full bg-black text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-black"
            >
              {inStock ? "Add to cart" : "Out of stock"}
            </button>
          </form>
        </div>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">You may also like</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {related
            .filter((p) => p.id !== product.id)
            .slice(0, 4)
            .map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
        </div>
      </section>
    </div>
  );
}
