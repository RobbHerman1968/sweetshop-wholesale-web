'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth';
import { and, asc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { authOptions } from '@/auth';
import { db } from '@/lib/db-pg';
import { getShopProductGroupIdsForUserAccount, getUserAccounts, verifyUserOwnsAccount } from '@/lib/db-pg/actions/account';
import { account, accountGroup, product, productGroupProduct } from '@/lib/drizzle/schema';
import { WHOLESALE_SELECTED_ACCOUNT_COOKIE } from '@/lib/wholesale-account-cookie';
import { parseUserId } from '@/lib/user-id';

export type WholesaleAccountSwitcherOption = {
    id: number;
    displayName: string;
};

function formatAccountDisplayName(r: { id: number; name: string | null; accountMateId: string | null }): string {
    const n = r.name?.trim();
    if (n) return n;
    const m = r.accountMateId?.trim();
    if (m) return m;
    return `Account ${r.id}`;
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

async function getWholesaleSelectionCore(userId: number): Promise<{
    accounts: WholesaleAccountSwitcherOption[];
    selectedAccountId: number | null;
    shouldPersistCookie: boolean;
}> {
    const uid = userId;
    if (!uid) {
        return { accounts: [], selectedAccountId: null, shouldPersistCookie: false };
    }

    const linkedAccounts = await getUserAccounts(userId);
    if (linkedAccounts.length === 0) {
        return { accounts: [], selectedAccountId: null, shouldPersistCookie: false };
    }

    const rows = linkedAccounts
        .map((r) => ({
            id: r.id,
            name: r.name,
            accountMateId: r.accountMateId,
        }))
        .sort((a, b) => {
            const nameCmp = (a.name ?? '').localeCompare(b.name ?? '');
            return nameCmp !== 0 ? nameCmp : a.id - b.id;
        });

    const accounts: WholesaleAccountSwitcherOption[] = rows.map((r) => ({
        id: r.id,
        displayName: formatAccountDisplayName(r),
    }));

    const sortedAccountIds = rows.map((r) => r.id);
    const cookieStore = await cookies();
    const raw = cookieStore.get(WHOLESALE_SELECTED_ACCOUNT_COOKIE)?.value;
    const { selectedAccountId, shouldPersistCookie } = resolveSelectedAccountFromCookie(sortedAccountIds, raw);

    return { accounts, selectedAccountId, shouldPersistCookie };
}

/** Effective wholesale account for shop catalog: valid cookie, else first account (by name, then id). */
export async function getEffectiveWholesaleAccountIdForShopCatalog(userId: number): Promise<number | null> {
    const { selectedAccountId } = await getWholesaleSelectionCore(userId);
    return selectedAccountId;
}

/** Accounts for the signed-in user; selection is cookie when valid, otherwise first account. */
export async function getWholesaleAccountSwitcherState(): Promise<{
    accounts: WholesaleAccountSwitcherOption[];
    selectedAccountId: number | null;
    shouldPersistCookie: boolean;
}> {
    const session = await getServerSession(authOptions);
    const userId = parseUserId(session?.user?.id);
    if (userId == null) {
        return { accounts: [], selectedAccountId: null, shouldPersistCookie: false };
    }

    return getWholesaleSelectionCore(userId);
}

export async function setWholesaleSelectedAccount(accountId: number | null): Promise<{ ok: boolean }> {
    const session = await getServerSession(authOptions);
    const userId = parseUserId(session?.user?.id);
    if (userId == null) {
        return { ok: false };
    }

    const cookieStore = await cookies();

    if (accountId === null) {
        cookieStore.delete(WHOLESALE_SELECTED_ACCOUNT_COOKIE);
        revalidatePath('/shop');
        return { ok: true };
    }

    const ok = await verifyUserOwnsAccount(userId, accountId);
    if (!ok) {
        return { ok: false };
    }

    cookieStore.set(WHOLESALE_SELECTED_ACCOUNT_COOKIE, String(accountId), {
        path: '/',
        maxAge: 60 * 60 * 24 * 400,
        sameSite: 'lax',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
    });
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
    if (userId == null) return { ok: false };

    const owns = await verifyUserOwnsAccount(userId, accountId);
    if (!owns) return { ok: false };

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

    const productGroupIds = await getShopProductGroupIdsForUserAccount(userId, accountId);

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
