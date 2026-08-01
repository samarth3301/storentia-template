const formatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: process.env.NEXT_PUBLIC_CURRENCY ?? "INR",
  maximumFractionDigits: 0,
});

export const money = (amount: number) => formatter.format(amount);

export const discountPercent = (original: number, selling: number) =>
  original > selling ? Math.round(((original - selling) / original) * 100) : 0;
