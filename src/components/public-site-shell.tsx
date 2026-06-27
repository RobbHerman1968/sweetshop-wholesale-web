import { getServerSession } from 'next-auth';
import { getBrandBarNavCategoriesForSiteHeader } from '@/lib/db-pg/actions/menu';
import { PublicSiteShellClient } from '@/components/public-site-shell-client';
import { authOptions } from '@/auth';
import { getShopCartItemCount } from '@/lib/shop-cart-actions';
import type { ReactNode } from 'react';

type PublicSiteShellProps = {
    children: ReactNode;
};

export async function PublicSiteShell({ children }: PublicSiteShellProps) {
    const [brandBarCategories, session] = await Promise.all([
        getBrandBarNavCategoriesForSiteHeader(),
        getServerSession(authOptions),
    ]);
    const initialCartItemCount = session?.user ? await getShopCartItemCount() : 0;

    return (
        <PublicSiteShellClient brandBarCategories={brandBarCategories} initialCartItemCount={initialCartItemCount}>
            {children}
        </PublicSiteShellClient>
    );
}
