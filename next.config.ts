import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@madebykav/ui', '@madebykav/auth', '@madebykav/db'],
}

export default nextConfig
