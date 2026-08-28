import { db } from '@/lib/db-pg';
import { log } from '@/lib/drizzle/schema';
import { desc, sql } from 'drizzle-orm';

export type LogOutcome = 'success' | 'failure';

export type ManageLogRow = {
    id: number;
    createdAt: string;
    outcome: LogOutcome;
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

export type InsertLogInput = {
    outcome: LogOutcome;
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

/** @deprecated Use LogOutcome */
export type OrderLogOutcome = LogOutcome;
/** @deprecated Use ManageLogRow */
export type ManageOrderLogRow = ManageLogRow;
/** @deprecated Use InsertLogInput */
export type InsertOrderLogInput = InsertLogInput;

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

export async function getPaginatedLogsFromDB({
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
                id: log.id,
                createdAt: log.createdAt,
                outcome: log.outcome,
                message: log.message,
                stage: log.stage,
                userId: log.userId,
                accountId: log.accountId,
                cartId: log.cartId,
                orderId: log.orderId,
                orderNumber: log.orderNumber,
                accountMateId: log.accountMateId,
                accountMateOrderNumber: log.accountMateOrderNumber,
                accountMateTransactionId: log.accountMateTransactionId,
                accountMateStatus: log.accountMateStatus,
                error: log.error,
            })
            .from(log)
            .orderBy(desc(log.createdAt), desc(log.id))
            .limit(limit)
            .offset(offset),
        db.select({ count: sql<number>`count(*)` }).from(log),
    ]);

    const count = Number(countResult[0]?.count ?? 0);

    return {
        data: rows.map(
            (row): ManageLogRow => ({
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

/** @deprecated Use getPaginatedLogsFromDB */
export const getPaginatedOrderLogsFromDB = getPaginatedLogsFromDB;

/** Persists one log row. Never throws. */
export async function insertLog(input: InsertLogInput): Promise<void> {
    try {
        await db.insert(log).values({
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
        console.error('[insertLog] failed to write log row', err);
    }
}

/** @deprecated Use insertLog */
export const insertOrderLog = insertLog;
