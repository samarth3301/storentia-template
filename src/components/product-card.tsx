import Link from "next/link";
import { ProductImage } from "@/components/product-image";
import { discountPercent, money } from "@/lib/money";
import { mediaUrl } from "@/lib/sdk";
import type { Product } from "@/lib/types";

export function ProductCard({ product }: { product: Product }) {
  const off = discountPercent(product.originalPrice, product.sellingPrice);
  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex flex-col gap-3 rounded-xl border border-black/5 bg-white p-3 transition-shadow hover:shadow-lg dark:border-white/10 dark:bg-zinc-950"
    >
      <div className="relative aspect-square overflow-hidden rounded-lg">
        <ProductImage
          src={mediaUrl(product.media[0]?.fileKey)}
          alt={product.title}
          seed={product.id}
          className="transition-transform duration-300 group-hover:scale-105"
        />
        {off > 0 && (
          <span className="absolute left-2 top-2 rounded-full bg-black px-2 py-1 text-xs font-semibold text-white dark:bg-white dark:text-black">
            {off}% off
          </span>
        )}
        {product.stock <= 0 && (
          <span className="absolute inset-x-0 bottom-0 bg-black/70 py-1 text-center text-xs font-medium text-white">
            Out of stock
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="line-clamp-1 text-sm font-medium">{product.title}</h3>
        <p className="flex items-baseline gap-2">
          <span className="font-semibold">{money(product.sellingPrice)}</span>
          {off > 0 && (
            <span className="text-sm text-zinc-500 line-through">
              {money(product.originalPrice)}
            </span>
          )}
        </p>
      </div>
    </Link>
  );
}
