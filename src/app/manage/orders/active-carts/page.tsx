import { Suspense } from 'react';
import { getPaginatedActiveCartsFromDB } from '@/lib/db-pg/actions/cart';
import { ActiveCartsContent } from './active-carts-content';

const PER_PAGE = 100;

type Props = {
    searchParams: Promise<{ page?: string }>;
};

export default async function ManageActiveCartsPage({ searchParams }: Props) {
    const params = await searchParams;
    const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);

    const result = await getPaginatedActiveCartsFromDB({
        page,
        limit: PER_PAGE,
    });

    return (
        <Suspense fallback={<div className="mx-auto w-full max-w-7xl text-xs text-[#7c5b44]">Loading active carts…</div>}>
            <ActiveCartsContent data={result.data} pagination={result.pagination} />
        </Suspense>
    );
}
