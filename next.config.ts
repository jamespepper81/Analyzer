import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Development-specific optimizations
  ...(process.env.NODE_ENV === 'development' && {
    onDemandEntries: {
      maxInactiveAge: 25 * 1000,
      pagesBufferLength: 2,
    },
  }),
  // SEO and Performance optimizations
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'app.bitsleuth.ai',
        port: '',
        pathname: '/**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000,
  },
  // Headers for better SEO and security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/favicon.ico',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400',
          },
          {
            key: 'Content-Type',
            value: 'image/x-icon',
          },
        ],
      },
      {
        // Static assets served from /public (images, icons, fonts). Filenames
        // are not content-hashed, so use a week-long TTL with revalidation
        // rather than `immutable`.
        source: '/:path*.(svg|png|jpg|jpeg|gif|webp|avif|ico|woff|woff2)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=604800, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400',
          },
        ],
      },
      {
        // Public, non-personalised marketing pages. Edge-cache them but allow
        // an instant revalidate after each deploy.
        source: '/(landing|about)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
      {
        // Signed-in app *shells*. These pages render an identical HTML shell for
        // every user — all wallet data loads client-side via Server Actions, and
        // auth gating happens client-side from localStorage. The shells are
        // therefore safe to edge-cache (short TTL + SWR). NOTE: only the static
        // shell is cached; the per-user data requests are separate POSTs that
        // always reach the origin.
        source: '/(dashboard|analysis|security|chat|report|coin-control)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600',
          },
        ],
      },
      {
        // Dynamic explorer routes (transactions/address/block). Like the app
        // shells above, the SSR'd HTML is identical per route — all per-item
        // data loads client-side via Server Actions. Vercel only edge-caches
        // GET/HEAD, so the Server Action POSTs are never cached and always reach
        // the origin; this rule only makes repeat *page* (GET) hits a cache HIT
        // instead of a fresh server function, cutting compute->CDN egress.
        source: '/:section(transactions|address|block)/:id*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600',
          },
        ],
      },
    ];
  },
  // Updated experimental flags for Next.js 16
  experimental: {
    webVitalsAttribution: ['CLS', 'LCP'],
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
  },
  // Turbopack configuration (replaces webpack)
  // Turbopack has native WASM support - no custom config needed
  turbopack: {
    // Turbopack handles WASM natively
    // Add module resolution rules if needed
    resolveExtensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.wasm'],
  },
  // REMOVED: webpack config - not compatible with Turbopack
};

export default nextConfig;
