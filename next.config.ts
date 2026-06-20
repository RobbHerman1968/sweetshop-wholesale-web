import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    /* config options here */
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'www.sweetshopusa.com',
            },
            {
                protocol: 'https',
                hostname: '**.public.blob.vercel-storage.com',
            },
        ],
        imageSizes: [64, 96, 128, 192, 256, 384, 512],
    },

    experimental: {
        serverActions: {
            bodySizeLimit: '10mb',
        },
    },
};

export default nextConfig;
