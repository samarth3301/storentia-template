import { Storentia } from "@storentia/sdk";

const BASE_URL = process.env.STORENTIA_API_BASE_URL || undefined;

/** Reads env at call time so a missing value fails on the request, not at import. */
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. The storefront reads everything through @storentia/sdk and has no offline fallback — copy .env.example to .env.local and fill in your Storentia credentials.`,
    );
  }
  return value;
}

/** Public store token: needed by the customer email-code sign-in mutations. */
export const storeToken = () => required("STORENTIA_STORE_TOKEN");

/** Store UUID: needed by discount-code validation. */
export const storeId = () => required("STORENTIA_STORE_ID");

/**
 * A fresh client per call: the SDK keeps the customer JWT on the instance, so a
 * shared one would leak one shopper's session into another's request.
 */
export function sdk(customerToken?: string): Storentia {
  const client = new Storentia({
    clientId: required("STORENTIA_CLIENT_ID"),
    clientSecret: required("STORENTIA_CLIENT_SECRET"),
    baseUrl: BASE_URL,
  });
  if (customerToken) client.setCustomerToken(customerToken);
  return client;
}

const CDN_BASE =
  process.env.NEXT_PUBLIC_CDN_BASE ?? "https://cdn.storentia.com";

export function mediaUrl(fileKey: string | null | undefined): string | null {
  if (!fileKey) return null;
  if (fileKey.startsWith("http") || fileKey.startsWith("/")) return fileKey;
  return `${CDN_BASE}/${fileKey}`;
}
