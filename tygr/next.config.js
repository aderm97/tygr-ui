/** @type {import('next').NextConfig} */
const nextConfig = {
  serverActions: {
    bodySizeLimit: '10mb'
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      }
    ]
  },
  // Security: Disable source maps in production
  productionBrowserSourceMaps: false,
  // Optimize for security scanning workloads
  poweredByHeader: false,
  // Handle large payloads for security reports
  serverRuntimeConfig: {
    maxRequestBodySize: '10mb'
  },
  // Enable streaming for real-time updates
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false
    }
    return config
  }
}

module.exports = nextConfig