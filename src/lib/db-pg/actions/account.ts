'use server';

import { db } from '@/lib/db-pg';
import { getAccountOldFromSweetshopOld } from '@/lib/db-sweetshop-old';
import { mapSignInLocationIdToMenuId, WHOLESALE_SHOPPING_MENU_ID } from '@/lib/menu-manage-utils';
import { account, user } from '@/lib/drizzle/schema';
import { and, asc, eq, ilike, or, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { Account } from '../entities/account-entity';
import { accountMapper } from '../mappers/account-mapper';
import { mapAccountMateRowToAccountFields } from '@/lib/account-mate-account-map';
import { fetchWholesaleAccount } from '@/lib/wholesale-api';

export type ManageAccount = {
    id: number;
    accountMateId: string | null;
    isSkipTax: boolean;
    isSkipShipping: boolean;
    isFreeGroundShipping: boolean;
    terms: string | null;
    isTerms: boolean;
    name: string | null;
    contactFirstName: string | null;
    contactLastName: string | null;
    contactPhone: string | null;
    contactAddress1: string | null;
    contactAddress2: string | null;
    contactCity: string | null;
    contactState: string | null;
    contactZipCode: string | null;
    contactEmail: string | null;
    menuId: number;
};

function trimFormValue(value: FormDataEntryValue | null): string | null {
    if (value == null) {
        return null;
    }
    const trimmed = String(value).trim();
    return trimmed || null;
}

function readCheckbox(formData: FormData, name: string): boolean {
    const value = formData.get(name);
    return value === 'on' || value === 'true';
}

function readMenuId(formData: FormData): number {
    const raw = Number(formData.get('menuId'));
    const menuId = Number.isFinite(raw) && raw > 0 ? Math.trunc(raw) : WHOLESALE_SHOPPING_MENU_ID;
    return menuId;
}

export async function getAccountByIdForManage(accountId: number): Promise<ManageAccount | null> {
    if (!Number.isFinite(accountId) || accountId <= 0) {
        return null;
    }

    const [row] = await db
        .select({
            id: account.id,
            accountMateId: account.accountMateId,
            isSkipTax: account.isSkipTax,
            isSkipShipping: account.isSkipShipping,
            isFreeGroundShipping: account.isFreeGroundShipping,
            terms: account.terms,
            isTerms: account.isTerms,
            name: account.name,
            contactFirstName: account.contactFirstName,
            contactLastName: account.contactLastName,
            contactPhone: account.contactPhone,
            contactAddress1: account.contactAddress1,
            contactAddress2: account.contactAddress2,
            contactCity: account.contactCity,
            contactState: account.contactState,
            contactZipCode: account.contactZipCode,
            contactEmail: account.contactEmail,
            menuId: account.menuId,
        })
        .from(account)
        .where(eq(account.id, accountId))
        .limit(1);

    return row ?? null;
}

export async function updateAccountFromForm(formData: FormData) {
    const id = Number(formData.get('id'));
    if (!id) {
        return;
    }

    const existing = await getAccountByIdForManage(id);
    if (!existing) {
        return;
    }

    await db
        .update(account)
        .set({
            accountMateId: trimFormValue(formData.get('accountMateId')),
            isSkipTax: readCheckbox(formData, 'isSkipTax'),
            isSkipShipping: readCheckbox(formData, 'isSkipShipping'),
            isFreeGroundShipping: readCheckbox(formData, 'isFreeGroundShipping'),
            terms: trimFormValue(formData.get('terms')),
            isTerms: readCheckbox(formData, 'isTerms'),
            name: trimFormValue(formData.get('name')),
            contactFirstName: trimFormValue(formData.get('contactFirstName')),
            contactLastName: trimFormValue(formData.get('contactLastName')),
            contactPhone: trimFormValue(formData.get('contactPhone')),
            contactAddress1: trimFormValue(formData.get('contactAddress1')),
            contactAddress2: trimFormValue(formData.get('contactAddress2')),
            contactCity: trimFormValue(formData.get('contactCity')),
            contactState: trimFormValue(formData.get('contactState')),
            contactZipCode: trimFormValue(formData.get('contactZipCode')),
            contactEmail: trimFormValue(formData.get('contactEmail'))?.toLowerCase() ?? null,
            menuId: readMenuId(formData),
        })
        .where(eq(account.id, id));

    revalidatePath('/manage/accounts');
    revalidatePath(`/manage/accounts/${id}`);
    revalidatePath('/shop', 'layout');
}

export async function reloadAccountFromAccountMate(
    accountId: number,
    accountMateId: string,
    skipRevalidate = false,
) {
    if (!Number.isFinite(accountId) || accountId <= 0) {
        return { ok: false as const, error: 'Invalid account' };
    }

    const existing = await getAccountByIdForManage(accountId);
    if (!existing) {
        return { ok: false as const, error: 'Account not found' };
    }

    const trimmedAccountMateId = accountMateId.trim();
    if (!trimmedAccountMateId) {
        return { ok: false as const, error: 'AccountMate ID is required' };
    }

    try {
        const { account: accountMateRow } = await fetchWholesaleAccount(trimmedAccountMateId);
        if (!accountMateRow) {
            return { ok: false as const, error: 'No AccountMate account found' };
        }

        const mapped = mapAccountMateRowToAccountFields(accountMateRow);

        await db
            .update(account)
            .set({
                accountMateId: trimmedAccountMateId,
                name: mapped.name,
                contactFirstName: mapped.contactFirstName,
                contactLastName: mapped.contactLastName,
                contactPhone: mapped.contactPhone,
                contactAddress1: mapped.contactAddress1,
                contactAddress2: mapped.contactAddress2,
                contactCity: mapped.contactCity,
                contactState: mapped.contactState,
                contactZipCode: mapped.contactZipCode,
                terms: mapped.terms,
                isTerms: mapped.isTerms,
            })
            .where(eq(account.id, accountId));

        if (!skipRevalidate) {
            revalidatePath('/manage/accounts');
            revalidatePath(`/manage/accounts/${accountId}`);
        }

        console.log('[reload account]', {
            accountId,
            accountMateId: trimmedAccountMateId,
            mapped,
            accountMateRow,
        });

        return { ok: true as const, accountId, accountMateId: trimmedAccountMateId, accountMateRow, mapped };
    } catch (err) {
        console.error('[reload account]', err);
        return {
            ok: false as const,
            error: err instanceof Error ? err.message : 'Failed to reload account',
        };
    }
}

export type AccountReloadRow = {
    id: number;
    accountMateId: string;
};

const accountHasAccountMateId = sql`nullif(trim(coalesce(${account.accountMateId}, '')), '') is not null`;
const accountMissingName = sql`nullif(trim(coalesce(${account.name}, '')), '') is null`;
const accountReloadBatchWhere = and(accountHasAccountMateId, accountMissingName);

export async function getAccountReloadBatch({
    offset = 0,
    limit = 200,
}: {
    offset?: number;
    limit?: number;
}): Promise<{ accounts: AccountReloadRow[]; total: number }> {
    const rows = await db
        .select({
            id: account.id,
            accountMateId: account.accountMateId,
        })
        .from(account)
        .where(accountReloadBatchWhere)
        .orderBy(asc(account.id))
        .limit(limit)
        .offset(offset);

    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(account).where(accountReloadBatchWhere);

    return {
        accounts: rows.map((row) => ({
            id: row.id,
            accountMateId: row.accountMateId!.trim(),
        })),
        total: Number(count ?? 0),
    };
}

export async function revalidateManageAccountsAfterBulkReload() {
    revalidatePath('/manage/accounts');
    revalidatePath('/shop');
}

/** Syncs linked wholesale account(s) from AccountMate when the user has an accountMateId. */
export async function syncUserAccountFromAccountMate(userId: number): Promise<void> {
    const keys = await getUserAccountLinkKeys(userId);
    if (!keys?.accountMateId) {
        return;
    }

    const linkedAccounts = await getUserAccounts(userId);
    const accountIds = new Set<number>(linkedAccounts.map((linkedAccount) => linkedAccount.id));

    if (accountIds.size === 0) {
        const [row] = await db
            .select({ id: account.id })
            .from(account)
            .where(eq(account.accountMateId, keys.accountMateId))
            .limit(1);
        if (row) {
            accountIds.add(row.id);
        }
    }

    for (const accountId of accountIds) {
        const result = await reloadAccountFromAccountMate(accountId, keys.accountMateId);
        if (!result.ok) {
            console.error('[sign-in account sync]', { userId, accountId, error: result.error });
            continue;
        }
        console.log('[sign-in account sync]', { userId, accountId, mapped: result.mapped });
    }
}

export async function getUserAccounts(userId: number) {
    const keys = await getUserAccountLinkKeys(userId);
    if (!keys) return [];

    const accounts = await db.select().from(account).where(accountLinkedToUserCondition(keys));

    const out: Account[] = [];
    for (const r of accounts) {
        out.push(await accountMapper(r));
    }
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
            menuId: account.menuId,
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

function normalizeShopUserId(userId: number): number {
    return userId;
}

async function getUserAccountLinkKeys(userId: number): Promise<{ email: string; idAsText: string; accountMateId: string | null } | null> {
    const uid = normalizeShopUserId(userId);
    if (!uid) return null;

    const [row] = await db
        .select({ userName: user.userName, accountMateId: user.accountMateId })
        .from(user)
        .where(eq(user.id, uid))
        .limit(1);
    if (!row) return null;

    const email = row.userName.trim().toLowerCase();
    if (!email) return null;

    const accountMateId = row.accountMateId?.trim() || null;
    return { email, idAsText: String(uid), accountMateId };
}

function accountLinkedToUserCondition(keys: { email: string; idAsText: string; accountMateId: string | null }) {
    const conditions = [
        sql`lower(trim(coalesce(${account.contactEmail}, ''))) = ${keys.email}`,
        eq(account.accountMateId, keys.idAsText),
        sql`lower(trim(coalesce(${account.accountMateId}, ''))) = ${keys.email}`,
    ];
    if (keys.accountMateId) {
        conditions.push(eq(account.accountMateId, keys.accountMateId));
    }
    return or(...conditions);
}

function userLinkedToAccountCondition(accountRow: { contactEmail: string | null; accountMateId: string | null }) {
    const contactEmail = (accountRow.contactEmail ?? '').trim().toLowerCase();
    const accountMateId = (accountRow.accountMateId ?? '').trim();
    const conditions = [];

    if (contactEmail) {
        conditions.push(sql`lower(trim(${user.userName})) = ${contactEmail}`);
    }
    if (accountMateId) {
        conditions.push(sql`${user.id}::text = ${accountMateId}`);
        conditions.push(sql`lower(trim(${user.userName})) = ${accountMateId.toLowerCase()}`);
        conditions.push(eq(user.accountMateId, accountMateId));
    }

    if (conditions.length === 0) {
        return null;
    }

    return or(...conditions);
}

function formatUserDisplayName(row: { firstName: string | null; lastName: string | null; userName: string }): string {
    const name = [row.firstName, row.lastName].filter(Boolean).join(' ').trim();
    return name || row.userName.trim();
}

/** Display name for the user linked to a wholesale account (name, else email). */
export async function getAccountOwnerUserDisplayName(accountId: number): Promise<string | null> {
    if (!Number.isFinite(accountId) || accountId <= 0) {
        return null;
    }

    const accountRow = await db.query.account.findFirst({
        where: eq(account.id, accountId),
        columns: { contactEmail: true, accountMateId: true },
    });
    if (!accountRow) {
        return null;
    }

    const linkCondition = userLinkedToAccountCondition(accountRow);
    if (!linkCondition) {
        return null;
    }

    const [owner] = await db
        .select({ firstName: user.firstName, lastName: user.lastName, userName: user.userName })
        .from(user)
        .where(linkCondition)
        .limit(1);

    if (!owner) {
        return null;
    }

    return formatUserDisplayName(owner);
}

export async function verifyUserOwnsAccount(userId: number, accountId: number): Promise<boolean> {
    const keys = await getUserAccountLinkKeys(userId);
    if (!keys) return false;

    const row = await db.query.account.findFirst({
        where: and(accountLinkedToUserCondition(keys), eq(account.id, accountId)),
        columns: { id: true },
    });
    return Boolean(row);
}

export async function accountExists(accountId: number): Promise<boolean> {
    if (!Number.isFinite(accountId) || accountId <= 0) {
        return false;
    }

    const row = await db.query.account.findFirst({
        where: eq(account.id, accountId),
        columns: { id: true },
    });
    return Boolean(row);
}

/** Admins may shop as any account; regular users only their linked accounts. */
export async function canAccessAccountForShop(userId: number, accountId: number, isAdmin: boolean): Promise<boolean> {
    if (isAdmin) {
        return accountExists(accountId);
    }
    return verifyUserOwnsAccount(userId, accountId);
}

function trimOrNull(value: unknown): string | null {
    if (value == null) {
        return null;
    }
    const trimmed = String(value).trim();
    return trimmed || null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readLegacyAccountId(row: any): number | null {
    const id = Number(row.Id ?? row.id ?? row.AccountId ?? row.accountId);
    return Number.isFinite(id) && id > 0 ? id : null;
}

function sqlTextValue(value: string | null | undefined): string {
    if (value == null) {
        return 'NULL';
    }
    return `'${value.replace(/'/g, "''")}'`;
}

function sqlBoolValue(value: boolean): string {
    return value ? 'true' : 'false';
}

function sqlIntValue(value: number): string {
    return Number.isFinite(value) ? String(Math.trunc(value)) : '0';
}

async function bulkUpdateAccountsFromLegacy(
    updates: Array<{ id: number; fields: ReturnType<typeof mapLegacyAccountFields> }>,
) {
    if (updates.length === 0) {
        return;
    }

    const caseText = (pick: (fields: ReturnType<typeof mapLegacyAccountFields>) => string | null) =>
        updates.map(({ id, fields }) => `WHEN ${id} THEN ${sqlTextValue(pick(fields))}`).join(' ');
    const caseBool = (pick: (fields: ReturnType<typeof mapLegacyAccountFields>) => boolean) =>
        updates.map(({ id, fields }) => `WHEN ${id} THEN ${sqlBoolValue(pick(fields))}`).join(' ');
    const caseInt = (pick: (fields: ReturnType<typeof mapLegacyAccountFields>) => number) =>
        updates.map(({ id, fields }) => `WHEN ${id} THEN ${sqlIntValue(pick(fields))}`).join(' ');
    const idList = updates.map(({ id }) => id).join(', ');

    await db.execute(
        sql.raw(`
            UPDATE account
            SET
                "accountMateId" = CASE id ${caseText((fields) => fields.accountMateId)} END,
                "isSkipTax" = CASE id ${caseBool((fields) => fields.isSkipTax)} END,
                "isSkipShipping" = CASE id ${caseBool((fields) => fields.isSkipShipping)} END,
                "isFreeGroundShipping" = CASE id ${caseBool((fields) => fields.isFreeGroundShipping)} END,
                terms = CASE id ${caseText((fields) => fields.terms)} END,
                "isTerms" = CASE id ${caseBool((fields) => fields.isTerms)} END,
                name = CASE id ${caseText((fields) => fields.name)} END,
                "contactFirstName" = CASE id ${caseText((fields) => fields.contactFirstName)} END,
                "contactLastName" = CASE id ${caseText((fields) => fields.contactLastName)} END,
                "contactPhone" = CASE id ${caseText((fields) => fields.contactPhone)} END,
                "contactAddress1" = CASE id ${caseText((fields) => fields.contactAddress1)} END,
                "contactAddress2" = CASE id ${caseText((fields) => fields.contactAddress2)} END,
                "contactCity" = CASE id ${caseText((fields) => fields.contactCity)} END,
                "contactState" = CASE id ${caseText((fields) => fields.contactState)} END,
                "contactZipCode" = CASE id ${caseText((fields) => fields.contactZipCode)} END,
                "contactEmail" = CASE id ${caseText((fields) => fields.contactEmail)} END,
                "menuId" = CASE id ${caseInt((fields) => fields.menuId)} END
            WHERE id IN (${idList})
        `),
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readLegacyOldAccountId(row: any): string | null {
    const raw = row.OldAccountId ?? row.oldAccountId;
    if (raw == null) {
        return null;
    }
    const trimmed = String(raw).trim();
    return trimmed || null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readLegacyUsername(row: any): string | null {
    return trimOrNull(row.UserName ?? row.userName);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveLegacyAccountMateId(row: any): string | null {
    return readLegacyOldAccountId(row) ?? readLegacyUsername(row);
}

function readLegacySignInLocationId(row: any): number | null {
    const raw = row.SignInLocation ?? row.signInLocation ?? row.SignInLocationId ?? row.signInLocationId;
    if (raw == null) {
        return null;
    }
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapLegacyAccountFields(row: any) {
    const signInLocationId = readLegacySignInLocationId(row);

    return {
        accountMateId: resolveLegacyAccountMateId(row),
        isSkipTax: Boolean(row.IsSkipTax ?? row.isSkipTax),
        isSkipShipping: Boolean(row.IsSkipShipping ?? row.isSkipShipping),
        isFreeGroundShipping: Boolean(row.IsFreeGround ?? row.IsFreeGroundShipping ?? row.isFreeGroundShipping),
        terms: trimOrNull(row.Terms ?? row.terms),
        isTerms: Boolean(row.IsTerms ?? row.isTerms),
        name: trimOrNull(row.Name ?? row.CompanyName ?? row.name),
        contactFirstName: trimOrNull(row.ContactFirstName ?? row.FirstName ?? row.contactFirstName),
        contactLastName: trimOrNull(row.ContactLastName ?? row.LastName ?? row.contactLastName),
        contactPhone: trimOrNull(row.Phone ?? row.ContactPhone ?? row.contactPhone),
        contactAddress1: trimOrNull(row.Address1 ?? row.ContactAddress1 ?? row.contactAddress1),
        contactAddress2: trimOrNull(row.Address2 ?? row.ContactAddress2 ?? row.contactAddress2),
        contactCity: trimOrNull(row.City ?? row.ContactCity ?? row.contactCity),
        contactState: trimOrNull(row.State ?? row.ContactState ?? row.contactState),
        contactZipCode: trimOrNull(row.ZipCode ?? row.ContactZipCode ?? row.Zip ?? row.contactZipCode),
        contactEmail: trimOrNull(row.EmailAddress ?? row.ContactEmail ?? row.contactEmail)?.toLowerCase() ?? null,
        menuId: signInLocationId == null ? 0 : mapSignInLocationIdToMenuId(signInLocationId),
    };
}

export type AccountSyncResult = {
    fetched: number;
    inserted: number;
    updated: number;
    skipped: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function syncLegacyAccountRowsToAccount(rows: any[]): Promise<AccountSyncResult> {
    const existingAccounts = await db.select({ id: account.id }).from(account);
    const existingAccountIds = new Set(existingAccounts.map((row) => row.id));

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    let processed = 0;
    const pendingUpdates: Array<{ id: number; fields: ReturnType<typeof mapLegacyAccountFields> }> = [];
    const updateChunkSize = 100;

    function logProgress() {
        console.log(
            `Account sync: processed ${processed}/${rows.length} (${updated} updated, ${inserted} inserted, ${skipped} skipped)`,
        );
    }

    async function flushUpdates() {
        if (pendingUpdates.length === 0) {
            return;
        }
        const batchSize = pendingUpdates.length;
        await bulkUpdateAccountsFromLegacy(pendingUpdates);
        updated += batchSize;
        pendingUpdates.length = 0;
        console.log(
            `Account sync: updated ${batchSize} accounts (${updated} updated, ${inserted} inserted, ${skipped} skipped, ${processed}/${rows.length} processed)`,
        );
    }

    console.log(`Account sync: starting ${rows.length} legacy AccountOld rows`);

    for (const row of rows) {
        processed += 1;
        const id = readLegacyAccountId(row);
        if (id == null) {
            skipped += 1;
            if (processed % 100 === 0) logProgress();
            continue;
        }

        const fields = mapLegacyAccountFields(row);

        if (existingAccountIds.has(id)) {
            pendingUpdates.push({ id, fields });
            if (pendingUpdates.length >= updateChunkSize) {
                await flushUpdates();
            } else if (processed % 100 === 0) {
                logProgress();
            }
            continue;
        }

        await flushUpdates();
        await db.insert(account).values({
            id,
            ...fields,
        });
        existingAccountIds.add(id);
        inserted += 1;

        if (processed % 100 === 0) logProgress();
    }

    await flushUpdates();

    console.log(
        `Account sync: complete (${updated} updated, ${inserted} inserted, ${skipped} skipped, ${rows.length} fetched)`,
    );

    return {
        fetched: rows.length,
        inserted,
        updated,
        skipped,
    };
}

export async function syncAccountsFromLegacy(): Promise<AccountSyncResult> {
    try {
        const rows = await getAccountOldFromSweetshopOld();
        return syncLegacyAccountRowsToAccount(rows);
    } catch (error) {
        console.error('Error syncing accounts from legacy AccountOld:', error);
        throw error instanceof Error ? error : new Error('Failed to sync accounts from legacy AccountOld');
    }
}
