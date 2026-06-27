import { getServerSession } from 'next-auth';
import { HomePageClient } from '@/app/home-page-client';
import { authOptions } from '@/auth';
import { getBrandBarNavCategoriesForSiteHeader } from '@/lib/db-pg/actions/menu';
import { getShopCartItemCount } from '@/lib/shop-cart-actions';
import { getWholesaleAccountSwitcherState } from '@/lib/wholesale-account-switcher-actions';

export default async function Home() {
    const [brandBarCategories, session, switcherState] = await Promise.all([
        getBrandBarNavCategoriesForSiteHeader(),
        getServerSession(authOptions),
        getWholesaleAccountSwitcherState(),
    ]);
    const initialCartItemCount = session?.user ? await getShopCartItemCount() : 0;

    return (
        <HomePageClient
            brandBarCategories={brandBarCategories}
            initialCartItemCount={initialCartItemCount}
            initialAccountDisplayName={switcherState.selectedAccountDisplayName}
        />
    );
}
