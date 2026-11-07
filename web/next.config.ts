import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["recharts", "@base-ui/react"],
  },
};

export default nextConfig;
