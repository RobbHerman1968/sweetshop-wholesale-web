import { getServerSession } from 'next-auth';
import { AccountPageClient } from '@/app/account/account-page-client';
import { authOptions } from '@/auth';
import { getBrandBarNavCategoriesForSiteHeader } from '@/lib/db-pg/actions/menu';
import { getShopCartItemCount } from '@/lib/shop-cart-actions';
import { getWholesaleAccountSwitcherState } from '@/lib/wholesale-account-switcher-actions';

export default async function AccountPage() {
    const [brandBarCategories, session, switcherState] = await Promise.all([
        getBrandBarNavCategoriesForSiteHeader(),
        getServerSession(authOptions),
        getWholesaleAccountSwitcherState(),
    ]);
    const initialCartItemCount = session?.user ? await getShopCartItemCount() : 0;

    return (
        <AccountPageClient
            brandBarCategories={brandBarCategories}
            initialCartItemCount={initialCartItemCount}
            initialAccountDisplayName={switcherState.selectedAccountDisplayName}
            initialAccountShippingLeadTime={switcherState.selectedAccountShippingLeadTime}
        />
    );
}
