import type { PlaceOrder } from '@/lib/db-pg/entities/place-order-entity';

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

/** Parses AccountMate `csono` for Postgres `order.accountMateOrderNumber` (integer). */
export function parseAccountMateOrderNumber(value: string | number | null | undefined): number | null {
    if (value == null || value === '') {
        return null;
    }

    const parsed = typeof value === 'number' ? value : Number.parseInt(String(value).trim(), 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export type WholesaleAccountMateResponse = {
    accountMateId: string;
    account: Record<string, unknown> | null;
};

export type PlaceWholesaleOrderSuccessResponse = {
    ok: true;
    message: string;
    accountMateSuccess: boolean;
    accountMateStatus: string | null;
    data: PlaceOrder;
};

export type PlaceWholesaleOrderErrorResponse = {
    ok: false;
    message: string;
    error: string;
    details?: string;
    accountId?: number;
    cartId?: number | string;
    accountMateId?: string | null;
    itemCount?: number;
};

export type PlaceWholesaleOrderResponse = PlaceWholesaleOrderSuccessResponse | PlaceWholesaleOrderErrorResponse;

async function readWholesaleApiError(res: Response, body: unknown): Promise<string> {
    if (body && typeof body === 'object') {
        if ('error' in body && (body as { error?: string }).error) {
            return String((body as { error?: string }).error);
        }
        if ('message' in body && (body as { message?: string }).message) {
            return String((body as { message?: string }).message);
        }
    }

    return `HTTP ${res.status}`;
}

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
        throw new Error(await readWholesaleApiError(res, body));
    }
    return body as WholesaleAccountMateResponse;
}

/** Submits an order to AccountMate via the wholesale API (`POST /api/order`). */
export async function placeWholesaleOrder(payload: PlaceOrder): Promise<PlaceWholesaleOrderResponse> {
    const url = `${getWholesaleApiBaseUrl()}/api/order`;
    const res = await fetch(url, {
        method: 'POST',
        cache: 'no-store',
        headers: {
            ...getWholesaleApiAuthHeaders(),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
    const body = (await res.json().catch(() => null)) as PlaceWholesaleOrderResponse | null;

    if (!body || typeof body !== 'object' || !('ok' in body)) {
        throw new Error(await readWholesaleApiError(res, body));
    }

    if (!res.ok) {
        if (body.ok === false) {
            return body;
        }

        throw new Error(await readWholesaleApiError(res, body));
    }

    if (body.ok !== true || !body.data) {
        throw new Error('Invalid order response from wholesale API.');
    }

    return body;
}
