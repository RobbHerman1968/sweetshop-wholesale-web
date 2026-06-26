import type { Session } from 'next-auth';
import { resolveShopCatalogProductGroupIds } from '@/lib/db-pg/actions/account';
import { getEffectiveWholesaleAccountIdForShopCatalog } from '@/lib/wholesale-account-switcher-actions';
import { parseUserId } from '@/lib/user-id';

/** Default catalog when no account→productGroup rows exist, or signed-out preview. */
export const PUBLIC_SHOP_PRODUCT_GROUP_IDS = [1];

export async function resolveShopCatalogProductGroupIdsForSession(session: Session | null): Promise<number[]> {
    const isLoggedIn = Boolean(session?.user);

    if (!isLoggedIn) {
        return PUBLIC_SHOP_PRODUCT_GROUP_IDS;
    }

    const userId = parseUserId(session?.user?.id);
    if (userId == null) {
        return PUBLIC_SHOP_PRODUCT_GROUP_IDS;
    }

    const effectiveAccountId = await getEffectiveWholesaleAccountIdForShopCatalog(userId, session?.user?.isAdmin ?? false);
    if (effectiveAccountId == null) {
        return PUBLIC_SHOP_PRODUCT_GROUP_IDS;
    }

    const productGroupIds = await resolveShopCatalogProductGroupIds(userId, effectiveAccountId, session?.user?.isAdmin ?? false);
    return productGroupIds.length > 0 ? productGroupIds : PUBLIC_SHOP_PRODUCT_GROUP_IDS;
}
