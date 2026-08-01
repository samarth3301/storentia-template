// Mirrors the Storentia storefront GraphQL schema (backend/storentia-storefront).

export type Media = { id: string; fileKey: string; name: string };

export type ProductOptionValue = { id: string; value: string };

export type ProductOption = {
  id: string;
  name: string;
  position: number;
  values: ProductOptionValue[];
};

export type ProductVariant = {
  id: string;
  title: string;
  originalPrice: number;
  sellingPrice: number;
  sku: string | null;
  stock: number;
  media: Media[];
  optionValues: ProductOptionValue[];
};

export type Product = {
  id: string;
  title: string;
  description: string;
  originalPrice: number;
  sellingPrice: number;
  status: "ACTIVE" | "DRAFT" | "ARCHIVED";
  sku: string | null;
  stock: number;
  media: Media[];
  options: ProductOption[];
  variants: ProductVariant[];
};

export type Collection = {
  id: string;
  name: string;
  description: string;
  image: string | null;
  products: Product[];
};

export type PageInfo = {
  total: number;
  hasNextPage: boolean;
  totalPages: number;
};

export type ProductList = { data: Product[]; pageInfo: PageInfo };

export type Customer = { id: string; email: string; name: string };

export type OrderItem = {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  product: { id: string; title: string; media: Media[] } | null;
};

export type Order = {
  id: string;
  totalAmount: number;
  currency: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
  items: OrderItem[];
};

export type DiscountCode = {
  id: string;
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
};

export type Discount = { code: DiscountCode; discountAmount: number };

/** A cart line as persisted in the cart cookie. */
export type CartLine = {
  productId: string;
  variantId: string | null;
  title: string;
  variantTitle: string | null;
  price: number;
  quantity: number;
  image: string | null;
};
