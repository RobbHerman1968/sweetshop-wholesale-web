import { APP_BUILD_ID } from '@/lib/app-build-id';

export const dynamic = 'force-dynamic';

export function GET() {
    return Response.json(
        { buildId: APP_BUILD_ID },
        {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate',
            },
        },
    );
}
