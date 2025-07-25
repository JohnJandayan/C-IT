/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
      appDir: true,
    },
    images: {
      unoptimized: true,
    },
    trailingSlash: true,
    output: 'export',
    distDir: 'out',
    // Remove or fix assetPrefix:
    // assetPrefix: process.env.NODE_ENV === 'production' ? '/' : '',
  };
  
  module.exports = nextConfig;