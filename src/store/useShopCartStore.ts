import { create } from 'zustand';

import { DEFAULT_SHIPPING_LEAD_TIME } from '@/lib/shipping-lead-time-constants';

type ShopCartState = {
    itemCount: number;
    accountId: number | null;
    accountDisplayName: string | null;
    shippingLeadTime: number;
    setItemCount: (itemCount: number) => void;
    setAccountId: (accountId: number | null) => void;
    setAccountDisplayName: (accountDisplayName: string | null) => void;
    setShippingLeadTime: (shippingLeadTime: number) => void;
    reset: () => void;
};

export const useShopCartStore = create<ShopCartState>((set) => ({
    itemCount: 0,
    accountId: null,
    accountDisplayName: null,
    shippingLeadTime: DEFAULT_SHIPPING_LEAD_TIME,
    setItemCount: (itemCount) => set({ itemCount }),
    setAccountId: (accountId) => set({ accountId }),
    setAccountDisplayName: (accountDisplayName) => set({ accountDisplayName }),
    setShippingLeadTime: (shippingLeadTime) => set({ shippingLeadTime }),
    reset: () =>
        set({
            itemCount: 0,
            accountId: null,
            accountDisplayName: null,
            shippingLeadTime: DEFAULT_SHIPPING_LEAD_TIME,
        }),
}));
