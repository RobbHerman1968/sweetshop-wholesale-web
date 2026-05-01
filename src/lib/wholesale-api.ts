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
