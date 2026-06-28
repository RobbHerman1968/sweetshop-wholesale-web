import { notFound } from 'next/navigation';
import { getBrandBarNavCategoriesForSiteHeader } from '@/lib/db-pg/actions/menu';
import { getOrderByIdForAuthenticatedUser } from '@/lib/db-pg/actions/order';
import { requireAuthenticatedUserId } from '@/lib/auth-session';
import { getShopCartItemCount } from '@/lib/shop-cart-actions';
import { getWholesaleAccountSwitcherState } from '@/lib/wholesale-account-switcher-actions';
import { CustomerOrderDetailContent } from './customer-order-detail-content';
import { AccountOrderPageShell } from '../../account-order-page-shell';

type Props = {
    params: Promise<{ orderId: string }>;
};

export default async function AccountOrderDetailPage({ params }: Props) {
    await requireAuthenticatedUserId();
    const { orderId: orderIdParam } = await params;
    const orderId = parseInt(orderIdParam, 10);

    const [brandBarCategories, switcherState, detail, initialCartItemCount] = await Promise.all([
        getBrandBarNavCategoriesForSiteHeader(),
        getWholesaleAccountSwitcherState(),
        Number.isFinite(orderId) ? getOrderByIdForAuthenticatedUser(orderId) : Promise.resolve(null),
        getShopCartItemCount(),
    ]);

    if (!detail) {
        notFound();
    }

    return (
        <AccountOrderPageShell
            brandBarCategories={brandBarCategories}
            initialCartItemCount={initialCartItemCount}
            initialAccountDisplayName={switcherState.selectedAccountDisplayName}
            initialAccountShippingLeadTime={switcherState.selectedAccountShippingLeadTime}
        >
            <CustomerOrderDetailContent detail={detail} />
        </AccountOrderPageShell>
    );
}
