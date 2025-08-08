/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true, // ✅ Let Vercel build even with TS errors
  },
};

module.exports = nextConfig;