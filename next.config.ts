

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Development-specific optimizations
  ...(process.env.NODE_ENV === 'development' && {
    onDemandEntries: {
      // Period (in ms) where the server will keep pages in the buffer
      maxInactiveAge: 25 * 1000,
      // Number of pages that should be kept simultaneously without being disposed
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
    ];
  },
  // Add chunk loading optimization
  experimental: {
    optimizeCss: false, // Disabled to fix critters module issue
    // Enable WASM support for edge runtime
    webpackBuildWorker: true,
    // Improve chunk loading reliability
    webVitalsAttribution: ['CLS', 'LCP'],
    // Enable better chunk splitting
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
  },
  // Acknowledge use of webpack config (Next.js 16 uses Turbopack by default)
  turbopack: {},
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

    // Add chunk loading error handling and optimization (only in production)
    if (!isServer && process.env.NODE_ENV === 'production') {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization?.splitChunks,
          chunks: 'all',
          minSize: 20000,
          maxSize: 244000,
          cacheGroups: {
            ...config.optimization?.splitChunks?.cacheGroups,
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
            },
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: -10,
              chunks: 'all',
            },
            common: {
              name: 'common',
              minChunks: 2,
              priority: -5,
              reuseExistingChunk: true,
            },
          },
        },
        // Add runtime chunk for better caching
        runtimeChunk: {
          name: 'runtime',
        },
      };
    }

    // Add chunk loading timeout configuration (only for client-side)
    if (!isServer) {
      config.output = {
        ...config.output,
        // Increase timeout for chunk loading
        chunkLoadTimeout: 120000, // 2 minutes
      };
    }

    // Ensure webpack runtime compatibility
    if (!isServer) {
      config.resolve = {
        ...config.resolve,
        fallback: {
          ...config.resolve.fallback,
          // Ensure webpack runtime functions are available
          module: false,
        },
      };
    }

    // Ensure static files are handled correctly (only for client-side)
    if (!isServer) {
      config.module = {
        ...config.module,
        rules: [
          ...config.module.rules,
          {
            test: /\.(ico|png|jpg|jpeg|gif|svg)$/i,
            type: 'asset/resource',
            generator: {
              filename: 'static/[name].[hash][ext]',
            },
          },
        ],
      };
    }

    return config;
  },
};

module.exports = nextConfig;
