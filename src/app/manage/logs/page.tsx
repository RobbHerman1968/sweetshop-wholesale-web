import { Suspense } from 'react';
import { getPaginatedOrderLogsFromDB } from '@/lib/db-pg/actions/order-log';
import { LogsContent } from './logs-content';

const PER_PAGE = 50;

type Props = {
    searchParams: Promise<{ page?: string }>;
};

export default async function ManageLogsPage({ searchParams }: Props) {
    const params = await searchParams;
    const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);

    const result = await getPaginatedOrderLogsFromDB({
        page,
        limit: PER_PAGE,
    });

    return (
        <Suspense fallback={<div className="mx-auto max-w-7xl text-xs text-[#6e4a34]">Loading logs…</div>}>
            <LogsContent data={result.data} pagination={result.pagination} />
        </Suspense>
    );
}
