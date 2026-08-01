import { Storentia } from "@storentia/sdk";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mediaUrl, sdk, storeId, storeToken } from "./sdk";

const ENV_KEYS = [
  "STORENTIA_CLIENT_ID",
  "STORENTIA_CLIENT_SECRET",
  "STORENTIA_STORE_TOKEN",
  "STORENTIA_STORE_ID",
] as const;

const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) saved[key] = process.env[key];
  process.env.STORENTIA_CLIENT_ID = "test-client";
  process.env.STORENTIA_CLIENT_SECRET = "test-secret";
  process.env.STORENTIA_STORE_TOKEN = "test-store-token";
  process.env.STORENTIA_STORE_ID = "00000000-0000-0000-0000-000000000000";
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe("sdk wiring", () => {
  it("builds a real Storentia client exposing the resources the storefront uses", () => {
    const client = sdk();
    expect(client).toBeInstanceOf(Storentia);
    for (const resource of [
      "products",
      "collections",
      "auth",
      "orders",
      "discounts",
    ] as const) {
      expect(client[resource]).toBeDefined();
    }
  });

  it("attaches a customer token to that client only", () => {
    expect(sdk("jwt-123").getCustomerToken()).toBe("jwt-123");
    // A second client must not inherit the first shopper's session.
    expect(sdk().getCustomerToken()).toBeNull();
  });

  it("fails loudly when credentials are missing instead of serving nothing", () => {
    process.env.STORENTIA_CLIENT_ID = "";
    expect(() => sdk()).toThrow(/STORENTIA_CLIENT_ID is not set/);

    process.env.STORENTIA_STORE_TOKEN = "";
    expect(() => storeToken()).toThrow(/STORENTIA_STORE_TOKEN is not set/);

    process.env.STORENTIA_STORE_ID = "";
    expect(() => storeId()).toThrow(/STORENTIA_STORE_ID is not set/);
  });

  it("passes through absolute urls and prefixes bare file keys", () => {
    expect(mediaUrl(null)).toBeNull();
    expect(mediaUrl("https://x.test/a.png")).toBe("https://x.test/a.png");
    expect(mediaUrl("store/a.png")).toContain("/store/a.png");
  });
});
