/** Base URL for the separate wholesale Next.js API app (no trailing slash). */
export function getWholesaleApiBaseUrl(): string {
    const raw = process.env.WHOLESALE_API_URL?.trim();
    if (raw) return raw.replace(/\/$/, '');
    // return 'https://sweetshopwholesale.online';
    return 'http://localhost:3001';
}

/**
 * Must match `WHOLESALE_API_SECRET` on the wholesale API when that env is set.
 * Server-only — never expose via `NEXT_PUBLIC_*`.
 */
export function getWholesaleApiAuthHeaders(): HeadersInit {
    const secret = process.env.WHOLESALE_API_SECRET?.trim();
    if (!secret) return {};
    return { Authorization: `Bearer ${secret}` };
}

/** Rejects empty or suspicious AccountMate id path segments. */
export function parseAccountMateId(accountMateId: string | undefined): string | null {
    if (!accountMateId?.trim()) return null;
    const id = accountMateId.trim();
    if (id.length > 50) return null;
    if (!/^[A-Za-z0-9._-]+$/.test(id)) return null;
    return id;
}

export type WholesaleAccountMateResponse = {
    accountMateId: string;
    account: Record<string, unknown> | null;
};

/** Loads one AccountMate customer row via the wholesale API (`GET /api/account/:id`). */
export async function fetchWholesaleAccount(accountMateId: string): Promise<WholesaleAccountMateResponse> {
    const id = parseAccountMateId(accountMateId);
    if (!id) {
        throw new Error('Invalid accountMateId');
    }

    const url = `${getWholesaleApiBaseUrl()}/api/account/${encodeURIComponent(id)}`;
    const res = await fetch(url, {
        cache: 'no-store',
        headers: getWholesaleApiAuthHeaders(),
    });
    const body = (await res.json().catch(() => null)) as WholesaleAccountMateResponse | { error?: string } | null;
    if (!res.ok) {
        const msg = body && typeof body === 'object' && 'error' in body ? String(body.error) : `HTTP ${res.status}`;
        throw new Error(msg);
    }
    return body as WholesaleAccountMateResponse;
}
