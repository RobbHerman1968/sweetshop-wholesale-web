import { getServerSession } from 'next-auth';
import { getBrandBarNavCategoriesForSiteHeader } from '@/lib/db-pg/actions/menu';
import { getFooterLegalPageLinks } from '@/lib/db-pg/actions/page';
import { PublicSiteShellClient } from '@/components/public-site-shell-client';
import { authOptions } from '@/auth';
import { getShopCartItemCount } from '@/lib/shop-cart-actions';
import { getWholesaleAccountSwitcherState } from '@/lib/wholesale-account-switcher-actions';
import type { ReactNode } from 'react';

type PublicSiteShellProps = {
    children: ReactNode;
};

export async function PublicSiteShell({ children }: PublicSiteShellProps) {
    const [brandBarCategories, session, switcherState, footerLegalLinks] = await Promise.all([
        getBrandBarNavCategoriesForSiteHeader(),
        getServerSession(authOptions),
        getWholesaleAccountSwitcherState(),
        getFooterLegalPageLinks(),
    ]);
    const initialCartItemCount = session?.user ? await getShopCartItemCount() : 0;

    return (
        <PublicSiteShellClient
            brandBarCategories={brandBarCategories}
            initialCartItemCount={initialCartItemCount}
            initialIsLoggedIn={Boolean(session?.user)}
            initialAccountDisplayName={switcherState.selectedAccountDisplayName}
            initialAccountShippingLeadTime={switcherState.selectedAccountShippingLeadTime}
            termsPageHref={footerLegalLinks.termsPageHref}
            privacyPageHref={footerLegalLinks.privacyPageHref}
        >
            {children}
        </PublicSiteShellClient>
    );
}
