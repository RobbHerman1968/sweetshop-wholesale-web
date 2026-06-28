'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { asc, eq, ilike, or } from 'drizzle-orm';
import { authOptions } from '@/auth';
import { db } from '@/lib/db-pg';
import { getUserAccounts, verifyUserOwnsAccount, accountExists, canAccessAccountForShop } from '@/lib/db-pg/actions/account';
import { account, user } from '@/lib/drizzle/schema';
import { WHOLESALE_SELECTED_ACCOUNT_COOKIE, WHOLESALE_ADMIN_SHOP_AS_COOKIE } from '@/lib/wholesale-account-cookie';
import { parseUserId } from '@/lib/user-id';
import { DEFAULT_SHIPPING_LEAD_TIME, getShippingLeadTimesForAccounts } from '@/lib/account-shipping-lead-time';

export type WholesaleAccountSwitcherOption = {
    id: number;
    displayName: string;
    shippingLeadTime: number;
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

function revalidateShopAccountPaths() {
    revalidatePath('/shop', 'layout');
    revalidatePath('/cart', 'layout');
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

function accountMateIdsMatch(a: string | null | undefined, b: string | null | undefined): boolean {
    const left = (a ?? '').trim().toUpperCase();
    const right = (b ?? '').trim().toUpperCase();
    return left.length > 0 && left === right;
}

function sortAccountLabelRows(rows: AccountLabelRow[]): AccountLabelRow[] {
    return [...rows].sort((a, b) => {
        const nameCmp = (a.name ?? '').localeCompare(b.name ?? '');
        return nameCmp !== 0 ? nameCmp : a.id - b.id;
    });
}

async function findAccountRowByAccountMateId(accountMateId: string): Promise<AccountLabelRow | null> {
    const trimmed = accountMateId.trim();
    if (!trimmed) {
        return null;
    }

    const [row] = await db
        .select({ id: account.id, name: account.name, accountMateId: account.accountMateId })
        .from(account)
        .where(eq(account.accountMateId, trimmed))
        .limit(1);

    return row ?? null;
}

async function ensureUserAccountMateAccountInRows(
    rows: AccountLabelRow[],
    userAccountMateId: string | null,
): Promise<AccountLabelRow[]> {
    if (!userAccountMateId || rows.some((row) => accountMateIdsMatch(row.accountMateId, userAccountMateId))) {
        return rows;
    }

    const matched = await findAccountRowByAccountMateId(userAccountMateId);
    if (!matched) {
        return rows;
    }

    return sortAccountLabelRows([...rows, matched]);
}

function resolveSelectedAccountFromCookie(
    sortedAccountIds: number[],
    cookieRaw: string | undefined,
    rows: AccountLabelRow[],
    userAccountMateId: string | null,
): { selectedAccountId: number | null; shouldPersistCookie: boolean } {
    if (sortedAccountIds.length === 0) {
        return { selectedAccountId: null, shouldPersistCookie: false };
    }

    const idSet = new Set(sortedAccountIds);
    const parsed = cookieRaw ? Number.parseInt(cookieRaw, 10) : NaN;
    const cookieValid = Number.isFinite(parsed) && idSet.has(parsed);

    if (cookieValid) {
        return { selectedAccountId: parsed, shouldPersistCookie: false };
    }

    if (userAccountMateId) {
        const preferred = rows.find((row) => accountMateIdsMatch(row.accountMateId, userAccountMateId));
        if (preferred) {
            return { selectedAccountId: preferred.id, shouldPersistCookie: true };
        }
    }

    return {
        selectedAccountId: sortedAccountIds[0],
        shouldPersistCookie: true,
    };
}

async function getWholesaleSelectionCore(
    userId: number,
    isAdmin: boolean,
): Promise<{
    accounts: WholesaleAccountSwitcherOption[];
    selectedAccountId: number | null;
    selectedAccountDisplayName: string | null;
    selectedAccountShippingLeadTime: number | null;
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
            selectedAccountShippingLeadTime: null,
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
    let hasOwnedAccounts = linkedAccounts.length > 0;
    const cookieStore = await cookies();
    const raw = cookieStore.get(WHOLESALE_SELECTED_ACCOUNT_COOKIE)?.value;
    const adminShopAsFlag = cookieStore.get(WHOLESALE_ADMIN_SHOP_AS_COOKIE)?.value === '1';
    const parsedCookieId = raw ? Number.parseInt(raw, 10) : NaN;

    type AccountRow = AccountLabelRow;
    let rows: AccountRow[] = sortAccountLabelRows(
        linkedAccounts.map((r) => ({
            id: r.id,
            name: r.name?.trim() || null,
            accountMateId: r.accountMateId?.trim() || null,
        })),
    );

    rows = await ensureUserAccountMateAccountInRows(rows, userAccountMateId);

    if (isAdmin && Number.isFinite(parsedCookieId) && parsedCookieId > 0 && !rows.some((r) => r.id === parsedCookieId)) {
        const [impersonated] = await db
            .select({ id: account.id, name: account.name, accountMateId: account.accountMateId })
            .from(account)
            .where(eq(account.id, parsedCookieId))
            .limit(1);
        if (impersonated) {
            rows = sortAccountLabelRows([...rows, impersonated]);
        }
    }

    const hasAccountMateLinkedAccount =
        userAccountMateId != null && rows.some((row) => accountMateIdsMatch(row.accountMateId, userAccountMateId));
    if (!hasOwnedAccounts && hasAccountMateLinkedAccount) {
        hasOwnedAccounts = true;
    }

    if (rows.length === 0 && !(isAdmin && Number.isFinite(parsedCookieId) && parsedCookieId > 0)) {
        return {
            accounts: [],
            selectedAccountId: null,
            selectedAccountDisplayName: userAccountMateId,
            selectedAccountShippingLeadTime: null,
            shouldPersistCookie: false,
            isAdminShopAs: false,
            canShopAsAnyAccount: isAdmin,
            hasOwnedAccounts,
        };
    }

    const sortedAccountIds = rows.map((r) => r.id);
    let { selectedAccountId, shouldPersistCookie } = resolveSelectedAccountFromCookie(
        sortedAccountIds,
        raw,
        rows,
        userAccountMateId,
    );

    const accountIdsForLeadTime = new Set(sortedAccountIds);

    if (isAdmin && selectedAccountId == null && Number.isFinite(parsedCookieId) && parsedCookieId > 0) {
        accountIdsForLeadTime.add(parsedCookieId);
    }

    const shippingLeadTimesByAccountId = await getShippingLeadTimesForAccounts([...accountIdsForLeadTime]);

    const accounts: WholesaleAccountSwitcherOption[] = rows.map((r) => ({
        id: r.id,
        displayName: formatAccountDisplayName(r, userAccountMateId),
        shippingLeadTime: shippingLeadTimesByAccountId.get(r.id) ?? DEFAULT_SHIPPING_LEAD_TIME,
    }));

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
                    accounts.push({
                        id: impersonated.id,
                        displayName: formatAccountDisplayName(impersonated, userAccountMateId),
                        shippingLeadTime: shippingLeadTimesByAccountId.get(impersonated.id) ?? DEFAULT_SHIPPING_LEAD_TIME,
                    });
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
    const selectedAccountShippingLeadTime =
        selectedAccountId == null
            ? null
            : shippingLeadTimesByAccountId.get(selectedAccountId) ?? DEFAULT_SHIPPING_LEAD_TIME;

    return {
        accounts,
        selectedAccountId,
        selectedAccountDisplayName,
        selectedAccountShippingLeadTime,
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

/**
 * Selected wholesale account for shopping menu resolution only.
 * Uses a persisted selection cookie — no auto-pick fallback (first account / AccountMate match).
 */
export async function getWholesaleSelectedAccountIdForShoppingMenu(
    userId: number,
    isAdmin = false,
): Promise<number | null> {
    const { selectedAccountId, shouldPersistCookie } = await getWholesaleSelectionCore(userId, isAdmin);
    if (selectedAccountId == null || shouldPersistCookie) {
        return null;
    }
    return selectedAccountId;
}

/** Clear shop-as / selected account cookies (call on sign-in and sign-out). */
export async function clearWholesaleShopAsSelection(): Promise<{ ok: true }> {
    const cookieStore = await cookies();
    cookieStore.delete(WHOLESALE_SELECTED_ACCOUNT_COOKIE);
    cookieStore.delete(WHOLESALE_ADMIN_SHOP_AS_COOKIE);
    revalidateShopAccountPaths();
    return { ok: true };
}

/** Accounts for the signed-in user; selection is cookie when valid, otherwise first account. */
export async function getWholesaleAccountSwitcherState(): Promise<{
    accounts: WholesaleAccountSwitcherOption[];
    selectedAccountId: number | null;
    selectedAccountDisplayName: string | null;
    selectedAccountShippingLeadTime: number | null;
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
            selectedAccountShippingLeadTime: null,
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
    options?: { adminShopAs?: boolean; redirectToShop?: boolean },
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
        revalidateShopAccountPaths();
        return { ok: true };
    }

    const ok = await canAccessAccountForShop(userId, accountId, isAdmin);
    if (!ok) {
        return { ok: false };
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

    revalidateShopAccountPaths();

    if (options?.redirectToShop) {
        redirect('/shop');
    }

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

    revalidateShopAccountPaths();
    return { ok: true };
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

    const shippingLeadTimesByAccountId = await getShippingLeadTimesForAccounts(rows.map((row) => row.id));

    return rows.map((r) => ({
        id: r.id,
        displayName: formatAccountDisplayName(r),
        shippingLeadTime: shippingLeadTimesByAccountId.get(r.id) ?? DEFAULT_SHIPPING_LEAD_TIME,
    }));
}
