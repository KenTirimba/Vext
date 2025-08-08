import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* your existing config options */
  eslint: {
    // 🚀 Ignore ESLint errors during builds so deployment won't fail
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
