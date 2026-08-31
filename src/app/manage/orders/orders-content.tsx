'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationEllipsis } from '@/components/ui/pagination';
import { Button, buttonVariants } from '@/components/ui/button';
import { DatePicker, parseIsoDate } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { reloadOnSearchClear } from '@/lib/manage-search-clear';
import { cn } from '@/lib/utils';
import moment from 'moment-timezone';

function isValidDateParam(s: string): boolean {
    return parseIsoDate(s) != null;
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
    shipping: string;
    tax: string;
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
    searchAccountMateId: string;
    searchEmail: string;
};

function buildQuery(params: {
    page?: number;
    from?: string;
    to?: string;
    accountMateId?: string;
    email?: string;
}) {
    const q = new URLSearchParams();
    if (params.page != null && params.page > 1) q.set('page', String(params.page));
    if (params.from) q.set('from', params.from);
    if (params.to) q.set('to', params.to);
    if (params.accountMateId?.trim()) q.set('accountMateId', params.accountMateId.trim());
    if (params.email?.trim()) q.set('email', params.email.trim());
    return q.toString() ? `?${q.toString()}` : '';
}

export function OrdersContent({
    data,
    pagination,
    dateFrom,
    dateTo,
    searchAccountMateId,
    searchEmail,
}: OrdersContentProps) {
    const { page, totalPages } = pagination;
    const router = useRouter();
    const searchParams = useSearchParams();

    const [fromInput, setFromInput] = useState(dateFrom ?? '');
    const [toInput, setToInput] = useState(dateTo ?? '');

    const applyFilters = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        let from = fromInput.trim();
        let to = toInput.trim();
        const accountMateId = (e.currentTarget.elements.namedItem('accountMateId') as HTMLInputElement).value.trim();
        const email = (e.currentTarget.elements.namedItem('email') as HTMLInputElement).value.trim();

        const params = new URLSearchParams(searchParams.toString());
        params.delete('page');

        if (from && isValidDateParam(from)) {
            params.set('from', from);
        } else {
            params.delete('from');
            from = '';
        }

        if (to && isValidDateParam(to)) {
            params.set('to', to);
        } else {
            params.delete('to');
            to = '';
        }

        const fromDate = from ? new Date(from + 'T12:00:00.000Z') : null;
        const toDate = to ? new Date(to + 'T12:00:00.000Z') : null;
        if (fromDate && toDate && fromDate > toDate) {
            params.set('from', to);
            params.set('to', from);
        }

        if (accountMateId) params.set('accountMateId', accountMateId);
        else params.delete('accountMateId');

        if (email) params.set('email', email);
        else params.delete('email');

        router.push(`/manage/orders${params.toString() ? `?${params.toString()}` : ''}`);
    };

    const clearFilters = () => {
        router.push('/manage/orders');
    };

    const listHref = `/manage/orders${buildQuery({
        page,
        from: dateFrom,
        to: dateTo,
        accountMateId: searchAccountMateId || undefined,
        email: searchEmail || undefined,
    })}`;

    const isFiltered = Boolean(dateFrom || dateTo || searchAccountMateId || searchEmail);

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
        <div className="mx-auto flex h-full w-full max-w-7xl flex-col gap-4 overflow-hidden">
            <h1 className="shrink-0 text-[14px] font-semibold uppercase tracking-[0.3em] text-[#6e4a34]">Manage Orders</h1>

            <form
                onSubmit={applyFilters}
                className="flex shrink-0 flex-wrap items-end gap-3 rounded-md border border-[#c49a78] bg-[#fdf7ef] px-3 py-2 text-xs text-[#6e4a34]"
            >
                <DatePicker
                    label="From"
                    value={fromInput || undefined}
                    onChange={(value) => setFromInput(value ?? '')}
                    placeholder="Start date"
                />
                <DatePicker
                    label="To"
                    value={toInput || undefined}
                    onChange={(value) => setToInput(value ?? '')}
                    placeholder="End date"
                />
                <div className="flex flex-col gap-1">
                    <Label htmlFor="orders-accountMateId" className="text-[11px] tracking-[0.2em] text-[#6e4a34]">
                        AccountMate ID
                    </Label>
                    <Input
                        id="orders-accountMateId"
                        name="accountMateId"
                        type="search"
                        placeholder="Search by AM ID"
                        defaultValue={searchAccountMateId}
                        className="h-8 w-36 min-w-0 sm:w-40"
                        onChange={(e) =>
                            reloadOnSearchClear(e, searchAccountMateId, () =>
                                router.push(
                                    `/manage/orders${buildQuery({
                                        page: 1,
                                        from: dateFrom,
                                        to: dateTo,
                                        email: searchEmail || undefined,
                                    })}`,
                                ),
                            )
                        }
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <Label htmlFor="orders-email" className="text-[11px] tracking-[0.2em] text-[#6e4a34]">
                        Email
                    </Label>
                    <Input
                        id="orders-email"
                        name="email"
                        type="search"
                        placeholder="Search by email"
                        defaultValue={searchEmail}
                        className="h-8 w-44 min-w-0 sm:w-52"
                        onChange={(e) =>
                            reloadOnSearchClear(e, searchEmail, () =>
                                router.push(
                                    `/manage/orders${buildQuery({
                                        page: 1,
                                        from: dateFrom,
                                        to: dateTo,
                                        accountMateId: searchAccountMateId || undefined,
                                    })}`,
                                ),
                            )
                        }
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Button type="submit" variant="outline" className="h-8 shrink-0 px-3">
                        Apply
                    </Button>
                    <Button type="button" variant="outline" onClick={clearFilters} className="h-8 shrink-0 px-3">
                        Clear
                    </Button>
                </div>
                <p className="pb-1 sm:ml-auto">
                    Showing {data.length} of {pagination.total} orders{isFiltered ? ' (filtered)' : ''}.
                </p>
                {totalPages > 1 ? (
                    <Pagination className="pb-0.5 sm:ml-auto">
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
                                                accountMateId: searchAccountMateId || undefined,
                                                email: searchEmail || undefined,
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
                ) : null}
            </form>

            <div className="min-h-0 flex-1 overflow-hidden pb-2.5">
                {data.length === 0 ? (
                    <p className="rounded-2xl border border-[#c49a78] bg-[#f8eddf] p-6 text-center text-xs text-[#6e4a34]">No orders found.</p>
                ) : (
                    <div className="h-full overflow-auto rounded-md border border-[#c49a78] bg-[#f8eddf]">
                        <table className="min-w-full border-collapse text-xs text-[#4a2518]">
                            <thead className="sticky top-0 z-10 bg-[#e3cbb0] text-[11px] uppercase tracking-[0.16em]">
                            <tr>
                                <th className="px-3 py-2 text-center w-28">Order #</th>
                                <th className="px-3 py-2 text-center w-28">AM Order #</th>
                                <th className="px-3 py-2 text-left min-w-40">Customer</th>
                                <th className="px-3 py-2 text-[11px] tabular-nums w-44 text-center">Date</th>
                                <th className="px-3 py-2 text-right w-24">Shipping</th>
                                <th className="px-3 py-2 text-right w-24">Tax</th>
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
                                        <td className="px-3 py-2 align-middle text-right text-[11px] tabular-nums">${Number(o.shipping).toFixed(2)}</td>
                                        <td className="px-3 py-2 align-middle text-right text-[11px] tabular-nums">${Number(o.tax).toFixed(2)}</td>
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
        </div>
    );
}
