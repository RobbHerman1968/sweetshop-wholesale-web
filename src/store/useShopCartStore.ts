import { create } from 'zustand';

type ShopCartState = {
    itemCount: number;
    accountId: number | null;
    accountDisplayName: string | null;
    setItemCount: (itemCount: number) => void;
    setAccountId: (accountId: number | null) => void;
    setAccountDisplayName: (accountDisplayName: string | null) => void;
    reset: () => void;
};

export const useShopCartStore = create<ShopCartState>((set) => ({
    itemCount: 0,
    accountId: null,
    accountDisplayName: null,
    setItemCount: (itemCount) => set({ itemCount }),
    setAccountId: (accountId) => set({ accountId }),
    setAccountDisplayName: (accountDisplayName) => set({ accountDisplayName }),
    reset: () => set({ itemCount: 0, accountId: null, accountDisplayName: null }),
}));
