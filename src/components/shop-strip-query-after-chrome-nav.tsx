'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { SHOP_STRIP_QUERY_AFTER_NAV_KEY } from '@/lib/shop-chrome-nav';

/** After navigating to `/shop` via header (session flag), remove facet/search/page from the URL if still present. */
export function ShopStripQueryAfterChromeNav() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryString = searchParams.toString();

    useEffect(() => {
        try {
            if (sessionStorage.getItem(SHOP_STRIP_QUERY_AFTER_NAV_KEY) !== '1') return;
            sessionStorage.removeItem(SHOP_STRIP_QUERY_AFTER_NAV_KEY);
            if (!queryString) return;
            queueMicrotask(() => {
                router.replace('/shop', { scroll: false });
            });
        } catch {
            /* private mode */
        }
    }, [router, queryString]);

    return null;
}
