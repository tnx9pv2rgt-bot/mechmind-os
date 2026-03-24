const { withSentryConfig } = require('@sentry/nextjs');
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output for non-Vercel hosting (Render, Docker)
  // Only enable in production — standalone breaks dev server static file serving
  ...(process.env.NODE_ENV === 'production' ? { output: 'standalone' } : {}),

  // Image optimization
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
    ],
  },

  // TypeScript and ESLint handling
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true, // TODO: fix frontend lint errors then set to false
  },

  // Experimental features
  experimental: {
    instrumentationHook: true,
    serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
    optimizePackageImports: [
      'framer-motion',
      'lucide-react',
      '@radix-ui/react-icons',
      'recharts',
      'react-phone-number-input',
      // NOTE: @simplewebauthn/browser removed — barrel optimization breaks
      // dynamic import of startAuthentication (vercel/next.js#61995)
    ],
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // Webpack configuration
  webpack: (config, { isServer, dev }) => {
    // NOTE: Do NOT override splitChunks — Next.js manages chunk splitting
    // internally. Custom splitChunks causes "Cannot read properties of
    // undefined (reading 'call')" at runtime (vercel/next.js#61995).

    // Node.js polyfills for client-side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        http: false,
        https: false,
        zlib: false,
        path: false,
        os: false,
        url: false,
        querystring: false,
        buffer: false,
        util: false,
        assert: false,
        constants: false,
        timers: false,
        events: false,
        dns: false,
        dgram: false,
        cluster: false,
        module: false,
        vm: false,
        async_hooks: false,
        inspector: false,
        perf_hooks: false,
        process: false,
        punycode: false,
        readline: false,
        repl: false,
        stream: false,
        string_decoder: false,
        sys: false,
        tty: false,
        v8: false,
        worker_threads: false,
      };
    }

    // Production optimizations
    if (!dev && !isServer) {
      config.optimization.minimize = true;
    }

    return config;
  },

  // Enhanced Security Headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com https://www.google.com https://www.gstatic.com https://js.stripe.com https://www.googletagmanager.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: https://*.googleusercontent.com https://*.supabase.co https://www.googletagmanager.com https://www.google-analytics.com blob:",
              "connect-src 'self' https://accounts.google.com https://*.supabase.co https://api.ipapi.co https://www.google.com https://*.upstash.io https://nexo-gestionale.onrender.com https://nexo-frontend.onrender.com https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com https://*.analytics.google.com http://localhost:3000 http://localhost:3001 http://localhost:3002 ws://localhost:3000 ws://localhost:3001",
              "frame-src 'self' https://accounts.google.com https://www.google.com https://js.stripe.com https://hooks.stripe.com",
              "media-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              ...(process.env.NODE_ENV === 'production'
                ? ['upgrade-insecure-requests', 'block-all-mixed-content']
                : []),
            ].join('; '),
          },
          // Security headers
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          ...(process.env.NODE_ENV === 'production'
            ? [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=31536000; includeSubDomains; preload',
                },
              ]
            : []),
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Permissions-Policy',
            value: [
              'camera=()',
              'microphone=()',
              'geolocation=(self)',
              'payment=(self)',
              'usb=()',
              'magnetometer=()',
              'gyroscope=()',
              'accelerometer=()',
              'fullscreen=(self)',
            ].join(', '),
          },
        ],
      },
      // API routes - No cache
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
      // Static assets - Long cache in production, no cache in dev
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value:
              process.env.NODE_ENV === 'production'
                ? 'public, max-age=31536000, immutable'
                : 'no-store, must-revalidate',
          },
        ],
      },
      // Public static files
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Compression
  compress: true,

  // Production source maps (disabled for security)
  productionBrowserSourceMaps: false,

  // Trailing slashes
  trailingSlash: false,

  // Security: Disable powered by header
  poweredByHeader: false,

  // Security: Generate ETags
  generateEtags: true,

  // Dist directory
  distDir: '.next',

  // Clean dist on build
  cleanDistDir: true,

  // Transpile packages if needed
  transpilePackages: [],

  // NOTE: lucide-react tree-shaking is handled by optimizePackageImports above.
  // Do NOT use modularizeImports for lucide-react — it conflicts with
  // optimizePackageImports and causes webpack module resolution errors
  // (lucide-icons/lucide#1482, vercel/next.js#53668).
};

module.exports = withSentryConfig(withBundleAnalyzer(nextConfig), {
  silent: true,
  org: process.env.SENTRY_ORG || '',
  project: process.env.SENTRY_PROJECT || '',
  widenClientFileUpload: true,
  hideSourceMaps: true,
  telemetry: false,
});
