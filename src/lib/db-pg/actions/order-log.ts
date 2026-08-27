import { db } from '@/lib/db-pg';
import { orderLog } from '@/lib/drizzle/schema';
import { desc, sql } from 'drizzle-orm';

export type OrderLogOutcome = 'success' | 'failure';

export type ManageOrderLogRow = {
    id: number;
    createdAt: string;
    outcome: OrderLogOutcome;
    message: string;
    stage: string | null;
    userId: number | null;
    accountId: number | null;
    cartId: number | null;
    orderId: number | null;
    orderNumber: number | null;
    accountMateId: string | null;
    accountMateOrderNumber: string | null;
    accountMateTransactionId: string | null;
    accountMateStatus: string | null;
    error: string | null;
};

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

export async function getPaginatedOrderLogsFromDB({
    page = 1,
    limit = 50,
}: {
    page?: number;
    limit?: number;
} = {}) {
    const offset = (page - 1) * limit;

    const [rows, countResult] = await Promise.all([
        db
            .select({
                id: orderLog.id,
                createdAt: orderLog.createdAt,
                outcome: orderLog.outcome,
                message: orderLog.message,
                stage: orderLog.stage,
                userId: orderLog.userId,
                accountId: orderLog.accountId,
                cartId: orderLog.cartId,
                orderId: orderLog.orderId,
                orderNumber: orderLog.orderNumber,
                accountMateId: orderLog.accountMateId,
                accountMateOrderNumber: orderLog.accountMateOrderNumber,
                accountMateTransactionId: orderLog.accountMateTransactionId,
                accountMateStatus: orderLog.accountMateStatus,
                error: orderLog.error,
            })
            .from(orderLog)
            .orderBy(desc(orderLog.createdAt), desc(orderLog.id))
            .limit(limit)
            .offset(offset),
        db.select({ count: sql<number>`count(*)` }).from(orderLog),
    ]);

    const count = Number(countResult[0]?.count ?? 0);

    return {
        data: rows.map(
            (row): ManageOrderLogRow => ({
                id: row.id,
                createdAt: row.createdAt,
                outcome: row.outcome === 'success' ? 'success' : 'failure',
                message: row.message,
                stage: row.stage?.trim() || null,
                userId: row.userId,
                accountId: row.accountId,
                cartId: row.cartId,
                orderId: row.orderId,
                orderNumber: row.orderNumber,
                accountMateId: row.accountMateId?.trim() || null,
                accountMateOrderNumber: row.accountMateOrderNumber?.trim() || null,
                accountMateTransactionId: row.accountMateTransactionId?.trim() || null,
                accountMateStatus: row.accountMateStatus?.trim() || null,
                error: row.error?.trim() || null,
            }),
        ),
        pagination: {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit) || 1,
        },
    };
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
