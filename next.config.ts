import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remove "output: standalone" for Vercel compat
  // For VPS Docker deployment, add "output: standalone" back
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
