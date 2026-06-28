import { cache } from 'react';
import { getServerSession } from 'next-auth';
import { eq } from 'drizzle-orm';
import { authOptions } from '@/auth';
import { db } from '@/lib/db-pg';
import { account, menu } from '@/lib/drizzle/schema';
import { WHOLESALE_SHOPPING_MENU_ID } from '@/lib/menu-manage-utils';
import { getWholesaleSelectedAccountIdForShoppingMenu } from '@/lib/wholesale-account-switcher-actions';
import { parseUserId } from '@/lib/user-id';

export { DEFAULT_SHIPPING_LEAD_TIME } from '@/lib/shipping-lead-time-constants';
export { getShippingLeadTimeForAccount, getShippingLeadTimesForAccounts } from '@/lib/account-shipping-lead-time';

export function isHebAccountMateId(accountMateId: string | null | undefined): boolean {
    const id = accountMateId?.trim().toUpperCase();
    return Boolean(id?.startsWith('HEB'));
}

/** Ensure menuId refers to an existing shopping menu; otherwise fall back to the default wholesale menu. */
export const resolveValidShoppingMenuId = cache(async (menuId: number): Promise<number> => {
    if (!Number.isFinite(menuId) || menuId <= 0) {
        return WHOLESALE_SHOPPING_MENU_ID;
    }

    const [row] = await db
        .select({ id: menu.id, isShopping: menu.isShopping })
        .from(menu)
        .where(eq(menu.id, menuId))
        .limit(1);

    if (row?.isShopping) {
        return row.id;
    }

    return WHOLESALE_SHOPPING_MENU_ID;
});

export const getShoppingMenuIdForAccount = cache(async (accountId: number): Promise<number> => {
    if (!Number.isFinite(accountId) || accountId <= 0) {
        return WHOLESALE_SHOPPING_MENU_ID;
    }

    const [row] = await db
        .select({ menuId: account.menuId })
        .from(account)
        .where(eq(account.id, accountId))
        .limit(1);

    return resolveValidShoppingMenuId(row?.menuId ?? 0);
});

/** Load shopping menu id from the selected account's `menuId`; default wholesale menu (3) when unsigned or no selection. */
export const getShoppingMenuIdFromSession = cache(async (): Promise<number> => {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return WHOLESALE_SHOPPING_MENU_ID;
    }

    const userId = parseUserId(session.user.id);
    if (userId == null) {
        return WHOLESALE_SHOPPING_MENU_ID;
    }

    const accountId = await getWholesaleSelectedAccountIdForShoppingMenu(userId, session.user.isAdmin ?? false);
    if (accountId == null) {
        return WHOLESALE_SHOPPING_MENU_ID;
    }

    return getShoppingMenuIdForAccount(accountId);
});
