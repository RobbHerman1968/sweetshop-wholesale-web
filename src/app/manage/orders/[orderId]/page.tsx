import { notFound } from 'next/navigation';
import { getOrderByIdForManage } from '@/lib/db-pg/actions/order';
import {
    getDeveloperEmailAddress,
    getSalesOrderEmailAddress,
    getSendEmailFromAddress,
} from '@/lib/db-pg/actions/site-setting';
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
    const [detail, sendEmailFrom, developerEmail, salesEmail] = await Promise.all([
        Number.isFinite(orderId) ? getOrderByIdForManage(orderId) : Promise.resolve(null),
        getSendEmailFromAddress(),
        getDeveloperEmailAddress(),
        getSalesOrderEmailAddress(),
    ]);

    if (!detail) {
        notFound();
    }

    return (
        <OrderDetailContent
            detail={detail}
            backHref={resolveBackHref(returnTo)}
            sendEmailFrom={sendEmailFrom}
            developerEmail={developerEmail}
            salesEmail={salesEmail}
        />
    );
}
