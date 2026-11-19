import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Fail the build on type errors instead of shipping a broken UI.
  typescript: { ignoreBuildErrors: false },
  reactStrictMode: true,
  poweredByHeader: false,
  // Driver portal pages carry the personal link token in their address.
  async headers() {
    return [
      {
        source: '/v/:path*',
        headers: [
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
    ];
  },
};

export default nextConfig;
