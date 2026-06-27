'use client';

import Link from 'next/link';
import moment from 'moment-timezone';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationEllipsis } from '@/components/ui/pagination';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ManageActiveCartListRow } from '@/lib/db-pg/actions/cart';

type ActiveCartsContentProps = {
    data: ManageActiveCartListRow[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
};

function buildQuery(params: { page?: number }) {
    const q = new URLSearchParams();
    if (params.page != null && params.page > 1) q.set('page', String(params.page));
    return q.toString() ? `?${q.toString()}` : '';
}

function formatCartDateCentral(date: string | null): string {
    if (!date) return '—';
    return moment.utc(date).local().format('MM/DD/YYYY hh:mm A');
}

function formatContactName(firstName: string | null, lastName: string | null): string | null {
    const name = [firstName?.trim(), lastName?.trim()].filter(Boolean).join(' ');
    return name || null;
}

export function ActiveCartsContent({ data, pagination }: ActiveCartsContentProps) {
    const { page, totalPages } = pagination;

    const listHref = `/manage/orders/active-carts${buildQuery({ page })}`;

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
            <h1 className="text-[14px] font-semibold uppercase tracking-[0.3em] text-[#6e4a34]">Active Carts</h1>

            <div className="flex flex-col gap-2 text-xs text-[#6e4a34] sm:flex-row sm:items-center sm:justify-between">
                <p>
                    Showing {data.length} of {pagination.total} active cart{pagination.total === 1 ? '' : 's'}.
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
                                            href={`/manage/orders/active-carts${buildQuery({ page: n })}`}
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
                <p className="rounded-2xl border border-[#c49a78] bg-[#f8eddf] p-6 text-center text-xs text-[#6e4a34]">No active carts found.</p>
            ) : (
                <div className="overflow-x-auto rounded-md border border-[#c49a78] bg-[#f8eddf]">
                    <table className="min-w-full border-collapse text-xs text-[#4a2518]">
                        <thead className="bg-[#e3cbb0] text-[11px] uppercase tracking-[0.16em]">
                            <tr>
                                <th className="px-3 py-2 text-left min-w-40">AccountMate ID</th>
                                <th className="px-3 py-2 text-center w-32 whitespace-nowrap">Total Products</th>
                                <th className="px-3 py-2 text-right w-32">Total Price</th>
                                <th className="px-3 py-2 text-center w-44 whitespace-nowrap">Create Date</th>
                                <th className="px-3 py-2 text-center w-44 whitespace-nowrap">Modified Date</th>
                                <th className="px-3 py-2 text-right w-20"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row, idx) => {
                                const isEven = idx % 2 === 0;
                                const accountHref = row.accountMateId
                                    ? `/manage/accounts?accountMateId=${encodeURIComponent(row.accountMateId)}`
                                    : `/manage/accounts`;
                                const detailHref = `/manage/orders/active-carts/${row.id}?returnTo=${encodeURIComponent(listHref)}`;
                                const contactName = formatContactName(row.contactFirstName, row.contactLastName);

                                return (
                                    <tr key={row.id} className={isEven ? 'bg-[#fdf7ef] font-mono' : 'bg-[#f8eddf] font-mono'}>
                                        <td className="px-3 py-2 align-middle text-[11px] font-sans text-left">
                                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                                {row.accountMateId?.trim() ? (
                                                    <Link href={accountHref} className="font-mono text-[#4a2518] underline-offset-2 hover:underline">
                                                        {row.accountMateId.trim()}
                                                    </Link>
                                                ) : (
                                                    <span className="font-mono">—</span>
                                                )}
                                                {contactName ? <span className="text-[#6e4a34]">{contactName}</span> : null}
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 align-middle text-center text-[11px] tabular-nums">{row.totalProducts}</td>
                                        <td className="px-3 py-2 align-middle text-right text-[11px] font-semibold tabular-nums">
                                            ${Number(row.total).toFixed(2)}
                                        </td>
                                        <td className="px-3 py-2 align-middle text-center text-[11px] tabular-nums">
                                            {formatCartDateCentral(row.createDate)}
                                        </td>
                                        <td className="px-3 py-2 align-middle text-center text-[11px] tabular-nums">
                                            {formatCartDateCentral(row.modifiedDate)}
                                        </td>
                                        <td className="px-3 py-2 align-middle text-right text-[11px]">
                                            <Link
                                                href={detailHref}
                                                className={cn(buttonVariants({ variant: 'sweet' }), 'px-3 py-1 text-[10px] tracking-[0.15em]')}
                                            >
                                                View
                                            </Link>
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
