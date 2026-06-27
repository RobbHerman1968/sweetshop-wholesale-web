import { notFound } from 'next/navigation';
import { getManageCart } from '@/lib/manage-cart-actions';
import { getSiteSettingByIdForManage } from '@/lib/db-pg/actions/site-setting';
import { ManageCartDetailContent } from './cart-detail-content';

type Props = {
    params: Promise<{ cartId: string }>;
    searchParams: Promise<{ returnTo?: string }>;
};

function resolveBackHref(returnTo: string | undefined): string {
    if (returnTo?.startsWith('/manage/orders/active-carts')) {
        return returnTo;
    }
    return '/manage/orders/active-carts';
}

export default async function ManageCartDetailPage({ params, searchParams }: Props) {
    const { cartId: cartIdParam } = await params;
    const { returnTo } = await searchParams;
    const cartId = parseInt(cartIdParam, 10);

    if (!Number.isFinite(cartId) || cartId <= 0) {
        notFound();
    }

    const [result, minimumOrderSetting] = await Promise.all([
        getManageCart(cartId),
        getSiteSettingByIdForManage(2),
    ]);
    if (!result.ok) {
        notFound();
    }

    return (
        <ManageCartDetailContent
            cartId={cartId}
            initialCart={result.cart}
            backHref={resolveBackHref(returnTo)}
            minimumOrderAmount={minimumOrderSetting?.value ?? null}
        />
    );
}
