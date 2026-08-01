import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @storentia/sdk is linked from the sibling sdks/ directory during local
  // development. Turbopack only resolves files under its root, so point the root
  // at the monorepo. Harmless once the SDK is installed from the registry.
  turbopack: { root: path.join(__dirname, "..") },
};

export default nextConfig;
