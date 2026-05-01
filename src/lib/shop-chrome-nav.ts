/** Set before navigating to `/shop` from site chrome so the shop page can strip stale query params (filters, search, page). */
export const SHOP_STRIP_QUERY_AFTER_NAV_KEY = 'sweetshop:strip-shop-query';

export function markPendingShopQueryStrip() {
    try {
        sessionStorage.setItem(SHOP_STRIP_QUERY_AFTER_NAV_KEY, '1');
    } catch {
        /* private mode */
    }
}
