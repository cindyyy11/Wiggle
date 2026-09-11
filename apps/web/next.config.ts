import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@wiggle/contracts"],
  webpack(config) {
    // Shared ESM contracts use emitted .js specifiers while exporting TS source.
    config.resolve.extensionAlias = { ...config.resolve.extensionAlias, ".js": [".ts", ".tsx", ".js"] };
    return config;
  }
};

export default nextConfig;
