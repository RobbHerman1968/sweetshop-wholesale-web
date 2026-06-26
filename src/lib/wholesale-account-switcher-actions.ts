'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth';
import { and, asc, eq, ilike, inArray, isNotNull, or, sql } from 'drizzle-orm';
import { authOptions } from '@/auth';
import { db } from '@/lib/db-pg';
import { getShopProductGroupIdsForUserAccount, getUserAccounts, verifyUserOwnsAccount, accountExists, canAccessAccountForShop } from '@/lib/db-pg/actions/account';
import { account, accountGroup, product, productGroupProduct, user } from '@/lib/drizzle/schema';
import { WHOLESALE_ADMIN_SHOP_AS_COOKIE, WHOLESALE_SELECTED_ACCOUNT_COOKIE } from '@/lib/wholesale-account-cookie';
import { parseUserId } from '@/lib/user-id';

export type WholesaleAccountSwitcherOption = {
    id: number;
    displayName: string;
};

function wholesaleAccountCookieOptions() {
    return {
        path: '/',
        maxAge: 60 * 60 * 24 * 400,
        sameSite: 'lax' as const,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
    };
}

async function resolveIsAdminShopAs(
    userId: number,
    isAdmin: boolean,
    selectedAccountId: number | null,
    adminShopAsFlag: boolean,
): Promise<boolean> {
    if (!isAdmin || selectedAccountId == null) {
        return false;
    }
    if (adminShopAsFlag) {
        return true;
    }
    return !(await verifyUserOwnsAccount(userId, selectedAccountId));
}

function formatAccountDisplayName(
    r: { id: number; name: string | null; accountMateId: string | null },
    fallbackAccountMateId?: string | null,
): string {
    const n = (r.name ?? '').trim();
    if (n) return n;
    const m = (r.accountMateId ?? '').trim();
    if (m) return m;
    const fallback = fallbackAccountMateId?.trim();
    if (fallback) return fallback;
    return `Account ${r.id}`;
}

type AccountLabelRow = { id: number; name: string | null; accountMateId: string | null };

async function resolveSelectedAccountDisplayName(
    selectedAccountId: number | null,
    rows: AccountLabelRow[],
    fallbackAccountMateId?: string | null,
): Promise<string | null> {
    if (selectedAccountId == null) return null;

    const row = rows.find((r) => r.id === selectedAccountId);
    if (row) {
        return formatAccountDisplayName(row, fallbackAccountMateId);
    }

    const [fromDb] = await db
        .select({ id: account.id, name: account.name, accountMateId: account.accountMateId })
        .from(account)
        .where(eq(account.id, selectedAccountId))
        .limit(1);

    if (fromDb) {
        return formatAccountDisplayName(fromDb, fallbackAccountMateId);
    }

    const fallback = fallbackAccountMateId?.trim();
    return fallback || `Account ${selectedAccountId}`;
}

function resolveSelectedAccountFromCookie(
    sortedAccountIds: number[],
    cookieRaw: string | undefined,
): { selectedAccountId: number | null; shouldPersistCookie: boolean } {
    if (sortedAccountIds.length === 0) {
        return { selectedAccountId: null, shouldPersistCookie: false };
    }
    const idSet = new Set(sortedAccountIds);
    const parsed = cookieRaw ? Number.parseInt(cookieRaw, 10) : NaN;
    const cookieValid = Number.isFinite(parsed) && idSet.has(parsed);
    return {
        selectedAccountId: cookieValid ? parsed : sortedAccountIds[0],
        shouldPersistCookie: !cookieValid,
    };
}

async function getWholesaleSelectionCore(
    userId: number,
    isAdmin: boolean,
): Promise<{
    accounts: WholesaleAccountSwitcherOption[];
    selectedAccountId: number | null;
    selectedAccountDisplayName: string | null;
    shouldPersistCookie: boolean;
    isAdminShopAs: boolean;
    canShopAsAnyAccount: boolean;
    hasOwnedAccounts: boolean;
}> {
    const uid = userId;
    if (!uid) {
        return {
            accounts: [],
            selectedAccountId: null,
            selectedAccountDisplayName: null,
            shouldPersistCookie: false,
            isAdminShopAs: false,
            canShopAsAnyAccount: false,
            hasOwnedAccounts: false,
        };
    }

    const [userRow] = await db
        .select({ accountMateId: user.accountMateId })
        .from(user)
        .where(eq(user.id, uid))
        .limit(1);
    const userAccountMateId = userRow?.accountMateId?.trim() || null;

    const linkedAccounts = await getUserAccounts(userId);
    const hasOwnedAccounts = linkedAccounts.length > 0;
    const cookieStore = await cookies();
    const raw = cookieStore.get(WHOLESALE_SELECTED_ACCOUNT_COOKIE)?.value;
    const adminShopAsFlag = cookieStore.get(WHOLESALE_ADMIN_SHOP_AS_COOKIE)?.value === '1';
    const parsedCookieId = raw ? Number.parseInt(raw, 10) : NaN;

    type AccountRow = AccountLabelRow;
    let rows: AccountRow[] = linkedAccounts
        .map((r) => ({
            id: r.id,
            name: r.name?.trim() || null,
            accountMateId: r.accountMateId?.trim() || null,
        }))
        .sort((a, b) => {
            const nameCmp = (a.name ?? '').localeCompare(b.name ?? '');
            return nameCmp !== 0 ? nameCmp : a.id - b.id;
        });

    if (isAdmin && Number.isFinite(parsedCookieId) && parsedCookieId > 0 && !rows.some((r) => r.id === parsedCookieId)) {
        const [impersonated] = await db
            .select({ id: account.id, name: account.name, accountMateId: account.accountMateId })
            .from(account)
            .where(eq(account.id, parsedCookieId))
            .limit(1);
        if (impersonated) {
            rows = [...rows, impersonated].sort((a, b) => {
                const nameCmp = (a.name ?? '').localeCompare(b.name ?? '');
                return nameCmp !== 0 ? nameCmp : a.id - b.id;
            });
        }
    }

    if (rows.length === 0 && !(isAdmin && Number.isFinite(parsedCookieId) && parsedCookieId > 0)) {
        return {
            accounts: [],
            selectedAccountId: null,
            selectedAccountDisplayName: userAccountMateId,
            shouldPersistCookie: false,
            isAdminShopAs: false,
            canShopAsAnyAccount: isAdmin,
            hasOwnedAccounts,
        };
    }

    const accounts: WholesaleAccountSwitcherOption[] = rows.map((r) => ({
        id: r.id,
        displayName: formatAccountDisplayName(r, userAccountMateId),
    }));

    const sortedAccountIds = rows.map((r) => r.id);
    let { selectedAccountId, shouldPersistCookie } = resolveSelectedAccountFromCookie(sortedAccountIds, raw);

    if (isAdmin && selectedAccountId == null && Number.isFinite(parsedCookieId) && parsedCookieId > 0) {
        const exists = await accountExists(parsedCookieId);
        if (exists) {
            selectedAccountId = parsedCookieId;
            shouldPersistCookie = true;
            if (!accounts.some((a) => a.id === parsedCookieId)) {
                const [impersonated] = await db
                    .select({ id: account.id, name: account.name, accountMateId: account.accountMateId })
                    .from(account)
                    .where(eq(account.id, parsedCookieId))
                    .limit(1);
                if (impersonated) {
                    accounts.push({ id: impersonated.id, displayName: formatAccountDisplayName(impersonated, userAccountMateId) });
                }
            }
        }
    }

    const isAdminShopAs = await resolveIsAdminShopAs(userId, isAdmin, selectedAccountId, adminShopAsFlag);
    const selectedAccountDisplayName = await resolveSelectedAccountDisplayName(
        selectedAccountId,
        rows,
        userAccountMateId,
    );

    return {
        accounts,
        selectedAccountId,
        selectedAccountDisplayName,
        shouldPersistCookie,
        isAdminShopAs,
        canShopAsAnyAccount: isAdmin,
        hasOwnedAccounts,
    };
}

/** Effective wholesale account for shop catalog: valid cookie, else first account (by name, then id). */
export async function getEffectiveWholesaleAccountIdForShopCatalog(userId: number, isAdmin = false): Promise<number | null> {
    const { selectedAccountId } = await getWholesaleSelectionCore(userId, isAdmin);
    return selectedAccountId;
}

/** Clear shop-as / selected account cookies (call on sign-in and sign-out). */
export async function clearWholesaleShopAsSelection(): Promise<{ ok: true }> {
    const cookieStore = await cookies();
    cookieStore.delete(WHOLESALE_SELECTED_ACCOUNT_COOKIE);
    cookieStore.delete(WHOLESALE_ADMIN_SHOP_AS_COOKIE);
    revalidatePath('/shop');
    return { ok: true };
}

/** Accounts for the signed-in user; selection is cookie when valid, otherwise first account. */
export async function getWholesaleAccountSwitcherState(): Promise<{
    accounts: WholesaleAccountSwitcherOption[];
    selectedAccountId: number | null;
    selectedAccountDisplayName: string | null;
    shouldPersistCookie: boolean;
    isAdminShopAs: boolean;
    canShopAsAnyAccount: boolean;
    hasOwnedAccounts: boolean;
}> {
    const session = await getServerSession(authOptions);
    const userId = parseUserId(session?.user?.id);
    const isAdmin = session?.user?.isAdmin ?? false;
    if (userId == null) {
        return {
            accounts: [],
            selectedAccountId: null,
            selectedAccountDisplayName: null,
            shouldPersistCookie: false,
            isAdminShopAs: false,
            canShopAsAnyAccount: false,
            hasOwnedAccounts: false,
        };
    }

    return getWholesaleSelectionCore(userId, isAdmin);
}

export async function setWholesaleSelectedAccount(
    accountId: number | null,
    options?: { adminShopAs?: boolean },
): Promise<{ ok: boolean }> {
    const session = await getServerSession(authOptions);
    const userId = parseUserId(session?.user?.id);
    const isAdmin = session?.user?.isAdmin ?? false;
    if (userId == null) {
        return { ok: false };
    }

    const cookieStore = await cookies();
    const cookieOptions = wholesaleAccountCookieOptions();

    if (accountId === null) {
        if (!isAdmin) {
            return { ok: false };
        }
        cookieStore.delete(WHOLESALE_SELECTED_ACCOUNT_COOKIE);
        cookieStore.delete(WHOLESALE_ADMIN_SHOP_AS_COOKIE);
        revalidatePath('/shop');
        return { ok: true };
    }

    const ok = await canAccessAccountForShop(userId, accountId, isAdmin);
    if (!ok) {
        return { ok: false };
    }

    if (!isAdmin) {
        const raw = cookieStore.get(WHOLESALE_SELECTED_ACCOUNT_COOKIE)?.value;
        const parsed = raw ? Number.parseInt(raw, 10) : NaN;
        const hasValidCookie = Number.isFinite(parsed) && parsed > 0;
        if (hasValidCookie && parsed !== accountId) {
            return { ok: false };
        }
    }

    cookieStore.set(WHOLESALE_SELECTED_ACCOUNT_COOKIE, String(accountId), cookieOptions);

    if (isAdmin) {
        const ownsAccount = await verifyUserOwnsAccount(userId, accountId);
        if (options?.adminShopAs === true || !ownsAccount) {
            cookieStore.set(WHOLESALE_ADMIN_SHOP_AS_COOKIE, '1', cookieOptions);
        } else {
            cookieStore.delete(WHOLESALE_ADMIN_SHOP_AS_COOKIE);
        }
    } else {
        cookieStore.delete(WHOLESALE_ADMIN_SHOP_AS_COOKIE);
    }

    revalidatePath('/shop');
    return { ok: true };
}

/** Admin-only: stop shopping as another account and return to the admin's own linked account (or clear selection). */
export async function resetAdminShopAs(): Promise<{ ok: boolean }> {
    const session = await getServerSession(authOptions);
    const userId = parseUserId(session?.user?.id);
    const isAdmin = session?.user?.isAdmin ?? false;
    if (userId == null || !isAdmin) {
        return { ok: false };
    }

    const cookieStore = await cookies();
    const raw = cookieStore.get(WHOLESALE_SELECTED_ACCOUNT_COOKIE)?.value;
    const parsedCookieId = raw ? Number.parseInt(raw, 10) : NaN;
    const adminShopAsFlag = cookieStore.get(WHOLESALE_ADMIN_SHOP_AS_COOKIE)?.value === '1';

    let inShopAsMode = adminShopAsFlag;
    if (!inShopAsMode && Number.isFinite(parsedCookieId) && parsedCookieId > 0) {
        inShopAsMode = !(await verifyUserOwnsAccount(userId, parsedCookieId));
    }

    if (!inShopAsMode) {
        return { ok: true };
    }

    cookieStore.delete(WHOLESALE_ADMIN_SHOP_AS_COOKIE);

    const linkedAccounts = await getUserAccounts(userId);
    if (linkedAccounts.length > 0) {
        const sorted = [...linkedAccounts].sort((a, b) => {
            const nameCmp = (a.name ?? '').localeCompare(b.name ?? '');
            return nameCmp !== 0 ? nameCmp : a.id - b.id;
        });
        cookieStore.set(WHOLESALE_SELECTED_ACCOUNT_COOKIE, String(sorted[0].id), wholesaleAccountCookieOptions());
    } else {
        cookieStore.delete(WHOLESALE_SELECTED_ACCOUNT_COOKIE);
    }

    revalidatePath('/shop');
    return { ok: true };
}

const ACCOUNT_CHANGE_DEBUG_PRODUCT_LIMIT = 50;

export type WholesaleAccountCatalogDebug = {
    accountId: number;
    /** Rows in `accountGroup` for this account (links account → productGroup). */
    accountGroupLinks: Array<{ accountGroupId: number; productGroupId: number }>;
    /** Distinct product group ids used for this account’s shop scope. */
    productGroupIds: number[];
    /** Active products in those groups (same rule as shop grid), first N rows. */
    activeProductsSample: Array<{ id: number; name: string | null; itemNumber: string | null }>;
    activeProductsShown: number;
    /** Total active products across those groups (may exceed sample size). */
    activeProductTotal: number;
};

/** For debugging: accountGroup rows and products tied via productGroupProduct (requires ownership). */
export async function getWholesaleAccountCatalogDebug(
    accountId: number,
): Promise<{ ok: false } | ({ ok: true } & WholesaleAccountCatalogDebug)> {
    const session = await getServerSession(authOptions);
    const userId = parseUserId(session?.user?.id);
    const isAdmin = session?.user?.isAdmin ?? false;
    if (userId == null) return { ok: false };

    const canAccess = await canAccessAccountForShop(userId, accountId, isAdmin);
    if (!canAccess) return { ok: false };

    const linkRows = await db
        .select({
            accountGroupId: accountGroup.id,
            productGroupId: accountGroup.productGroupId,
        })
        .from(accountGroup)
        .where(and(eq(accountGroup.accountId, accountId), isNotNull(accountGroup.accountId)));

    const accountGroupLinks = linkRows.map((r) => ({
        accountGroupId: r.accountGroupId,
        productGroupId: r.productGroupId,
    }));

    const productGroupIds = await getShopProductGroupIdsForUserAccount(userId, accountId, isAdmin);

    let activeProductsSample: WholesaleAccountCatalogDebug['activeProductsSample'] = [];
    let activeProductTotal = 0;

    if (productGroupIds.length > 0) {
        const [countRow] = await db
            .select({
                total: sql<number>`cast(count(distinct ${product.id}) as int)`,
            })
            .from(product)
            .innerJoin(productGroupProduct, eq(productGroupProduct.productId, product.id))
            .where(and(inArray(productGroupProduct.productGroupId, productGroupIds), eq(product.isActive, true)));

        activeProductTotal = Number(countRow?.total ?? 0);

        activeProductsSample = await db
            .selectDistinct({
                id: product.id,
                name: product.name,
                itemNumber: product.itemNumber,
            })
            .from(product)
            .innerJoin(productGroupProduct, eq(productGroupProduct.productId, product.id))
            .where(and(inArray(productGroupProduct.productGroupId, productGroupIds), eq(product.isActive, true)))
            .orderBy(asc(product.name))
            .limit(ACCOUNT_CHANGE_DEBUG_PRODUCT_LIMIT);
    }

    return {
        ok: true,
        accountId,
        accountGroupLinks,
        productGroupIds,
        activeProductsSample,
        activeProductsShown: activeProductsSample.length,
        activeProductTotal,
    };
}

const ADMIN_ACCOUNT_SEARCH_LIMIT = 25;

/** Admin-only: search accounts by name or AccountMate ID for shop-as picker. */
export async function searchWholesaleAccountsForAdmin(query: string): Promise<WholesaleAccountSwitcherOption[]> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
        return [];
    }

    const trimmed = query.trim();
    if (trimmed.length < 2) {
        return [];
    }

    const filter = `%${trimmed}%`;
    const rows = await db
        .select({ id: account.id, name: account.name, accountMateId: account.accountMateId })
        .from(account)
        .where(or(ilike(account.name, filter), ilike(account.accountMateId, filter)))
        .orderBy(asc(account.name))
        .limit(ADMIN_ACCOUNT_SEARCH_LIMIT);

    return rows.map((r) => ({
        id: r.id,
        displayName: formatAccountDisplayName(r),
    }));
}
