'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationEllipsis } from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EditProductSheet } from './edit-product-sheet';
import { RemoteImage } from '@/components/remote-image';
import type { ProductStatusFilter } from '@/lib/product-status-filter';
import { reloadOnSearchClear } from '@/lib/manage-search-clear';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type ProductRow = {
    id: number;
    name: string | null;
    itemNumber: string | null;
    price: string;
    isActive: boolean;
    productImages?: Array<{ vercelImage: { path: string; name: string } | null }>;
};

type ProductsContentProps = {
    data: ProductRow[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
    searchName: string;
    searchItemNumber: string;
    status: ProductStatusFilter;
    /** Base path for search, filters, and pagination (no query string). */
    basePath?: string;
    categoryName?: string;
};

const STATUS_LABELS: Record<ProductStatusFilter, string> = {
    all: 'All products',
    active: 'Active',
    inactive: 'Inactive',
};

function buildQuery(params: { page?: number; name?: string; itemNumber?: string; status?: ProductStatusFilter }) {
    const q = new URLSearchParams();
    if (params.page != null && params.page > 1) q.set('page', String(params.page));
    if (params.name?.trim()) q.set('name', params.name.trim());
    if (params.itemNumber?.trim()) q.set('itemNumber', params.itemNumber.trim());
    if (params.status && params.status !== 'all') q.set('status', params.status);
    return q.toString() ? `?${q.toString()}` : '';
}

function buildProductsHref(basePath: string, params: { page?: number; name?: string; itemNumber?: string; status?: ProductStatusFilter }) {
    return `${basePath}${buildQuery(params)}`;
}

export function ProductsContent({
    data,
    pagination,
    searchName,
    searchItemNumber,
    status,
    basePath = '/manage/products',
    categoryName,
}: ProductsContentProps) {
    const router = useRouter();
    const [editingProductId, setEditingProductId] = useState<number | null>(null);

    const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const name = (form.elements.namedItem('name') as HTMLInputElement).value;
        const itemNumber = (form.elements.namedItem('itemNumber') as HTMLInputElement).value;
        router.push(buildProductsHref(basePath, { page: 1, name: name || undefined, itemNumber: itemNumber || undefined, status }));
    };

    function handleStatusChange(nextStatus: ProductStatusFilter) {
        router.push(
            buildProductsHref(basePath, {
                page: 1,
                name: searchName || undefined,
                itemNumber: searchItemNumber || undefined,
                status: nextStatus,
            }),
        );
    }

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

    function ProductsPaginationBar({ idPrefix }: { idPrefix: string }) {
        if (totalPages <= 1) {
            return null;
        }

        return (
            <Pagination>
                <PaginationContent>
                    {pageNumbers.map((n, i) =>
                        n === 'ellipsis' ? (
                            <PaginationItem key={`${idPrefix}-ellipsis-${i}`}>
                                <PaginationEllipsis />
                            </PaginationItem>
                        ) : (
                            <PaginationItem key={`${idPrefix}-${n}`}>
                                <PaginationLink
                                    href={buildProductsHref(basePath, {
                                        page: n,
                                        name: searchName || undefined,
                                        itemNumber: searchItemNumber || undefined,
                                        status,
                                    })}
                                    isActive={page === n}
                                >
                                    {n}
                                </PaginationLink>
                            </PaginationItem>
                        ),
                    )}
                </PaginationContent>
            </Pagination>
        );
    }

    return (
        <div className="mx-auto flex h-full w-full max-w-7xl flex-col gap-4 overflow-hidden">
            <EditProductSheet key={editingProductId ?? 'closed'} productId={editingProductId} onClose={() => setEditingProductId(null)} onSaved={() => router.refresh()} />

            <h1 className="shrink-0 text-[15px] font-bold uppercase tracking-[0.3em] text-[#4a2518]">
                {categoryName ? `${categoryName} — Products` : 'Manage Products'}
            </h1>

            <form onSubmit={handleSearch} className="flex shrink-0 flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Status</span>
                    <Select value={status} onValueChange={(value) => handleStatusChange(value as ProductStatusFilter)}>
                        <SelectTrigger className="w-44 min-w-0 border-[#d1b79a] bg-white text-sm font-normal normal-case shadow-none">
                            <SelectValue placeholder="All products" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{STATUS_LABELS.all}</SelectItem>
                            <SelectItem value="active">{STATUS_LABELS.active}</SelectItem>
                            <SelectItem value="inactive">{STATUS_LABELS.inactive}</SelectItem>
                        </SelectContent>
                    </Select>
                </label>
                <label className="flex flex-col gap-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Name</span>
                    <Input
                        name="name"
                        type="search"
                        placeholder="Search by name"
                        defaultValue={searchName}
                        className="w-48 min-w-0 sm:w-56"
                        onChange={(e) =>
                            reloadOnSearchClear(e, searchName, () =>
                                router.push(buildProductsHref(basePath, { page: 1, itemNumber: searchItemNumber || undefined, status })),
                            )
                        }
                    />
                </label>
                <label className="flex flex-col gap-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Item number</span>
                    <Input
                        name="itemNumber"
                        type="search"
                        placeholder="Search by item #"
                        defaultValue={searchItemNumber}
                        className="w-36 min-w-0 sm:w-40"
                        onChange={(e) =>
                            reloadOnSearchClear(e, searchItemNumber, () =>
                                router.push(buildProductsHref(basePath, { page: 1, name: searchName || undefined, status })),
                            )
                        }
                    />
                </label>
                <Button type="submit" variant="sweet" className="shrink-0">
                    Search
                </Button>
            </form>

            <div className="flex shrink-0 flex-col gap-2 text-xs font-medium text-[#5b3a2a] sm:flex-row sm:items-center sm:justify-between">
                <p className="shrink-0 whitespace-nowrap">
                    Showing {data.length} of {pagination.total} {STATUS_LABELS[status].toLowerCase()}
                    {(searchName || searchItemNumber || status !== 'all') && ' (filtered)'}.
                </p>

                <ProductsPaginationBar idPrefix="top" />
            </div>

            <div className="min-h-0 flex-1 overflow-hidden pb-2.5">
                <div className="h-full overflow-y-auto rounded-md border border-[#c49a78] bg-[#f8eddf] p-3 sm:p-4">
                    {data.length === 0 ? (
                        <p className="rounded-2xl border-2 border-[#a67c5b] bg-[#faf0e6] p-6 text-center text-sm font-medium text-[#4a2518]">
                            No products found.
                        </p>
                    ) : (
                        <ul className="grid auto-rows-fr gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                            {data.map((p) => {
                                const firstImage = p.productImages?.[0]?.vercelImage?.path;
                                return (
                                    <li key={p.id} className="h-full">
                                        <article className={cn('flex h-full flex-col rounded-2xl border-2 border-[#a67c5b] bg-[#faf0e6] shadow-md overflow-hidden transition-all hover:shadow-lg hover:border-[#8b6342]')}>
                                            <div className="relative aspect-square w-full shrink-0 bg-[#ffffff]">
                                                {firstImage ? (
                                                    <RemoteImage
                                                        src={firstImage}
                                                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 256px"
                                                        className="brightness-110"
                                                    />
                                                ) : (
                                                    <div className="flex h-full items-center justify-center text-[11px] font-medium uppercase tracking-wider text-[#6e4a34]">No image</div>
                                                )}
                                            </div>
                                            <div className="flex flex-1 flex-col p-3">
                                                <p className="line-clamp-4 min-h-[4.5rem] text-[12px] font-bold uppercase leading-snug tracking-[0.1em] text-[#4a2518]">{p.name || '—'}</p>
                                                <p className="mt-0.5 text-[10px] font-medium text-[#6e4a34]">ID {p.id}</p>
                                                <p className="mt-0.5 text-[11px] font-medium text-[#5b3a2a]">{p.itemNumber ? `#${p.itemNumber}` : '—'}</p>
                                                <p className="mt-1 mb-4 text-sm font-semibold text-[#4a2518]">
                                                    ${Number(p.price).toFixed(2)}
                                                    {!p.isActive && <span className="ml-4 text-[13px] font-medium text-red-700">Inactive</span>}
                                                </p>
                                                <Button type="button" variant="sweet" className="mt-auto w-full text-[11px]" onClick={() => setEditingProductId(p.id)}>
                                                    Edit
                                                </Button>
                                            </div>
                                        </article>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
