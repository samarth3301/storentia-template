import type {
  Collection as SdkCollection,
  Order as SdkOrder,
  Product as SdkProduct,
} from "@storentia/sdk";
import { ProductStatus } from "@storentia/sdk";
import { sdk, storeId, storeToken } from "./sdk";
import type {
  Collection,
  Customer,
  Discount,
  Order,
  Product,
  ProductList,
} from "./types";

/**
 * SDK types leave most fields optional because the same shapes are reused by the
 * admin surface. Storefront rendering wants them filled in, so normalize once here.
 */
export function toProduct(p: SdkProduct): Product {
  return {
    id: p.id,
    title: p.title,
    description: p.description ?? "",
    originalPrice: p.originalPrice ?? p.sellingPrice,
    sellingPrice: p.sellingPrice,
    status: p.status ?? ProductStatus.ACTIVE,
    sku: p.sku ?? null,
    stock: p.stock ?? 0,
    media: (p.media ?? []).map((m) => ({
      id: m.id,
      fileKey: m.fileKey,
      name: m.name,
    })),
    options: (p.options ?? []).map((o) => ({
      id: o.id,
      name: o.name,
      position: o.position,
      values: (o.values ?? []).map((v) => ({ id: v.id, value: v.value })),
    })),
    variants: (p.variants ?? []).map((v) => ({
      id: v.id,
      title: v.title,
      originalPrice: v.originalPrice ?? v.sellingPrice,
      sellingPrice: v.sellingPrice,
      sku: v.sku ?? null,
      stock: v.stock ?? 0,
      media: [],
      optionValues: (v.optionValues ?? []).map((ov) => ({
        id: ov.id,
        value: ov.value,
      })),
    })),
  };
}

export function toCollection(c: SdkCollection): Collection {
  return {
    id: c.id,
    name: c.name,
    description: c.description ?? "",
    image: null, // the SDK collection query does not select an image field
    products: (c.products ?? []).map((p) => toProduct(p as SdkProduct)),
  };
}

export function toOrder(o: SdkOrder): Order {
  return {
    id: o.id,
    totalAmount: o.totalAmount,
    currency: o.currency ?? "INR",
    status: o.status,
    paymentStatus: o.paymentStatus,
    createdAt: o.createdAt,
    items: (o.items ?? []).map((item) => ({
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      price: item.price,
      product: item.product
        ? { id: item.product.id, title: item.product.title, media: [] }
        : null,
    })),
  };
}

/** Case-insensitive title/description match; the API has no search argument. */
export function matchesQuery(product: Product, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    product.title.toLowerCase().includes(q) ||
    product.description.toLowerCase().includes(q)
  );
}

export function paginate<T>(items: T[], page: number, limit: number) {
  const start = (page - 1) * limit;
  const data = items.slice(start, start + limit);
  const totalPages = Math.max(1, Math.ceil(items.length / limit));
  return {
    data,
    pageInfo: {
      total: items.length,
      totalPages,
      hasNextPage: page < totalPages,
    },
  };
}

export async function listProducts({
  page = 1,
  limit = 12,
  query = "",
} = {}): Promise<ProductList> {
  const res = await sdk().products.list({
    status: ProductStatus.ACTIVE,
    // Search is client-side, so pull a wider page before filtering.
    pagination: { page, limit: query ? 100 : limit },
  });
  const products = res.data.map(toProduct);

  if (!query) {
    return {
      data: products,
      pageInfo: {
        total: res.pageInfo.total,
        hasNextPage: res.pageInfo.hasNextPage,
        totalPages: res.pageInfo.totalPages ?? 1,
      },
    };
  }
  return paginate(
    products.filter((p) => matchesQuery(p, query)),
    page,
    limit,
  );
}

export async function getProduct(id: string): Promise<Product | null> {
  const product = await sdk().products.get(id);
  return product ? toProduct(product) : null;
}

export async function listCollections(): Promise<Collection[]> {
  const collections = await sdk().collections.list();
  return collections.map(toCollection);
}

export async function getCollection(id: string): Promise<Collection | null> {
  const collection = await sdk().collections.get(id);
  return collection ? toCollection(collection) : null;
}

// --- customer auth (passwordless email code) ---

export async function sendAuthEmail(email: string): Promise<string> {
  const res = await sdk().auth.sendAuthenticationEmail(email, storeToken());
  return res.message;
}

export async function verifyAuthEmail(
  email: string,
  code: string,
): Promise<{ customer: Customer; token: string }> {
  const res = await sdk().auth.verifyAuthenticationEmail(
    email,
    code,
    storeToken(),
  );
  return {
    customer: { id: res.id, email: res.email, name: res.name },
    token: res.token,
  };
}

export async function getMe(customerToken: string): Promise<Customer | null> {
  const me = await sdk(customerToken).auth.getMe();
  return me ? { id: me.id, email: me.email, name: me.name } : null;
}

// --- orders ---

export type NewOrderItem = {
  productId: string;
  quantity: number;
  price: number;
};

export async function createOrder(
  customerToken: string,
  items: NewOrderItem[],
  totalAmount: number,
  currency = "INR",
): Promise<Order> {
  const res = await sdk(customerToken).orders.createOrder({
    items,
    totalAmount,
    currency,
  });
  if (!res.success || !res.order) {
    throw new Error(res.message || "Order could not be created");
  }
  return toOrder(res.order);
}

export async function listOrders(customerToken: string): Promise<Order[]> {
  const orders = await sdk(customerToken).orders.getOrders({
    page: 1,
    limit: 50,
  });
  return orders.map(toOrder);
}

export async function getOrder(
  customerToken: string,
  id: string,
): Promise<Order | null> {
  const order = await sdk(customerToken).orders.getOrder(id);
  return order ? toOrder(order) : null;
}

// --- discounts ---

export async function validateDiscount(
  code: string,
  cartTotal: number,
): Promise<Discount | null> {
  const result = await sdk().discounts.validate(
    storeId(),
    code.trim(),
    cartTotal,
  );
  if (!result) return null;
  return {
    code: {
      id: result.code.id,
      code: result.code.code,
      discountType: result.code.discountType,
      discountValue: result.code.discountValue,
    },
    discountAmount: result.discountAmount,
  };
}
