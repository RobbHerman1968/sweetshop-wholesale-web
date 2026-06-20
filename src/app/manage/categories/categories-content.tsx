'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationEllipsis } from '@/components/ui/pagination';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { buildShopCategoryPath } from '@/lib/shop-category-path';
import type { ShopCategory } from '@/lib/db-pg/actions/category';

type CategoriesContentProps = {
    data: ShopCategory[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
    searchName: string;
};

function buildQuery(params: { page?: number; name?: string }) {
    const q = new URLSearchParams();
    if (params.page != null && params.page > 1) q.set('page', String(params.page));
    if (params.name?.trim()) q.set('name', params.name.trim());
    return q.toString() ? `?${q.toString()}` : '';
}

export function CategoriesContent({ data, pagination, searchName }: CategoriesContentProps) {
    const router = useRouter();

    const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const name = (form.elements.namedItem('name') as HTMLInputElement).value;
        const query = buildQuery({ page: 1, name: name || undefined });
        router.push(`/manage/categories${query}`);
    };

    const { page, totalPages } = pagination;

    const pageNumbers: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
    } else {
        pageNumbers.push(1);
        if (page > 3) pageNumbers.push('ellipsis');
        for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
            if (!pageNumbers.includes(i)) pageNumbers.push(i);
        }
        if (page < totalPages - 2) pageNumbers.push('ellipsis');
        if (totalPages > 1) pageNumbers.push(totalPages);
    }

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <h1 className="text-[14px] font-semibold uppercase tracking-[0.3em] text-[#6e4a34]">Manage Categories</h1>

            <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Name</span>
                    <Input name="name" type="search" placeholder="Search by name" defaultValue={searchName} className="w-48 min-w-0 sm:w-56" />
                </label>
                <Button type="submit" variant="sweet" className="shrink-0">
                    Search
                </Button>
            </form>

            <div className="flex flex-col gap-2 text-xs text-[#6e4a34] sm:flex-row sm:items-center sm:justify-between">
                <p className="w-64">
                    Showing {data.length} of {pagination.total} categories
                    {searchName && ' (filtered)'}.
                </p>

                {totalPages > 1 && (
                    <Pagination>
                        <PaginationContent>
                            {pageNumbers.map((n, i) =>
                                n === 'ellipsis' ? (
                                    <PaginationItem key={`ellipsis-${i}`}>
                                        <PaginationEllipsis />
                                    </PaginationItem>
                                ) : (
                                    <PaginationItem key={n}>
                                        <PaginationLink
                                            href={`/manage/categories${buildQuery({
                                                page: n,
                                                name: searchName || undefined,
                                            })}`}
                                            isActive={page === n}
                                        >
                                            {n}
                                        </PaginationLink>
                                    </PaginationItem>
                                ),
                            )}
                        </PaginationContent>
                    </Pagination>
                )}
            </div>

            {data.length === 0 ? (
                <p className="rounded-2xl border border-[#c49a78] bg-[#f8eddf] p-6 text-center text-xs text-[#6e4a34]">No categories found.</p>
            ) : (
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {data.map((c) => (
                        <li key={c.id}>
                            <article className="rounded-2xl border border-[#c49a78] bg-[#f8eddf] p-4 transition-colors">
                                <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-[#4a2518]">{c.name || '—'}</p>
                                <p className="mt-0.5 truncate text-[11px] text-[#6e4a34]">{c.navName ? `/shop/${c.id}/${c.navName}` : '—'}</p>
                                <div className="mt-1 flex flex-wrap gap-1.5">
                                    {!c.isActive && <span className="rounded bg-amber-700/80 px-1.5 py-0.5 text-[10px] uppercase text-white">Inactive</span>}
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <Link href={`/manage/categories/${c.id}`} className={cn(buttonVariants({ variant: 'sweet' }), 'text-[11px]')}>
                                        Edit
                                    </Link>
                                    {c.isActive && c.navName ? (
                                        <Link
                                            href={buildShopCategoryPath(c.id, c.navName)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={cn(buttonVariants({ variant: 'outline' }), 'text-[11px]')}
                                        >
                                            View
                                        </Link>
                                    ) : null}
                                </div>
                            </article>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
