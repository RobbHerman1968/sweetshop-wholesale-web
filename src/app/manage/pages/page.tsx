import { Suspense } from 'react';
import { getPaginatedPagesFromDB } from '@/lib/db-pg/actions/page';
import { PagesContent } from './pages-content';

const PER_PAGE = 50;

type Props = {
    searchParams: Promise<{ page?: string; name?: string }>;
};

export default async function ManagePagesPage({ searchParams }: Props) {
    const params = await searchParams;
    const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
    const name = params.name?.trim() ?? '';

    const result = await getPaginatedPagesFromDB({
        page,
        limit: PER_PAGE,
        name: name || undefined,
    });

    return (
        <Suspense fallback={<div className="mx-auto max-w-7xl text-xs text-[#6e4a34]">Loading pages…</div>}>
            <div className="flex h-full min-h-0 flex-col">
                <PagesContent data={result.data} pagination={result.pagination} searchName={name} />
            </div>
        </Suspense>
    );
}
