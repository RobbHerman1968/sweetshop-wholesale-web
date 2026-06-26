'use client';

import { useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { refreshShopCartCount } from '@/lib/shop-cart-count-client';
import { useShopCartStore } from '@/store/useShopCartStore';

export function useShopCartCount() {
    const { status } = useSession();
    const itemCount = useShopCartStore((s) => s.itemCount);
    const accountId = useShopCartStore((s) => s.accountId);
    const setItemCount = useShopCartStore((s) => s.setItemCount);
    const reset = useShopCartStore((s) => s.reset);

    const refresh = useCallback(async () => {
        if (status === 'loading') {
            return useShopCartStore.getState().itemCount;
        }

        if (status !== 'authenticated') {
            reset();
            return 0;
        }

        return refreshShopCartCount();
    }, [status, reset]);

    useEffect(() => {
        if (status === 'loading') {
            return;
        }
        void refresh();
    }, [refresh, accountId, status]);

    return { itemCount, refresh, setItemCount, reset };
}
