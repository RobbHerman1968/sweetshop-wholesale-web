'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { and, asc, eq, ilike, or, sql } from 'drizzle-orm';
import { authOptions } from '@/auth';
import { db } from '@/lib/db-pg';
import {
    getUserAccounts,
    verifyUserOwnsAccount,
    canAccessAccountForShop,
    reloadAccountFromAccountMate,
} from '@/lib/db-pg/actions/account';
import { account, user } from '@/lib/drizzle/schema';
import { WHOLESALE_SELECTED_ACCOUNT_COOKIE, WHOLESALE_ADMIN_SHOP_AS_COOKIE } from '@/lib/wholesale-account-cookie';
import { parseUserId } from '@/lib/user-id';
import { DEFAULT_SHIPPING_LEAD_TIME, getShippingLeadTimesForAccounts } from '@/lib/account-shipping-lead-time';
import { parseAccountMateId } from '@/lib/wholesale-api';

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
    const m = (r.accountMateId ?? '').trim() || fallbackAccountMateId?.trim() || '';
    if (n && m) return `${n} (${m})`;
    if (n) return n;
    if (m) return m;
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
    const parsed = parseAccountMateId(accountMateId);
    if (!parsed) {
        return null;
    }

    const [row] = await db
        .select({ id: account.id, name: account.name, accountMateId: account.accountMateId })
        .from(account)
        .where(and(sql`lower(trim(coalesce(${account.accountMateId}, ''))) = ${parsed.toLowerCase()}`, eq(account.isActive, true)))
        .orderBy(asc(account.id))
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

function findUserAccountMateDefault(
    rows: AccountLabelRow[],
    userAccountMateId: string | null,
): AccountLabelRow | null {
    if (!userAccountMateId) {
        return null;
    }
    return rows.find((row) => accountMateIdsMatch(row.accountMateId, userAccountMateId)) ?? null;
}

/**
 * Selection rules:
 * - Explicit cookie selection wins when it points at a selectable account.
 * - Admin shop-as keeps impersonated (non-owned) accounts in the selectable list.
 * - Otherwise default = account whose accountMateId matches user.accountMateId, else first owned / cleared.
 */
function resolveSelectedAccountFromCookie(
    sortedAccountIds: number[],
    cookieRaw: string | undefined,
    rows: AccountLabelRow[],
    userAccountMateId: string | null,
    options: { isAdmin: boolean; ownedAccountIds: number[]; adminShopAsFlag: boolean },
): { selectedAccountId: number | null; shouldPersistCookie: boolean; shouldClearCookie: boolean } {
    const accountMateDefault = findUserAccountMateDefault(rows, userAccountMateId);
    const idSet = new Set(sortedAccountIds);
    const ownedIdSet = new Set(options.ownedAccountIds);
    const parsed = cookieRaw ? Number.parseInt(cookieRaw, 10) : NaN;
    const cookieValid = Number.isFinite(parsed) && idSet.has(parsed);

    // Keep an explicit cookie pick for admins and non-admins alike.
    // (Admin shop-as only controls whether non-owned accounts are selectable.)
    if (cookieValid) {
        return { selectedAccountId: parsed, shouldPersistCookie: false, shouldClearCookie: false };
    }

    // Default: user.accountMateId → matching account row, else cleared.
    if (accountMateDefault) {
        return {
            selectedAccountId: accountMateDefault.id,
            shouldPersistCookie: true,
            shouldClearCookie: false,
        };
    }

    if (options.isAdmin) {
        return {
            selectedAccountId: null,
            shouldPersistCookie: false,
            shouldClearCookie: Boolean(cookieRaw?.trim()) || options.adminShopAsFlag,
        };
    }

    const firstOwned = rows.find((row) => ownedIdSet.has(row.id));
    if (firstOwned) {
        return { selectedAccountId: firstOwned.id, shouldPersistCookie: true, shouldClearCookie: false };
    }

    if (sortedAccountIds.length > 0) {
        return {
            selectedAccountId: sortedAccountIds[0],
            shouldPersistCookie: true,
            shouldClearCookie: false,
        };
    }

    return { selectedAccountId: null, shouldPersistCookie: false, shouldClearCookie: false };
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
    shouldClearCookie: boolean;
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
            shouldClearCookie: false,
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

    // Only surface an impersonated account while admin shop-as is active.
    if (
        isAdmin &&
        adminShopAsFlag &&
        Number.isFinite(parsedCookieId) &&
        parsedCookieId > 0 &&
        !rows.some((r) => r.id === parsedCookieId)
    ) {
        const [impersonated] = await db
            .select({ id: account.id, name: account.name, accountMateId: account.accountMateId })
            .from(account)
            .where(and(eq(account.id, parsedCookieId), eq(account.isActive, true)))
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

    if (rows.length === 0 && !(isAdmin && adminShopAsFlag && Number.isFinite(parsedCookieId) && parsedCookieId > 0)) {
        return {
            accounts: [],
            selectedAccountId: null,
            selectedAccountDisplayName: null,
            selectedAccountShippingLeadTime: null,
            shouldPersistCookie: false,
            shouldClearCookie: isAdmin && Boolean(raw?.trim() || adminShopAsFlag),
            isAdminShopAs: false,
            canShopAsAnyAccount: isAdmin,
            hasOwnedAccounts,
        };
    }

    const ownedAccountIds = linkedAccounts.map((accountRow) => accountRow.id);
    const sortedAccountIds = rows.map((r) => r.id);
    const resolved = resolveSelectedAccountFromCookie(sortedAccountIds, raw, rows, userAccountMateId, {
        isAdmin,
        ownedAccountIds,
        adminShopAsFlag,
    });
    const selectedAccountId = resolved.selectedAccountId;
    const shouldPersistCookie = resolved.shouldPersistCookie;
    const shouldClearCookie = resolved.shouldClearCookie;

    const accountIdsForLeadTime = new Set(sortedAccountIds);
    if (selectedAccountId != null) {
        accountIdsForLeadTime.add(selectedAccountId);
    }

    const shippingLeadTimesByAccountId = await getShippingLeadTimesForAccounts([...accountIdsForLeadTime]);

    const accounts: WholesaleAccountSwitcherOption[] = rows.map((r) => ({
        id: r.id,
        displayName: formatAccountDisplayName(r, userAccountMateId),
        shippingLeadTime: shippingLeadTimesByAccountId.get(r.id) ?? DEFAULT_SHIPPING_LEAD_TIME,
    }));

    if (selectedAccountId != null && !accounts.some((a) => a.id === selectedAccountId)) {
        const [missing] = await db
            .select({ id: account.id, name: account.name, accountMateId: account.accountMateId })
            .from(account)
            .where(eq(account.id, selectedAccountId))
            .limit(1);
        if (missing) {
            accounts.push({
                id: missing.id,
                displayName: formatAccountDisplayName(missing, userAccountMateId),
                shippingLeadTime: shippingLeadTimesByAccountId.get(missing.id) ?? DEFAULT_SHIPPING_LEAD_TIME,
            });
        }
    }

    const isAdminShopAs = await resolveIsAdminShopAs(
        userId,
        isAdmin,
        selectedAccountId,
        adminShopAsFlag && !shouldClearCookie,
    );
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
        shouldClearCookie,
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
    shouldClearCookie: boolean;
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
            shouldClearCookie: false,
            isAdminShopAs: false,
            canShopAsAnyAccount: false,
            hasOwnedAccounts: false,
        };
    }

    return getWholesaleSelectionCore(userId, isAdmin);
}

export async function setWholesaleSelectedAccount(
    accountId: number | null,
    options?: { adminShopAs?: boolean; redirectToShop?: boolean; reloadFromAccountMate?: boolean },
): Promise<{ ok: boolean; displayName?: string | null }> {
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

    let displayName: string | null | undefined;
    if (options?.reloadFromAccountMate) {
        const [row] = await db
            .select({ id: account.id, name: account.name, accountMateId: account.accountMateId })
            .from(account)
            .where(and(eq(account.id, accountId), eq(account.isActive, true)))
            .limit(1);

        if (!row) {
            return { ok: false };
        }

        if (row.accountMateId) {
            const reload = await reloadAccountFromAccountMate(accountId, row.accountMateId, true);
            if (reload.ok) {
                displayName = formatAccountDisplayName({
                    id: accountId,
                    name: reload.mapped.name,
                    accountMateId: reload.accountMateId,
                });
            } else {
                console.error('[shop-as reload account]', reload.error);
                displayName = formatAccountDisplayName(row);
            }
        } else {
            displayName = formatAccountDisplayName(row);
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

    revalidateShopAccountPaths();

    if (options?.redirectToShop) {
        redirect('/shop');
    }

    return { ok: true, displayName };
}

/** Admin-only: stop shopping as another account; restore AccountMate-tied account or clear. */
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

    const [userRow] = await db
        .select({ accountMateId: user.accountMateId })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);
    const userAccountMateId = userRow?.accountMateId?.trim() || null;
    const accountMateAccount = userAccountMateId ? await findAccountRowByAccountMateId(userAccountMateId) : null;

    if (accountMateAccount) {
        cookieStore.set(
            WHOLESALE_SELECTED_ACCOUNT_COOKIE,
            String(accountMateAccount.id),
            wholesaleAccountCookieOptions(),
        );
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
        .where(and(eq(account.isActive, true), or(ilike(account.name, filter), ilike(account.accountMateId, filter))))
        .orderBy(asc(account.name))
        .limit(ADMIN_ACCOUNT_SEARCH_LIMIT);

    const shippingLeadTimesByAccountId = await getShippingLeadTimesForAccounts(rows.map((row) => row.id));

    return rows.map((r) => ({
        id: r.id,
        displayName: formatAccountDisplayName(r),
        shippingLeadTime: shippingLeadTimesByAccountId.get(r.id) ?? DEFAULT_SHIPPING_LEAD_TIME,
    }));
}
