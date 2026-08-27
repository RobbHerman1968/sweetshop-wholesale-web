import { getServerSession } from 'next-auth';
import { HomePageClient } from '@/app/home-page-client';
import { authOptions } from '@/auth';
import { getBrandBarNavCategoriesForSiteHeader } from '@/lib/db-pg/actions/menu';
import { getFooterLegalPageLinks } from '@/lib/db-pg/actions/page';
import { getShopCartItemCount } from '@/lib/shop-cart-actions';
import { getWholesaleAccountSwitcherState } from '@/lib/wholesale-account-switcher-actions';

export default async function Home() {
    const [brandBarCategories, session, switcherState, footerLegalLinks] = await Promise.all([
        getBrandBarNavCategoriesForSiteHeader(),
        getServerSession(authOptions),
        getWholesaleAccountSwitcherState(),
        getFooterLegalPageLinks(),
    ]);
    const initialCartItemCount = session?.user ? await getShopCartItemCount() : 0;

    return (
        <HomePageClient
            brandBarCategories={brandBarCategories}
            initialCartItemCount={initialCartItemCount}
            initialAccountDisplayName={switcherState.selectedAccountDisplayName}
            initialAccountShippingLeadTime={switcherState.selectedAccountShippingLeadTime}
            termsPageHref={footerLegalLinks.termsPageHref}
            privacyPageHref={footerLegalLinks.privacyPageHref}
        />
    );
}
