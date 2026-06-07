/** @type {import('next').NextConfig} */
const nextConfig = {
  // Avoids corrupted RSC client manifest errors with segment explorer on Windows dev.
  experimental: {
    devtoolSegmentExplorer: false,
  },
  async rewrites() {
    return [
      {
        source: '/backend/:path*',
        destination: `${process.env.BACKEND_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8001'}/:path*`,
      },
    ]
  },
}

export default nextConfig
