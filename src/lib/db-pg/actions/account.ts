'use server';

import { db } from '@/lib/db-pg';
import { account, accountGroup } from '@/lib/drizzle/schema';
import { and, asc, eq, ilike, sql } from 'drizzle-orm';
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
