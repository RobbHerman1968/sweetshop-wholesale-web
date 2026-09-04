'use server';

import * as argon2 from 'argon2';
import { eq, sql } from 'drizzle-orm';

import { db } from '@/lib/db-pg';
import { getAccountsFromSweetshopOld } from '@/lib/db-sweetshop-old';
import { user } from '@/lib/drizzle/schema';

export type UserSyncResult = {
    fetched: number;
    inserted: number;
    updated: number;
    skipped: number;
};

function trimOrNull(value: unknown): string | null {
    if (value == null) {
        return null;
    }
    const trimmed = String(value).trim();
    return trimmed || null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readLegacyLoginAccountId(row: any): number | null {
    const id = Number(row.Id ?? row.id);
    return Number.isFinite(id) && id > 0 ? id : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readLegacyLoginEmail(row: any): string | null {
    return trimOrNull(row.EmailAddress ?? row.emailAddress ?? row.userName)?.toLowerCase() ?? null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readLegacyLoginPassword(row: any): string | null {
    return trimOrNull(row.Password ?? row.password);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readLegacyAccountMateId(row: any): string | null {
    return trimOrNull(row.AccountMateId ?? row.accountMateId);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readLegacyIsWholesale(row: any): boolean {
    const raw = row.IsWholesale ?? row.isWholesale;
    if (raw == null) {
        return true;
    }
    if (typeof raw === 'boolean') {
        return raw;
    }
    if (typeof raw === 'number') {
        return raw !== 0;
    }
    const normalized = String(raw).trim().toLowerCase();
    return normalized !== 'false' && normalized !== '0' && normalized !== 'no';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function syncLegacyLoginAccountsToUsers(rows: any[]): Promise<UserSyncResult> {
    const existingUsers = await db
        .select({
            id: user.id,
            userName: user.userName,
            accountMateId: user.accountMateId,
            isWholesale: user.isWholesale,
        })
        .from(user);

    const userIdByEmail = new Map(existingUsers.map((row) => [row.userName.trim().toLowerCase(), row.id]));
    const userIdByLegacyId = new Map(existingUsers.map((row) => [row.id, row.id]));

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    console.log(`User sync: starting ${rows.length} legacy Account rows`);

    for (const row of rows) {
        const legacyAccountId = readLegacyLoginAccountId(row);
        const email = readLegacyLoginEmail(row);
        const password = readLegacyLoginPassword(row);
        const accountMateId = readLegacyAccountMateId(row);
        const isWholesale = readLegacyIsWholesale(row);

        if (legacyAccountId == null || !email) {
            skipped += 1;
            continue;
        }

        const existingUserId = userIdByEmail.get(email) ?? userIdByLegacyId.get(legacyAccountId);

        if (existingUserId != null) {
            const existing = existingUsers.find((u) => u.id === existingUserId);
            const nextAccountMateId = accountMateId ?? existing?.accountMateId ?? null;
            const accountMateChanged = Boolean(nextAccountMateId && existing?.accountMateId !== nextAccountMateId);
            const wholesaleChanged = existing?.isWholesale !== isWholesale;

            if (accountMateChanged || wholesaleChanged) {
                await db
                    .update(user)
                    .set({
                        ...(accountMateChanged ? { accountMateId: nextAccountMateId } : {}),
                        ...(wholesaleChanged ? { isWholesale } : {}),
                    })
                    .where(eq(user.id, existingUserId));
                if (existing) {
                    if (accountMateChanged) {
                        existing.accountMateId = nextAccountMateId;
                    }
                    if (wholesaleChanged) {
                        existing.isWholesale = isWholesale;
                    }
                }
                updated += 1;
            } else {
                skipped += 1;
            }
            continue;
        }

        if (!password) {
            skipped += 1;
            continue;
        }

        const passwordHash = await argon2.hash(password);

        await db.insert(user).values({
            id: legacyAccountId,
            userName: email,
            passwordHash,
            isAdmin: false,
            isActive: true,
            isWholesale,
            accountMateId,
        });

        existingUsers.push({ id: legacyAccountId, userName: email, accountMateId, isWholesale });
        userIdByEmail.set(email, legacyAccountId);
        userIdByLegacyId.set(legacyAccountId, legacyAccountId);
        inserted += 1;
    }

    console.log(
        `User sync: complete (${updated} updated, ${inserted} inserted, ${skipped} skipped, ${rows.length} fetched)`,
    );

    return {
        fetched: rows.length,
        inserted,
        updated,
        skipped,
    };
}

export async function syncUsersFromLegacy(): Promise<UserSyncResult> {
    try {
        const rows = await getAccountsFromSweetshopOld();
        return syncLegacyLoginAccountsToUsers(rows);
    } catch (error) {
        console.error('Error syncing users from legacy Account:', error);
        throw error instanceof Error ? error : new Error('Failed to sync users from legacy Account');
    }
}

/** @deprecated Use syncUsersFromLegacy instead. */
export async function processUsers() {
    return syncUsersFromLegacy();
}

export async function createDefaultUser(): Promise<{ ok: true; action: 'inserted' | 'updated'; id: number }> {
    const userName = 'rob.herman@toolsbydesign';
    const passwordHash = await argon2.hash('just4ruth');

    const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.userName, userName)).limit(1);

    if (existing) {
        await db
            .update(user)
            .set({
                passwordHash,
                isAdmin: true,
                isActive: true,
                isWholesale: true,
            })
            .where(eq(user.id, existing.id));

        return { ok: true, action: 'updated', id: existing.id };
    }

    const [{ maxId }] = await db.select({ maxId: sql<number>`coalesce(max(${user.id}), 0)` }).from(user);
    const nextId = Number(maxId) + 1;

    await db.insert(user).values({
        id: nextId,
        userName,
        passwordHash,
        isAdmin: true,
        isActive: true,
        isWholesale: true,
    });

    return { ok: true, action: 'inserted', id: nextId };
}
