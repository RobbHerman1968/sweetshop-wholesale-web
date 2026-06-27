import { getServerSession } from 'next-auth';
import { eq } from 'drizzle-orm';
import { authOptions } from '@/auth';
import { db } from '@/lib/db-pg';
import { account } from '@/lib/drizzle/schema';
import { WHOLESALE_SHOPPING_MENU_ID } from '@/lib/menu-manage-utils';
import { getEffectiveWholesaleAccountIdForShopCatalog } from '@/lib/wholesale-account-switcher-actions';
import { parseUserId } from '@/lib/user-id';

export function isHebAccountMateId(accountMateId: string | null | undefined): boolean {
    const id = accountMateId?.trim().toUpperCase();
    return Boolean(id?.startsWith('HEB'));
}

export async function getShoppingMenuIdForAccount(accountId: number): Promise<number> {
    if (!Number.isFinite(accountId) || accountId <= 0) {
        return WHOLESALE_SHOPPING_MENU_ID;
    }

    const [row] = await db
        .select({ menuId: account.menuId })
        .from(account)
        .where(eq(account.id, accountId))
        .limit(1);

    const menuId = row?.menuId ?? 0;
    return menuId > 0 ? menuId : WHOLESALE_SHOPPING_MENU_ID;
}

export async function getShoppingMenuIdFromSession(): Promise<number> {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return WHOLESALE_SHOPPING_MENU_ID;
    }

    const userId = parseUserId(session.user.id);
    if (userId == null) {
        return WHOLESALE_SHOPPING_MENU_ID;
    }

    const accountId = await getEffectiveWholesaleAccountIdForShopCatalog(userId, session.user.isAdmin ?? false);
    if (accountId == null) {
        return WHOLESALE_SHOPPING_MENU_ID;
    }

    return getShoppingMenuIdForAccount(accountId);
}
