import { Suspense } from 'react';
import { getPaginatedCategoriesFromDB } from '@/lib/db-pg/actions/category';
import { CategoriesContent } from './categories-content';

const PER_PAGE = 50;

type Props = {
    searchParams: Promise<{ page?: string; name?: string }>;
};

export default async function ManageCategoriesPage({ searchParams }: Props) {
    const params = await searchParams;
    const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
    const name = params.name?.trim() ?? '';

    const result = await getPaginatedCategoriesFromDB({
        page,
        limit: PER_PAGE,
        name: name || undefined,
    });

    return (
        <Suspense fallback={<div className="mx-auto max-w-7xl text-xs text-[#6e4a34]">Loading categories…</div>}>
            <CategoriesContent data={result.data} pagination={result.pagination} searchName={name} />
        </Suspense>
    );
}
