import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { AccountPageClient } from '@/app/account/account-page-client';
import { getAccountPageData } from '@/lib/account-page-actions';
import { requireAuthenticatedUserId } from '@/lib/auth-session';
import { getBrandBarNavCategoriesForSiteHeader } from '@/lib/db-pg/actions/menu';
import { getShopCartItemCount } from '@/lib/shop-cart-actions';
import { getWholesaleAccountSwitcherState } from '@/lib/wholesale-account-switcher-actions';

export default async function AccountPage() {
    await requireAuthenticatedUserId();

    const [brandBarCategories, switcherState, accountData, initialCartItemCount] = await Promise.all([
        getBrandBarNavCategoriesForSiteHeader(),
        getWholesaleAccountSwitcherState(),
        getAccountPageData(),
        getShopCartItemCount(),
    ]);

    if (!accountData) {
        redirect('/');
    }

    return (
        <Suspense fallback={<div className="mx-auto max-w-6xl px-3 py-8 text-sm text-[#6e4a34]">Loading account…</div>}>
            <AccountPageClient
                brandBarCategories={brandBarCategories}
                initialCartItemCount={initialCartItemCount}
                initialAccountDisplayName={switcherState.selectedAccountDisplayName}
                initialAccountShippingLeadTime={switcherState.selectedAccountShippingLeadTime}
                accountData={accountData}
            />
        </Suspense>
    );
}
