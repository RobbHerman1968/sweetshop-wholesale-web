import { db } from '@/lib/db-pg';
import { orderLog } from '@/lib/drizzle/schema';

export type OrderLogOutcome = 'success' | 'failure';

export type InsertOrderLogInput = {
    outcome: OrderLogOutcome;
    message: string;
    stage?: string | null;
    userId?: number | null;
    accountId?: number | null;
    cartId?: number | string | null;
    orderId?: number | null;
    orderNumber?: number | null;
    accountMateId?: string | null;
    accountMateOrderNumber?: string | number | null;
    accountMateTransactionId?: string | null;
    accountMateStatus?: string | null;
    error?: string | null;
};

function trimOrNull(value: string | null | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed || null;
}

function normalizeCartId(value: number | string | null | undefined): number | null {
    if (value == null || value === '') {
        return null;
    }

    const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function isAccountMateSuccessStatus(status: string | null | undefined): boolean {
    const normalized = status?.trim().toLowerCase() ?? '';
    return normalized === 'success' || normalized === 'success.';
}

/** Persists one order log row. Never throws. */
export async function insertOrderLog(input: InsertOrderLogInput): Promise<void> {
    try {
        await db.insert(orderLog).values({
            outcome: input.outcome,
            message: input.message.trim(),
            stage: trimOrNull(input.stage),
            userId: input.userId ?? null,
            accountId: input.accountId ?? null,
            cartId: normalizeCartId(input.cartId),
            orderId: input.orderId ?? null,
            orderNumber: input.orderNumber ?? null,
            accountMateId: trimOrNull(input.accountMateId),
            accountMateOrderNumber:
                input.accountMateOrderNumber == null || input.accountMateOrderNumber === ''
                    ? null
                    : String(input.accountMateOrderNumber).trim(),
            accountMateTransactionId: trimOrNull(input.accountMateTransactionId),
            accountMateStatus: trimOrNull(input.accountMateStatus),
            error: trimOrNull(input.error),
        });
    } catch (err) {
        console.error('[insertOrderLog] failed to write order log row', err);
    }
}
