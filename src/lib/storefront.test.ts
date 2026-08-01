import { beforeEach, describe, expect, it, vi } from "vitest";

// The storefront has no offline data source: these tests stand a stub in for the
// SDK client and assert we call it correctly and normalize what it returns.
const calls: { method: string; args: unknown[] }[] = [];
const record =
  (method: string, result: unknown) =>
  (...args: unknown[]) => {
    calls.push({ method, args });
    return Promise.resolve(result);
  };

// biome-ignore lint/suspicious/noExplicitAny: a hand-rolled stand-in for the SDK client
let stub: any;

vi.mock("./sdk", () => ({
  sdk: (customerToken?: string) => {
    calls.push({ method: "sdk", args: [customerToken] });
    return stub;
  },
  storeToken: () => "test-store-token",
  storeId: () => "store-uuid",
  mediaUrl: (key: string | null) => key,
}));

const {
  createOrder,
  getProduct,
  listOrders,
  listProducts,
  matchesQuery,
  paginate,
  validateDiscount,
  verifyAuthEmail,
} = await import("./storefront");

/** Deliberately sparse: the SDK marks most product fields optional. */
const SPARSE_PRODUCT = {
  id: "prod-1",
  title: "Steel Bottle",
  sellingPrice: 1899,
  status: "ACTIVE",
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

beforeEach(() => {
  calls.length = 0;
  stub = {
    products: {
      list: record("products.list", {
        data: [SPARSE_PRODUCT],
        pageInfo: { total: 1, hasNextPage: false },
      }),
      get: record("products.get", SPARSE_PRODUCT),
    },
    auth: {
      verifyAuthenticationEmail: record("auth.verify", {
        id: "cust-1",
        email: "a@b.com",
        name: "A",
        token: "jwt-1",
      }),
    },
    orders: {
      createOrder: record("orders.createOrder", {
        success: true,
        message: "ok",
        order: {
          id: "order-1",
          totalAmount: 1398,
          status: "PAYMENT_PENDING",
          paymentStatus: "PENDING",
          createdAt: "2026-01-01",
          items: [{ id: "i1", productId: "prod-1", quantity: 2, price: 699 }],
        },
      }),
      getOrders: record("orders.getOrders", []),
    },
    discounts: { validate: record("discounts.validate", null) },
  };
});

describe("product normalization", () => {
  it("fills in the optional fields the SDK leaves undefined", async () => {
    const { data, pageInfo } = await listProducts({ limit: 5 });
    const product = data[0];

    expect(product.description).toBe("");
    expect(product.originalPrice).toBe(product.sellingPrice);
    expect(product.sku).toBeNull();
    expect(product.stock).toBe(0);
    expect(product.media).toEqual([]);
    expect(product.variants).toEqual([]);
    expect(product.options).toEqual([]);
    expect(pageInfo.totalPages).toBe(1);
  });

  it("asks the SDK for active products only", async () => {
    await listProducts({ page: 2, limit: 5 });
    expect(calls.find((c) => c.method === "products.list")?.args[0]).toEqual({
      status: "ACTIVE",
      pagination: { page: 2, limit: 5 },
    });
  });

  it("widens the page before filtering a search client-side", async () => {
    const hits = await listProducts({ query: "steel" });
    const miss = await listProducts({ query: "helicopter" });

    expect(
      calls.filter((c) => c.method === "products.list")[0].args[0],
    ).toEqual({ status: "ACTIVE", pagination: { page: 1, limit: 100 } });
    expect(hits.data).toHaveLength(1);
    expect(miss.data).toHaveLength(0);
    expect(miss.pageInfo.total).toBe(0);
  });

  it("returns null when the SDK has no such product", async () => {
    stub.products.get = record("products.get", null);
    expect(await getProduct("nope")).toBeNull();
  });
});

describe("search and pagination helpers", () => {
  const product = {
    title: "Aurora Tee",
    description: "Organic cotton",
  } as Parameters<typeof matchesQuery>[0];

  it("matches title and description case-insensitively", () => {
    expect(matchesQuery(product, "AURORA")).toBe(true);
    expect(matchesQuery(product, "organic")).toBe(true);
    expect(matchesQuery(product, "")).toBe(true);
    expect(matchesQuery(product, "helicopter")).toBe(false);
  });

  it("reports page info for the last page", () => {
    expect(paginate([1, 2, 3, 4, 5], 2, 2).pageInfo).toEqual({
      total: 5,
      totalPages: 3,
      hasNextPage: true,
    });
    expect(paginate([1, 2, 3, 4, 5], 3, 2).pageInfo.hasNextPage).toBe(false);
  });
});

describe("customer-scoped calls", () => {
  it("returns the JWT from the SDK for the caller to store", async () => {
    const { customer, token } = await verifyAuthEmail("a@b.com", "123456");
    expect(token).toBe("jwt-1");
    expect(customer.email).toBe("a@b.com");
  });

  it("uses a client carrying the shopper's token", async () => {
    await listOrders("jwt-1");
    expect(calls.find((c) => c.method === "sdk")?.args[0]).toBe("jwt-1");
  });

  it("maps a created order and defaults its currency", async () => {
    const order = await createOrder(
      "jwt-1",
      [{ productId: "prod-1", quantity: 2, price: 699 }],
      1398,
    );

    expect(
      calls.find((c) => c.method === "orders.createOrder")?.args[0],
    ).toEqual({
      items: [{ productId: "prod-1", quantity: 2, price: 699 }],
      totalAmount: 1398,
      currency: "INR",
    });
    expect(order.id).toBe("order-1");
    expect(order.currency).toBe("INR");
    expect(order.items[0].product).toBeNull();
  });

  it("throws with the API's message when the order is rejected", async () => {
    stub.orders.createOrder = record("orders.createOrder", {
      success: false,
      message: "Out of stock",
      order: null,
    });
    await expect(
      createOrder("jwt-1", [{ productId: "p", quantity: 1, price: 1 }], 1),
    ).rejects.toThrow("Out of stock");
  });
});

describe("discounts", () => {
  it("passes the store id and trimmed code to the SDK", async () => {
    await validateDiscount("  WELCOME10 ", 2000);
    expect(calls.find((c) => c.method === "discounts.validate")?.args).toEqual([
      "store-uuid",
      "WELCOME10",
      2000,
    ]);
  });

  it("returns null for a code the API rejects", async () => {
    expect(await validateDiscount("NOPE", 2000)).toBeNull();
  });

  it("returns the server-computed amount for a valid code", async () => {
    stub.discounts.validate = record("discounts.validate", {
      code: {
        id: "d1",
        code: "WELCOME10",
        discountType: "PERCENTAGE",
        discountValue: 10,
      },
      discountAmount: 200,
    });

    const discount = await validateDiscount("WELCOME10", 2000);
    expect(discount?.discountAmount).toBe(200);
    expect(discount?.code.code).toBe("WELCOME10");
  });
});
