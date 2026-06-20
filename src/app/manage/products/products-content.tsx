'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationEllipsis } from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EditProductSheet } from './edit-product-sheet';
import { RemoteImage } from '@/components/remote-image';
import { cn } from '@/lib/utils';

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
};

function buildQuery(params: { page?: number; name?: string; itemNumber?: string }) {
    const q = new URLSearchParams();
    if (params.page != null && params.page > 1) q.set('page', String(params.page));
    if (params.name?.trim()) q.set('name', params.name.trim());
    if (params.itemNumber?.trim()) q.set('itemNumber', params.itemNumber.trim());
    return q.toString() ? `?${q.toString()}` : '';
}

export function ProductsContent({ data, pagination, searchName, searchItemNumber }: ProductsContentProps) {
    const router = useRouter();
    const [editingProductId, setEditingProductId] = useState<number | null>(null);

    const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const name = (form.elements.namedItem('name') as HTMLInputElement).value;
        const itemNumber = (form.elements.namedItem('itemNumber') as HTMLInputElement).value;
        const query = buildQuery({ page: 1, name: name || undefined, itemNumber: itemNumber || undefined });
        router.push(`/manage/products${query}`);
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
            <EditProductSheet key={editingProductId ?? 'closed'} productId={editingProductId} onClose={() => setEditingProductId(null)} onSaved={() => router.refresh()} />

            <h1 className="text-[15px] font-bold uppercase tracking-[0.3em] text-[#4a2518]">Manage Products</h1>

            <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Name</span>
                    <Input name="name" type="search" placeholder="Search by name" defaultValue={searchName} className="w-48 min-w-0 sm:w-56" />
                </label>
                <label className="flex flex-col gap-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Item number</span>
                    <Input name="itemNumber" type="search" placeholder="Search by item #" defaultValue={searchItemNumber} className="w-36 min-w-0 sm:w-40" />
                </label>
                <Button type="submit" variant="sweet" className="shrink-0">
                    Search
                </Button>
            </form>

            <div className="flex flex-col gap-2 text-xs font-medium text-[#5b3a2a] sm:flex-row sm:items-center sm:justify-between">
                <p className="w-64">
                    Showing {data.length} of {pagination.total} products
                    {(searchName || searchItemNumber) && ' (filtered)'}.
                </p>

                {totalPages > 1 && (
                    <Pagination>
                        <PaginationContent>
                            {pageNumbers.map((n, i) =>
                                n === 'ellipsis' ? (
                                    <PaginationItem key={`ellipsis-top-${i}`}>
                                        <PaginationEllipsis />
                                    </PaginationItem>
                                ) : (
                                    <PaginationItem key={n}>
                                        <PaginationLink
                                            href={`/manage/products${buildQuery({
                                                page: n,
                                                name: searchName || undefined,
                                                itemNumber: searchItemNumber || undefined,
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
                <p className="rounded-2xl border-2 border-[#a67c5b] bg-[#f8eddf] p-6 text-center text-sm font-medium text-[#4a2518]">No products found.</p>
            ) : (
                <>
                    <ul className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {data.map((p) => {
                            const firstImage = p.productImages?.[0]?.vercelImage?.path;
                            return (
                                <li key={p.id}>
                                    <article className={cn('rounded-2xl border-2 border-[#a67c5b] bg-[#faf0e6] shadow-md overflow-hidden transition-all hover:shadow-lg hover:border-[#8b6342]')}>
                                        <div className="relative aspect-square w-full bg-[#ffffff]">
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
                                        <div className="p-3">
                                            <p className="truncate text-[12px] font-bold uppercase tracking-[0.1em] text-[#4a2518]">{p.name || '—'}</p>
                                            <p className="mt-0.5 text-[11px] font-medium text-[#5b3a2a]">{p.itemNumber ? `#${p.itemNumber}` : '—'}</p>
                                            <p className="mt-1 text-sm font-semibold text-[#4a2518]">
                                                ${Number(p.price).toFixed(2)}
                                                {!p.isActive && <span className="ml-4 text-[13px] font-medium text-red-700">Inactive</span>}
                                            </p>
                                            <Button type="button" variant="sweet" className="mt-2 w-full text-[11px]" onClick={() => setEditingProductId(p.id)}>
                                                Edit
                                            </Button>
                                        </div>
                                    </article>
                                </li>
                            );
                        })}
                    </ul>
                </>
            )}
        </div>
    );
}
