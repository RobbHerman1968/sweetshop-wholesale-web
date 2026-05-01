'use server';

import { db } from '@/lib/db-pg';
import { account, accountGroup } from '@/lib/drizzle/schema';
import { and, asc, eq, ilike, isNotNull, sql } from 'drizzle-orm';
import { Account, AccountGroup } from '../entities/account-entity';
import { accountGroupMapper, accountMapper } from '../mappers/account-mapper';

export async function getUserAccounts(userId: string) {
    const accounts = await db.query.user.findMany({
        where: eq(account.userId, userId),
    });

    const out: Account[] = [];
    accounts?.map(async (r) => {
        out.push(await accountMapper(r));
    });
    return out;
}

export async function getAccountCount(search: string) {
    const filter = `%${search}%`;

    const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(account)
        .where(ilike(account.name, filter));

    return count;
}

export async function getAccounts(limit: number, offset: number, search: string) {
    const filter = `%${search}%`;

    const accounts = await db
        .select({
            id: account.id,
            accountMateId: account.accountMateId,
            name: account.name,
            contactFirstName: account.contactFirstName,
            contactLastName: account.contactLastName,
            contactEmail: account.contactEmail,
            contactPhone: account.contactPhone,
        })
        .from(account)
        .where(ilike(account.name, filter))
        .orderBy(asc(account.name))
        .limit(limit)
        .offset(offset);

    const out: Account[] = [];
    accounts?.map(async (a) => {
        out.push(await accountMapper(a));
    });

    return out;
}

export async function getPaginatedAccountsFromDB({
    page = 1,
    limit = 50,
    name,
    accountMateId,
}: {
    page?: number;
    limit?: number;
    name?: string;
    accountMateId?: string;
}) {
    const offset = (page - 1) * limit;

    const conditions = [];
    if (name) {
        conditions.push(ilike(account.name, `%${name}%`));
    }
    if (accountMateId) {
        conditions.push(ilike(account.accountMateId, `%${accountMateId}%`));
    }

    const whereClause =
        conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : and(...conditions);

    const data = await db
        .select({
            id: account.id,
            accountMateId: account.accountMateId,
            name: account.name,
            contactFirstName: account.contactFirstName,
            contactLastName: account.contactLastName,
            contactEmail: account.contactEmail,
            contactPhone: account.contactPhone,
        })
        .from(account)
        .where(whereClause)
        .orderBy(asc(account.name))
        .limit(limit)
        .offset(offset);

    const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(account)
        .where(whereClause);

    return {
        data,
        pagination: {
            total: Number(count),
            page,
            limit,
            totalPages: Math.max(1, Math.ceil(Number(count) / limit)),
        },
    };
}

export async function getAccountsBySearch(name: string | undefined, accountMateId: string | undefined) {
    const nameFilter = '%' + name + '%';
    const accountMateIdFilter = '%' + accountMateId + '%';

    console.log(nameFilter);
    console.log(accountMateIdFilter);

    const accounts = await db
        .select({
            id: account.id,
            accountMateId: account.accountMateId,
            name: account.name,
            contactFirstName: account.contactFirstName,
            contactLastName: account.contactLastName,
            contactEmail: account.contactEmail,
            contactPhone: account.contactPhone,
        })
        .from(account)
        .where(and(ilike(account.name, nameFilter), ilike(account.accountMateId, accountMateIdFilter)))
        .orderBy((x) => x.name);

    const out: Account[] = [];
    for (const a of accounts ?? []) {
        out.push(await accountMapper(a));
    }

    return out;
}

export async function getAccountGroupsByAccountId(accountId: number) {
    const accountGroups = await db.query.accountGroup.findMany({
        where: eq(accountGroup.accountId, accountId),
    });

    const out: AccountGroup[] = [];
    accountGroups?.map(async (a) => {
        out.push(await accountGroupMapper(a));
    });
    return out;
}

function normalizeShopUserId(userId: string): string {
    return userId.trim();
}

/** DB/driver may return INTEGER columns as number, string, or bigint — normalize for catalog filtering. */
function collectDistinctProductGroupIds(rows: { productGroupId: unknown }[]): number[] {
    const out: number[] = [];
    for (const r of rows) {
        const v = r.productGroupId;
        let n: number | null = null;
        if (typeof v === 'number' && Number.isFinite(v)) n = v;
        else if (typeof v === 'bigint') {
            const x = Number(v);
            n = Number.isFinite(x) ? x : null;
        } else if (typeof v === 'string') {
            const x = Number.parseInt(v, 10);
            n = Number.isFinite(x) ? x : null;
        }
        if (n != null && n > 0) out.push(n);
    }
    return [...new Set(out)];
}

/**
 * Wholesale shop catalog scope (matches your schema):
 * `user` → `account` (via account.userId) → `accountGroup` (rows per account with productGroupId) →
 * products are those whose id appears in `productGroupProduct` for those product group ids.
 */

/** Distinct product group ids linked to any account belonging to this user. */
export async function getShopProductGroupIdsForUser(userId: string): Promise<number[]> {
    const uid = normalizeShopUserId(userId);
    if (!uid) return [];

    const rows = await db
        .selectDistinct({ productGroupId: accountGroup.productGroupId })
        .from(accountGroup)
        .innerJoin(account, eq(accountGroup.accountId, account.id))
        .where(and(eq(account.userId, uid), isNotNull(accountGroup.accountId)));

    return collectDistinctProductGroupIds(rows);
}

export async function verifyUserOwnsAccount(userId: string, accountId: number): Promise<boolean> {
    const uid = normalizeShopUserId(userId);
    if (!uid) return false;

    const row = await db.query.account.findFirst({
        where: and(eq(account.userId, uid), eq(account.id, accountId)),
        columns: { id: true },
    });
    return Boolean(row);
}

/** Product groups linked to a specific account (after verifying the account belongs to the user). */
export async function getShopProductGroupIdsForUserAccount(userId: string, accountId: number): Promise<number[]> {
    const ok = await verifyUserOwnsAccount(userId, accountId);
    if (!ok) return [];

    const rows = await db
        .selectDistinct({ productGroupId: accountGroup.productGroupId })
        .from(accountGroup)
        .where(and(eq(accountGroup.accountId, accountId), isNotNull(accountGroup.accountId)));

    return collectDistinctProductGroupIds(rows);
}

/**
 * Resolves product group ids for the shop grid for the selected wholesale account.
 * Prefers groups from that account’s `accountGroup` row(s); if none, unions groups from all of the user’s accounts.
 */
export async function resolveShopCatalogProductGroupIds(userId: string, selectedAccountId: number): Promise<number[]> {
    const scoped = await getShopProductGroupIdsForUserAccount(userId, selectedAccountId);
    if (scoped.length > 0) return scoped;
    return getShopProductGroupIdsForUser(userId);
}
