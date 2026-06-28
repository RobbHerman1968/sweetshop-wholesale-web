import 'server-only';

import { cache } from 'react';
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db-pg';
import { account, menu } from '@/lib/drizzle/schema';
import { WHOLESALE_SHOPPING_MENU_ID } from '@/lib/menu-manage-utils';
import { DEFAULT_SHIPPING_LEAD_TIME } from '@/lib/shipping-lead-time-constants';

export { DEFAULT_SHIPPING_LEAD_TIME } from '@/lib/shipping-lead-time-constants';

function leadTimeForMenuId(
    menuId: number,
    menuById: Map<number, { isShopping: boolean | null; shippingLeadTime: number | null }>,
): number {
    if (Number.isFinite(menuId) && menuId > 0) {
        const row = menuById.get(menuId);
        if (row?.isShopping) {
            return row.shippingLeadTime ?? DEFAULT_SHIPPING_LEAD_TIME;
        }
    }

    const fallback = menuById.get(WHOLESALE_SHOPPING_MENU_ID);
    return fallback?.shippingLeadTime ?? DEFAULT_SHIPPING_LEAD_TIME;
}

export async function getShippingLeadTimesForAccounts(accountIds: number[]): Promise<Map<number, number>> {
    const uniqueIds = [...new Set(accountIds.filter((id) => Number.isFinite(id) && id > 0))];
    if (uniqueIds.length === 0) {
        return new Map();
    }

    const [accountRows, menuRows] = await Promise.all([
        db
            .select({ id: account.id, menuId: account.menuId })
            .from(account)
            .where(inArray(account.id, uniqueIds)),
        db
            .select({ id: menu.id, isShopping: menu.isShopping, shippingLeadTime: menu.shippingLeadTime })
            .from(menu),
    ]);

    const menuById = new Map(menuRows.map((row) => [row.id, row]));
    const result = new Map<number, number>();

    for (const row of accountRows) {
        result.set(row.id, leadTimeForMenuId(row.menuId ?? 0, menuById));
    }

    return result;
}

export const getShippingLeadTimeForAccount = cache(async (accountId: number): Promise<number> => {
    if (!Number.isFinite(accountId) || accountId <= 0) {
        return DEFAULT_SHIPPING_LEAD_TIME;
    }

    const leadTimes = await getShippingLeadTimesForAccounts([accountId]);
    return leadTimes.get(accountId) ?? DEFAULT_SHIPPING_LEAD_TIME;
});
