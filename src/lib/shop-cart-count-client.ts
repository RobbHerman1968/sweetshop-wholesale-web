'use client';

import { getShopCartItemCount } from '@/lib/shop-cart-actions';
import { useShopCartStore } from '@/store/useShopCartStore';

let refreshInFlight: Promise<number> | null = null;

export async function refreshShopCartCount(): Promise<number> {
    if (refreshInFlight) {
        return refreshInFlight;
    }

    refreshInFlight = (async () => {
        try {
            const count = await getShopCartItemCount();
            useShopCartStore.getState().setItemCount(count);
            return count;
        } catch {
            useShopCartStore.getState().setItemCount(0);
            return 0;
        } finally {
            refreshInFlight = null;
        }
    })();

    return refreshInFlight;
}
