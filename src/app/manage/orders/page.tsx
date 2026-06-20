import { Suspense } from 'react';
import { getPaginatedOrdersFromDB } from '@/lib/db-pg/actions/order';
import { OrdersContent } from './orders-content';

const PER_PAGE = 100;

type Props = {
    searchParams: Promise<{ page?: string; from?: string; to?: string }>;
};

export default async function ManageOrdersPage({ searchParams }: Props) {
    const params = await searchParams;
    const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
    const dateFrom = params.from && /^\d{4}-\d{2}-\d{2}$/.test(params.from) ? params.from : undefined;
    const dateTo = params.to && /^\d{4}-\d{2}-\d{2}$/.test(params.to) ? params.to : undefined;

    const result = await getPaginatedOrdersFromDB({
        page,
        limit: PER_PAGE,
        dateFrom,
        dateTo,
    });

    return (
        <Suspense fallback={<div className="mx-auto max-w-7xl text-xs text-[#7c5b44]">Loading orders…</div>}>
            <OrdersContent
                key={`${dateFrom ?? ''}-${dateTo ?? ''}`}
                data={result.data}
                pagination={result.pagination}
                dateFrom={dateFrom}
                dateTo={dateTo}
            />
        </Suspense>
    );
}
