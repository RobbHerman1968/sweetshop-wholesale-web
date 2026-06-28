'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationEllipsis } from '@/components/ui/pagination';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { reloadOnSearchClear } from '@/lib/manage-search-clear';
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

            <div className="flex flex-wrap items-end justify-between gap-3">
                <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-3">
                    <label className="flex flex-col gap-1">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Name</span>
                        <Input
                            name="name"
                            type="search"
                            placeholder="Search by name"
                            defaultValue={searchName}
                            className="w-48 min-w-0 sm:w-56"
                            onChange={(e) =>
                                reloadOnSearchClear(e, searchName, () => router.push(`/manage/categories${buildQuery({ page: 1 })}`))
                            }
                        />
                    </label>
                    <Button type="submit" variant="sweet" className="shrink-0">
                        Search
                    </Button>
                </form>
                <Link href="/manage/categories/new" className={cn(buttonVariants({ variant: 'sweet' }), 'text-[11px]')}>
                    Add category
                </Link>
            </div>

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
                <div className="overflow-x-auto rounded-md border border-[#c49a78] bg-[#f8eddf]">
                    <table className="min-w-full border-collapse text-xs text-[#4a2518]">
                        <thead className="bg-[#e3cbb0] text-[11px] uppercase tracking-[0.16em]">
                            <tr>
                                <th className="px-3 py-2 text-left min-w-40">Name</th>
                                <th className="px-3 py-2 text-left min-w-48">Path</th>
                                <th className="w-28 px-3 py-2 text-center">Status</th>
                                <th className="px-3 py-2 text-right min-w-56"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((c, idx) => {
                                const isEven = idx % 2 === 0;

                                return (
                                    <tr key={c.id} className={isEven ? 'bg-[#fdf7ef]' : 'bg-[#f8eddf]'}>
                                        <td className="px-3 py-2 align-middle text-[11px] font-semibold">{c.name || '—'}</td>
                                        <td className="px-3 py-2 align-middle text-[11px] text-[#6e4a34]">
                                            {c.navName ? `/shop/${c.id}/${c.navName}` : '—'}
                                        </td>
                                        <td className="px-3 py-2 align-middle text-center text-[11px]">
                                            {c.isActive ? (
                                                <span className="text-[#4a2518]">Active</span>
                                            ) : (
                                                <span className="inline-block rounded bg-amber-700/80 px-1.5 py-0.5 text-[10px] uppercase text-white">
                                                    Inactive
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 align-middle text-right text-[11px]">
                                            <div className="flex flex-wrap justify-end gap-2">
                                                <Link
                                                    href={`/manage/categories/${c.id}`}
                                                    className={cn(buttonVariants({ variant: 'sweet' }), 'px-3 py-1 text-[10px] tracking-[0.15em]')}
                                                >
                                                    Edit
                                                </Link>
                                                <Link
                                                    href={`/manage/categories/${c.id}/products`}
                                                    className={cn(buttonVariants({ variant: 'outline' }), 'px-3 py-1 text-[10px] tracking-[0.15em]')}
                                                >
                                                    All products
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
