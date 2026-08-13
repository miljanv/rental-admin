import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Fail the build on type errors instead of shipping a broken UI.
  typescript: { ignoreBuildErrors: false },
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
