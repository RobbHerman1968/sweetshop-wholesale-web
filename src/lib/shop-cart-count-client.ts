'use client';

import { getShopCartItemCount } from '@/lib/shop-cart-actions';
import { useShopCartStore } from '@/store/useShopCartStore';

let refreshInFlight: Promise<number> | null = null;
let refreshGeneration = 0;

/** Forces the next refresh to ignore any in-flight request (e.g. after account switch). */
export function invalidateShopCartCountRefresh() {
    refreshGeneration += 1;
    refreshInFlight = null;
}

export async function refreshShopCartCount(accountId?: number | null): Promise<number> {
    if (refreshInFlight && accountId == null) {
        return refreshInFlight;
    }

    const generation = refreshGeneration;
    const request: Promise<number> = (async () => {
        try {
            const count = await getShopCartItemCount(accountId);
            if (generation !== refreshGeneration) {
                return useShopCartStore.getState().itemCount;
            }
            useShopCartStore.getState().setItemCount(count);
            return count;
        } catch {
            if (generation !== refreshGeneration) {
                return useShopCartStore.getState().itemCount;
            }
            useShopCartStore.getState().setItemCount(0);
            return 0;
        } finally {
            if (generation === refreshGeneration && refreshInFlight === request) {
                refreshInFlight = null;
            }
        }
    })();

    refreshInFlight = request;
    return request;
}
