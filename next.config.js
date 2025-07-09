/** @type {import('next').NextConfig} */
const nextConfig = {
    env: {
        NEXT_PUBLIC_API_URL: 'http://localhost:8000',
    },
    output: 'export',
    eslint: {
        ignoreDuringBuilds: true,
    },
    images: { unoptimized: true },
};

module.exports = nextConfig;
