import { Suspense } from 'react';
import { getPaginatedApplicationsFromDB } from '@/lib/db-pg/actions/application';
import { ApplicationsContent } from './applications-content';

const PER_PAGE = 50;

type Props = {
    searchParams: Promise<{ page?: string; search?: string }>;
};

export default async function ManageApplicationsPage({ searchParams }: Props) {
    const params = await searchParams;
    const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
    const search = params.search?.trim() ?? '';

    const result = await getPaginatedApplicationsFromDB({
        page,
        limit: PER_PAGE,
        search: search || undefined,
    });

    return (
        <Suspense fallback={<div className="mx-auto w-full max-w-7xl text-xs text-[#6e4a34]">Loading applications…</div>}>
            <div className="flex h-full min-h-0 flex-col">
                <ApplicationsContent data={result.data} pagination={result.pagination} search={search} />
            </div>
        </Suspense>
    );
}
