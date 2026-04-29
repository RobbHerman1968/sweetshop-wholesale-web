import { NextResponse } from 'next/server';

import { getWholesaleApiAuthHeaders, getWholesaleApiBaseUrl } from '@/lib/wholesale-api';

/**
 * Proxies to the wholesale API service {@link GET http://localhost:3001/test} (dev default).
 * Set WHOLESALE_API_URL in production (e.g. https://api.example.com).
 */
export async function GET() {
    const url = `${getWholesaleApiBaseUrl()}/test`;
    try {
        const res = await fetch(url, {
            cache: 'no-store',
            headers: getWholesaleApiAuthHeaders(),
        });
        const body = await res.json().catch(() => null);
        if (!res.ok) {
            return NextResponse.json(
                { error: 'Wholesale API returned an error', status: res.status, detail: body },
                { status: 502 },
            );
        }
        return NextResponse.json(body);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json(
            {
                error: 'Failed to reach wholesale API',
                url,
                detail: message,
            },
            { status: 502 },
        );
    }
}
