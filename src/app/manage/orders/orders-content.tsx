'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationEllipsis } from '@/components/ui/pagination';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import moment from 'moment-timezone';

const DATE_INPUT_REGEX = /^\d{4}-\d{2}-\d{2}$/;
function isValidDateParam(s: string): boolean {
    if (!DATE_INPUT_REGEX.test(s)) return false;
    const d = new Date(s + 'T12:00:00.000Z');
    return !Number.isNaN(d.getTime());
}

/** DB stores UTC; ensure we parse as UTC then show in Central (handles driver returning string without Z). */
function formatOrderDateCentral(orderDate: string | null): string {
    if (!orderDate) return '—';
    return moment.utc(orderDate).local().format('MM/DD/YYYY hh:mm A');
}

type OrderRow = {
    id: number;
    orderNumber: number | null;
    orderDate: string | null;
    userId: number;
    accountMateOrderNumber: number | null;
    total: string;
    shippingCode: string | null;
    isNewCustomerOrder: number;
    customerName: string | null;
};

type OrdersContentProps = {
    data: OrderRow[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
    dateFrom?: string;
    dateTo?: string;
};

function buildQuery(params: { page?: number; from?: string; to?: string }) {
    const q = new URLSearchParams();
    if (params.page != null && params.page > 1) q.set('page', String(params.page));
    if (params.from) q.set('from', params.from);
    if (params.to) q.set('to', params.to);
    return q.toString() ? `?${q.toString()}` : '';
}

export function OrdersContent({ data, pagination, dateFrom, dateTo }: OrdersContentProps) {
    const { page, totalPages } = pagination;
    const router = useRouter();
    const searchParams = useSearchParams();

    const [fromInput, setFromInput] = useState(dateFrom ?? '');
    const [toInput, setToInput] = useState(dateTo ?? '');


    const applyFromInputs = () => {
        const from = fromInput.trim();
        const to = toInput.trim();
        const params = new URLSearchParams(searchParams.toString());
        params.delete('page');
        if (!from && !to) {
            params.delete('from');
            params.delete('to');
        } else {
            const fromOk = !from || isValidDateParam(from);
            const toOk = !to || isValidDateParam(to);
            if (fromOk && toOk) {
                if (from) params.set('from', from);
                else params.delete('from');
                if (to) params.set('to', to);
                else params.delete('to');
                const fromDate = from ? new Date(from + 'T12:00:00.000Z') : null;
                const toDate = to ? new Date(to + 'T12:00:00.000Z') : null;
                if (fromDate && toDate && fromDate > toDate) {
                    params.set('from', to);
                    params.set('to', from);
                }
            }
        }
        router.push(`/manage/orders${params.toString() ? `?${params.toString()}` : ''}`);
    };

    const clearRange = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('page');
        params.delete('from');
        params.delete('to');
        router.push(`/manage/orders${params.toString() ? `?${params.toString()}` : ''}`);
    };

    const listHref = `/manage/orders${buildQuery({ page, from: dateFrom, to: dateTo })}`;

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
            <h1 className="text-[14px] font-semibold uppercase tracking-[0.3em] text-[#6e4a34]">Manage Orders</h1>

            <div className="flex flex-col gap-2 text-xs text-[#6e4a34] sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <div className="flex flex-nowrap items-center gap-2">
                        <div className="flex items-center gap-1.5 shrink-0">
                            <label className="text-[11px] font-medium uppercase tracking-wider text-[#7c5b44]">From</label>
                            <Input
                                type="date"
                                value={fromInput}
                                onChange={(e) => setFromInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && applyFromInputs()}
                                className="h-8 w-34 text-xs"
                            />
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <label className="text-[11px] font-medium uppercase tracking-wider text-[#7c5b44]">To</label>
                            <Input
                                type="date"
                                value={toInput}
                                onChange={(e) => setToInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && applyFromInputs()}
                                className="h-8 w-34 text-xs"
                            />
                        </div>
                        <Button variant="outline" onClick={applyFromInputs} className="shrink-0">
                            Apply
                        </Button>
                        <Button variant="outline" onClick={clearRange} className="shrink-0">
                            Clear
                        </Button>
                    </div>
                    <p className="w-64 shrink-0">
                        Showing {data.length} of {pagination.total} orders.
                    </p>
                </div>

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
                                            href={`/manage/orders${buildQuery({
                                                page: n,
                                                from: dateFrom,
                                                to: dateTo,
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
                <p className="rounded-2xl border border-[#c49a78] bg-[#f8eddf] p-6 text-center text-xs text-[#6e4a34]">No orders found.</p>
            ) : (
                <div className="overflow-x-auto rounded-md border border-[#c49a78] bg-[#f8eddf]">
                    <table className="min-w-full border-collapse text-xs text-[#4a2518]">
                        <thead className="bg-[#e3cbb0] text-[11px] uppercase tracking-[0.16em]">
                            <tr>
                                <th className="px-3 py-2 text-center w-28">Order #</th>
                                <th className="px-3 py-2 text-center w-28">AM Order #</th>
                                <th className="px-3 py-2 text-left min-w-40">Customer</th>
                                <th className="px-3 py-2 text-[11px] tabular-nums w-44 text-center">Date</th>
                                <th className="px-3 py-2 text-right w-28">Total</th>
                                <th className="px-3 py-2 text-center w-32">Ship Code</th>
                                <th className="px-3 py-2 text-right w-20"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((o, idx) => {
                                const dateStr = formatOrderDateCentral(o.orderDate);
                                const isEven = idx % 2 === 0;
                                const detailHref = `/manage/orders/${o.id}?returnTo=${encodeURIComponent(listHref)}`;
                                return (
                                    <tr key={o.id} className={isEven ? 'bg-[#fdf7ef] font-mono' : 'bg-[#f8eddf] font-mono'}>
                                        <td className="px-3 py-2 align-middle text-[11px] font-semibold text-center">
                                            <Link href={detailHref} className="text-[#4a2518] underline-offset-2 hover:underline">
                                                #{o.orderNumber ?? o.id}
                                            </Link>
                                        </td>
                                        <td className="px-3 py-2 align-middle text-[11px] text-center">{o.accountMateOrderNumber ?? 'Unknown'}</td>
                                        <td className="px-3 py-2 align-middle text-[11px] font-sans text-left">{o.customerName?.trim() || '—'}</td>
                                        <td className="px-3 py-2 align-middle font-mono text-[11px] tabular-nums text-center">{dateStr}</td>
                                        <td className="px-3 py-2 align-middle text-right text-[11px] font-semibold">${Number(o.total).toFixed(2)}</td>
                                        <td className="px-3 py-2 align-middle text-[11px] font-mono text-center">{o.shippingCode ?? '—'}</td>
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
