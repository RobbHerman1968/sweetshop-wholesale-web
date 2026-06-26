import { create } from 'zustand';

type ShopCartState = {
    itemCount: number;
    accountId: number | null;
    setItemCount: (itemCount: number) => void;
    setAccountId: (accountId: number | null) => void;
    reset: () => void;
};

export const useShopCartStore = create<ShopCartState>((set) => ({
    itemCount: 0,
    accountId: null,
    setItemCount: (itemCount) => set({ itemCount }),
    setAccountId: (accountId) => set({ accountId }),
    reset: () => set({ itemCount: 0, accountId: null }),
}));
