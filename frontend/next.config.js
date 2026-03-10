/** @type {import('next').NextConfig} */
const nextConfig = {
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
    optimizePackageImports: [
      'framer-motion',
      'lucide-react',
      '@radix-ui/react-icons',
      'recharts',
      'react-phone-number-input',
      '@simplewebauthn/browser',
    ],
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  
  // Webpack configuration
  webpack: (config, { isServer, dev }) => {
    // Split chunks optimization
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        default: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true,
        },
        // AI vendors chunk
        ai: {
          test: /[\\/]node_modules[\\/](openai|@anthropic|langchain)[\\/]/,
          name: 'ai-vendor',
          priority: 10,
          chunks: 'all',
        },
        // Auth vendors chunk
        auth: {
          test: /[\\/]node_modules[\\/](@simplewebauthn|@auth)[\\/]/,
          name: 'auth-vendor',
          priority: 10,
          chunks: 'all',
        },
        // Charts/analytics chunk
        analytics: {
          test: /[\\/]node_modules[\\/](recharts|d3|chart\.js)[\\/]/,
          name: 'analytics-vendor',
          priority: 10,
          chunks: 'all',
        },
        // UI components chunk
        ui: {
          test: /[\\/]components[\\/]ui[\\/]/,
          name: 'ui-components',
          priority: 5,
          chunks: 'all',
        },
      },
    };

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
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.google.com https://www.gstatic.com https://js.stripe.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: https://*.googleusercontent.com https://*.supabase.co blob:",
              "connect-src 'self' https://*.supabase.co https://api.ipapi.co https://www.google.com https://*.upstash.io https://mechmind-os.vercel.app",
              "frame-src 'self' https://www.google.com https://js.stripe.com https://hooks.stripe.com",
              "media-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests",
              "block-all-mixed-content",
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
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
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
      // Static assets - Long cache
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
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
  
  // Modularize imports for tree shaking
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{ kebabCase member }}',
    },
  },
}

module.exports = nextConfig
