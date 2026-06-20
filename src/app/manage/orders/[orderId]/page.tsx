import { notFound } from 'next/navigation';
import { getOrderByIdForManage } from '@/lib/db-pg/actions/order';
import { OrderDetailContent } from './order-detail-content';

type Props = {
    params: Promise<{ orderId: string }>;
    searchParams: Promise<{ returnTo?: string }>;
};

function resolveBackHref(returnTo: string | undefined): string {
    if (returnTo?.startsWith('/manage/orders')) {
        return returnTo;
    }
    return '/manage/orders';
}

export default async function ManageOrderDetailPage({ params, searchParams }: Props) {
    const { orderId: orderIdParam } = await params;
    const { returnTo } = await searchParams;
    const orderId = parseInt(orderIdParam, 10);
    const detail = Number.isFinite(orderId) ? await getOrderByIdForManage(orderId) : null;

    if (!detail) {
        notFound();
    }

    return <OrderDetailContent detail={detail} backHref={resolveBackHref(returnTo)} />;
}
