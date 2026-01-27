import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Transpile SDK packages
  transpilePackages: ['@madebykav/ui', '@madebykav/auth', '@madebykav/db', '@madebykav/ai'],
}

export default nextConfig
