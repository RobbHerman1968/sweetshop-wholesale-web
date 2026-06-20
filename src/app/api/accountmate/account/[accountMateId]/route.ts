import { NextResponse } from 'next/server';

import { fetchWholesaleAccount, parseAccountMateId } from '@/lib/wholesale-api';

type Params = { params: Promise<{ accountMateId: string }> };

/**
 * Proxies to the wholesale API AccountMate customer lookup.
 * GET /api/accountmate/account/:accountMateId
 */
export async function GET(_request: Request, { params }: Params) {
    const { accountMateId: raw } = await params;
    const accountMateId = parseAccountMateId(raw);
    if (!accountMateId) {
        return NextResponse.json({ error: 'Invalid accountMateId' }, { status: 400 });
    }

    try {
        const body = await fetchWholesaleAccount(accountMateId);
        return NextResponse.json(body);
    } catch (err) {
        console.error('[accountmate/account]', err);
        return NextResponse.json({ error: 'Failed to reach wholesale API' }, { status: 502 });
    }
}
