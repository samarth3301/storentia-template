const GRADIENTS = [
  "from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-700",
  "from-amber-100 to-orange-200 dark:from-amber-900 dark:to-orange-950",
  "from-sky-100 to-indigo-200 dark:from-sky-950 dark:to-indigo-950",
  "from-emerald-100 to-teal-200 dark:from-emerald-950 dark:to-teal-950",
  "from-rose-100 to-pink-200 dark:from-rose-950 dark:to-pink-950",
];

/** Deterministic placeholder so products without media still look intentional. */
function gradientFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++)
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return GRADIENTS[hash % GRADIENTS.length];
}

export function ProductImage({
  src,
  alt,
  seed,
  className = "",
}: {
  src: string | null;
  alt: string;
  seed: string;
  className?: string;
}) {
  if (src) {
    return (
      // Remote store media is served from a CDN outside this app's control.
      // biome-ignore lint/performance/noImgElement: template must work with any CDN host
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={`h-full w-full object-cover ${className}`}
      />
    );
  }
  return (
    <div
      aria-label={alt}
      role="img"
      className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradientFor(seed)} ${className}`}
    >
      <span className="px-4 text-center text-sm font-medium text-zinc-600 dark:text-zinc-300">
        {alt}
      </span>
    </div>
  );
}
