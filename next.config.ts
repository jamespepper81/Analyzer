

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
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
    minimumCacheTTL: 31536000, // 1 year
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
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  // Add chunk loading optimization
  experimental: {
    optimizeCss: false, // Disabled to fix critters module issue
    // Enable WASM support for edge runtime
    webpackBuildWorker: true,
  },
  // Improve chunk loading reliability
  webpack: (config, { isServer, dev }) => {
    // Enable WebAssembly support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      syncWebAssembly: true, // Add this for better WASM support
    };
    
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/wasm/[name].[hash][ext]',
      },
    });

    // Fix handlebars webpack compatibility
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };

    // Exclude problematic modules from webpack processing
    config.externals = config.externals || [];
    if (Array.isArray(config.externals)) {
      config.externals.push('handlebars', 'dotprompt');
    }

    // Ignore problematic modules during server-side rendering
    if (isServer) {
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push('handlebars', 'dotprompt', '@bitcoinerlab/secp256k1');
      }
    }

    // Add specific WASM handling for client-side and edge runtime
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        // Ensure WASM files are properly resolved
        '@bitcoinerlab/secp256k1': '@bitcoinerlab/secp256k1/lib/index.js',
      };
    }

    // Handle WASM files for edge runtime (next/og)
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
      stream: false,
      util: false,
      buffer: false,
      process: false,
    };

    // Configure WASM loading for edge runtime
    config.output = {
      ...config.output,
      webassemblyModuleFilename: 'static/wasm/[modulehash].wasm',
    };

    // Add chunk loading error handling
    if (!isServer && !dev) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization?.splitChunks,
          cacheGroups: {
            ...config.optimization?.splitChunks?.cacheGroups,
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }

    return config;
  },
};

module.exports = nextConfig;
