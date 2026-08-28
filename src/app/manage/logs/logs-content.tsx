'use client';

import Link from 'next/link';
import moment from 'moment-timezone';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationEllipsis } from '@/components/ui/pagination';
import { cn } from '@/lib/utils';
import type { ManageLogRow } from '@/lib/db-pg/actions/log';

type LogsContentProps = {
    data: ManageLogRow[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
};

function buildQuery(page?: number) {
    if (page != null && page > 1) {
        return `?page=${page}`;
    }

    return '';
}

function formatLogTimestamp(value: string) {
    return moment.utc(value).local().format('MM/DD/YYYY hh:mm:ss A');
}

function OutcomeBadge({ outcome }: { outcome: ManageLogRow['outcome'] }) {
    const isSuccess = outcome === 'success';

    return (
        <span
            className={cn(
                'inline-flex rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]',
                isSuccess ? 'bg-[#dcefd8] text-[#24531f]' : 'bg-[#f8d7d7] text-[#7a1f1f]',
            )}
        >
            {outcome}
        </span>
    );
}

export function LogsContent({ data, pagination }: LogsContentProps) {
    const { page, totalPages, total } = pagination;

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
            <div className="shrink-0">
                <h1 className="text-[14px] font-semibold uppercase tracking-[0.3em] text-[#6e4a34]">Log</h1>
                <p className="mt-2 text-xs text-[#6e4a34]">
                    Order, checkout, and email activity, newest first. Showing {data.length} of {total}{' '}
                    {total === 1 ? 'entry' : 'entries'}.
                </p>
            </div>

            {data.length === 0 ? (
                <p className="rounded-2xl border border-[#c49a78] bg-[#f8eddf] p-6 text-center text-xs text-[#6e4a34]">
                    No log entries yet.
                </p>
            ) : (
                <div className="min-h-0 flex-1 overflow-auto rounded-md border border-[#c49a78] bg-[#f8eddf]">
                    <table className="min-w-full border-collapse text-xs text-[#4a2518]">
                        <thead className="sticky top-0 z-10 bg-[#e3cbb0] text-[11px] uppercase tracking-[0.16em]">
                            <tr>
                                <th className="px-3 py-2 text-left">When</th>
                                <th className="px-3 py-2 text-left">Outcome</th>
                                <th className="px-3 py-2 text-left">Stage</th>
                                <th className="min-w-56 px-3 py-2 text-left">Message</th>
                                <th className="px-3 py-2 text-left">Order</th>
                                <th className="px-3 py-2 text-left">AccountMate</th>
                                <th className="min-w-48 px-3 py-2 text-left">Error</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row, idx) => (
                                <tr key={row.id} className={idx % 2 === 0 ? 'bg-[#fdf7ef]' : 'bg-[#f8eddf]'}>
                                    <td className="whitespace-nowrap px-3 py-2 align-top tabular-nums">
                                        {formatLogTimestamp(row.createdAt)}
                                    </td>
                                    <td className="px-3 py-2 align-top">
                                        <OutcomeBadge outcome={row.outcome} />
                                    </td>
                                    <td className="px-3 py-2 align-top">{row.stage || '—'}</td>
                                    <td className="px-3 py-2 align-top">
                                        <span className="line-clamp-4 whitespace-pre-wrap">{row.message}</span>
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-2 align-top">
                                        {row.orderId ? (
                                            <Link
                                                href={`/manage/orders/${row.orderId}`}
                                                className="font-semibold underline-offset-2 hover:underline"
                                            >
                                                {row.orderNumber ? `#${row.orderNumber}` : `ID ${row.orderId}`}
                                            </Link>
                                        ) : (
                                            '—'
                                        )}
                                    </td>
                                    <td className="px-3 py-2 align-top">
                                        <div>{row.accountMateId || '—'}</div>
                                        {row.accountMateOrderNumber ? (
                                            <div className="text-[10px] text-[#6e4a34]">AM #{row.accountMateOrderNumber}</div>
                                        ) : null}
                                    </td>
                                    <td className="px-3 py-2 align-top">
                                        {row.error ? (
                                            <span className="whitespace-pre-wrap break-words text-[#7a1f1f]">{row.error}</span>
                                        ) : (
                                            '—'
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {totalPages > 1 ? (
                <Pagination className="shrink-0">
                    <PaginationContent>
                        {pageNumbers.map((pageNumber, index) =>
                            pageNumber === 'ellipsis' ? (
                                <PaginationItem key={`ellipsis-${index}`}>
                                    <PaginationEllipsis />
                                </PaginationItem>
                            ) : (
                                <PaginationItem key={pageNumber}>
                                    <PaginationLink href={`/manage/logs${buildQuery(pageNumber)}`} isActive={pageNumber === page}>
                                        {pageNumber}
                                    </PaginationLink>
                                </PaginationItem>
                            ),
                        )}
                    </PaginationContent>
                </Pagination>
            ) : null}
        </div>
    );
}
