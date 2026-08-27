import { execSync } from 'node:child_process';
import type { NextConfig } from 'next';

function resolveBuildId(): string {
    if (process.env.VERCEL_GIT_COMMIT_SHA) {
        return process.env.VERCEL_GIT_COMMIT_SHA;
    }

    if (process.env.NEXT_PUBLIC_BUILD_ID) {
        return process.env.NEXT_PUBLIC_BUILD_ID;
    }

    try {
        return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    } catch {
        return 'development';
    }
}

const buildId = resolveBuildId();

const nextConfig: NextConfig = {
    env: {
        NEXT_PUBLIC_BUILD_ID: buildId,
    },
    generateBuildId: async () => buildId,
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
