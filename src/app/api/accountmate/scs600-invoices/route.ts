import { NextResponse } from 'next/server';

import { getWholesaleApiAuthHeaders, getWholesaleApiBaseUrl } from '@/lib/wholesale-api';

const HARDCODED_ACCOUNT_MATE_ID = 'JWE100';

/**
 * Proxies to the wholesale API invoice bundle for the hardcoded AccountMate id.
 * Also exposed as {@link GET /api/scs600-invoices} and {@link GET /api/srs600-invoices} (typo alias).
 * GET /api/accountmate/scs600-invoices
 */
export async function GET() {
    const url = `${getWholesaleApiBaseUrl()}/api/invoices/${HARDCODED_ACCOUNT_MATE_ID}`;
    try {
        const res = await fetch(url, {
            cache: 'no-store',
            headers: getWholesaleApiAuthHeaders(),
        });
        const body = await res.json().catch(() => null);
        if (!res.ok) {
            console.error('[scs600-invoices]', res.status, body);
            return NextResponse.json({ error: 'Wholesale API returned an error' }, { status: 502 });
        }
        return NextResponse.json(body);
    } catch (err) {
        console.error('[scs600-invoices]', err);
        return NextResponse.json({ error: 'Failed to reach wholesale API' }, { status: 502 });
    }
}
