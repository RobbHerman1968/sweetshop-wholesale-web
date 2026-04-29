import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type AuthState = {
    isLoggedIn: boolean;
    email: string | null;
    cartItemCount: number;
    setCartCount: (itemCount: number) => void;
    login: (email: string) => void;
    logout: () => void;
};

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            isLoggedIn: false,
            email: null,
            cartItemCount: 0,
            setCartCount: (itemCount: number) => set({ cartItemCount: itemCount }),
            login: (email: string) => set({ isLoggedIn: true, email }),
            logout: () => set({ isLoggedIn: false, email: null, cartItemCount: 0 }),
        }),
        {
            name: 'sweetshop-auth',
        },
    ),
);
