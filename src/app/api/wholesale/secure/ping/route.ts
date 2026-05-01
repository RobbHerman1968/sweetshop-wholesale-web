import { NextResponse } from 'next/server';

import { getWholesaleApiAuthHeaders, getWholesaleApiBaseUrl } from '@/lib/wholesale-api';

/** Proxies to wholesale `GET /api/secure/ping` with shared secret. */
export async function GET() {
    const url = `${getWholesaleApiBaseUrl()}/api/secure/ping`;
    try {
        const res = await fetch(url, {
            cache: 'no-store',
            headers: getWholesaleApiAuthHeaders(),
        });
        const body = await res.json().catch(() => ({ error: 'Invalid JSON from wholesale API' }));
        return NextResponse.json(body, { status: res.status });
    } catch (err) {
        console.error('[wholesale/secure/ping]', err);
        return NextResponse.json({ error: 'Failed to reach wholesale API' }, { status: 502 });
    }
}
