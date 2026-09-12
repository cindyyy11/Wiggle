import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Allow a production preview alongside a separately supervised dev server.
  distDir: process.env.WIGGLE_DIST_DIR || ".next",
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingRoot: path.join(__dirname, "../.."),
  transpilePackages: ["@wiggle/contracts"],
  webpack(config) {
    // Shared ESM contracts use emitted .js specifiers while exporting TS source.
    config.resolve.extensionAlias = { ...config.resolve.extensionAlias, ".js": [".ts", ".tsx", ".js"] };
    return config;
  }
};

export default nextConfig;
