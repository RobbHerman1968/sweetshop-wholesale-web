'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import moment from 'moment-timezone';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationEllipsis } from '@/components/ui/pagination';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatPhoneDisplay } from '@/lib/checkout-utils';
import { reloadOnSearchClear } from '@/lib/manage-search-clear';
import { cn } from '@/lib/utils';
import type { ManageApplicationListRow } from '@/lib/db-pg/actions/application';

type ApplicationsContentProps = {
    data: ManageApplicationListRow[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
    search: string;
};

function buildQuery(params: { page?: number; search?: string }) {
    const q = new URLSearchParams();
    if (params.page != null && params.page > 1) q.set('page', String(params.page));
    if (params.search?.trim()) q.set('search', params.search.trim());
    return q.toString() ? `?${q.toString()}` : '';
}

function formatSubmittedAt(value: string) {
    return moment.utc(value).local().format('MM/DD/YYYY hh:mm A');
}

function contactName(row: ManageApplicationListRow) {
    return [row.contactFirstName.trim(), row.contactLastName.trim()].filter(Boolean).join(' ') || '—';
}

export function ApplicationsContent({ data, pagination, search }: ApplicationsContentProps) {
    const router = useRouter();
    const { page, totalPages, total } = pagination;
    const listHref = `/manage/applications${buildQuery({ page, search: search || undefined })}`;

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

    function handleSearch(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const form = e.currentTarget;
        const nextSearch = (form.elements.namedItem('search') as HTMLInputElement).value;
        router.push(`/manage/applications${buildQuery({ page: 1, search: nextSearch || undefined })}`);
    }

    return (
        <div className="mx-auto flex h-full w-full max-w-7xl flex-col gap-4 overflow-hidden">
            <div className="shrink-0">
                <h1 className="text-[14px] font-semibold uppercase tracking-[0.3em] text-[#6e4a34]">Applications</h1>
                <p className="mt-2 text-xs text-[#6e4a34]">Wholesale Apply Now submissions, newest first.</p>
            </div>

            <form onSubmit={handleSearch} className="flex shrink-0 flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Search</span>
                    <Input
                        name="search"
                        type="search"
                        placeholder="Business, contact, email, phone…"
                        defaultValue={search}
                        className="w-64 min-w-0 sm:w-80"
                        onChange={(e) =>
                            reloadOnSearchClear(e, search, () => router.push(`/manage/applications${buildQuery({ page: 1 })}`))
                        }
                    />
                </label>
                <Button type="submit" variant="sweet" className="shrink-0">
                    Search
                </Button>
            </form>

            <div className="flex shrink-0 flex-col gap-2 text-xs text-[#6e4a34] sm:flex-row sm:items-center sm:justify-between">
                <p>
                    Showing {data.length} of {total} application{total === 1 ? '' : 's'}
                    {search ? ' (filtered)' : ''}.
                </p>

                {totalPages > 1 ? (
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
                                            href={`/manage/applications${buildQuery({ page: n, search: search || undefined })}`}
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
            </div>

            {data.length === 0 ? (
                <p className="rounded-2xl border border-[#c49a78] bg-[#f8eddf] p-6 text-center text-xs text-[#6e4a34]">
                    No applications found.
                </p>
            ) : (
                <div className="min-h-0 flex-1 overflow-auto rounded-md border border-[#c49a78] bg-[#f8eddf]">
                    <table className="min-w-full border-collapse text-xs text-[#4a2518]">
                        <thead className="sticky top-0 z-10 bg-[#e3cbb0] text-[11px] uppercase tracking-[0.16em]">
                            <tr>
                                <th className="px-3 py-2 text-left">Submitted</th>
                                <th className="px-3 py-2 text-left">Business</th>
                                <th className="px-3 py-2 text-left">Contact</th>
                                <th className="px-3 py-2 text-left">Email</th>
                                <th className="px-3 py-2 text-left">Phone</th>
                                <th className="px-3 py-2 text-left">Location</th>
                                <th className="px-3 py-2 text-right w-20"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row, idx) => (
                                <tr key={row.id} className={idx % 2 === 0 ? 'bg-[#fdf7ef]' : 'bg-[#f8eddf]'}>
                                    <td className="whitespace-nowrap px-3 py-2 align-middle tabular-nums">
                                        {formatSubmittedAt(row.createdAt)}
                                    </td>
                                    <td className="px-3 py-2 align-middle font-semibold">{row.businessName}</td>
                                    <td className="px-3 py-2 align-middle">{contactName(row)}</td>
                                    <td className="px-3 py-2 align-middle">{row.email}</td>
                                    <td className="whitespace-nowrap px-3 py-2 align-middle">{formatPhoneDisplay(row.phone)}</td>
                                    <td className="px-3 py-2 align-middle">
                                        {[row.city.trim(), row.state.trim()].filter(Boolean).join(', ') || '—'}
                                    </td>
                                    <td className="px-3 py-2 align-middle text-right">
                                        <Link
                                            href={`/manage/applications/${row.id}?returnTo=${encodeURIComponent(listHref)}`}
                                            className={cn(buttonVariants({ variant: 'outline' }), 'text-[11px]')}
                                        >
                                            View
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
