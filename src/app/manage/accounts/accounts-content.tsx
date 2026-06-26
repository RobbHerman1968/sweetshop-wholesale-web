'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationEllipsis } from '@/components/ui/pagination';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { reloadOnSearchClear } from '@/lib/manage-search-clear';
import { cn } from '@/lib/utils';

type AccountRow = {
    id: number;
    accountMateId: string | null;
    name: string | null;
    contactFirstName: string | null;
    contactLastName: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
};

type AccountsContentProps = {
    data: AccountRow[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
    searchName: string;
    searchAccountMateId: string;
};

function buildQuery(params: { page?: number; name?: string; accountMateId?: string }) {
    const q = new URLSearchParams();
    if (params.page != null && params.page > 1) q.set('page', String(params.page));
    if (params.name?.trim()) q.set('name', params.name.trim());
    if (params.accountMateId?.trim()) q.set('accountMateId', params.accountMateId.trim());
    return q.toString() ? `?${q.toString()}` : '';
}

export function AccountsContent({ data, pagination, searchName, searchAccountMateId }: AccountsContentProps) {
    const router = useRouter();

    const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const name = (form.elements.namedItem('name') as HTMLInputElement).value;
        const accountMateId = (form.elements.namedItem('accountMateId') as HTMLInputElement).value;
        const query = buildQuery({ page: 1, name: name || undefined, accountMateId: accountMateId || undefined });
        router.push(`/manage/accounts${query}`);
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

    const listHref = `/manage/accounts${buildQuery({ page, name: searchName || undefined, accountMateId: searchAccountMateId || undefined })}`;

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <h1 className="text-[14px] font-semibold uppercase tracking-[0.3em] text-[#6e4a34]">Manage Accounts</h1>

            <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Account name</span>
                    <Input
                        name="name"
                        type="search"
                        placeholder="Search by name"
                        defaultValue={searchName}
                        className="w-48 min-w-0 sm:w-56"
                        onChange={(e) =>
                            reloadOnSearchClear(e, searchName, () =>
                                router.push(`/manage/accounts${buildQuery({ page: 1, accountMateId: searchAccountMateId || undefined })}`),
                            )
                        }
                    />
                </label>
                <label className="flex flex-col gap-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">AccountMate ID</span>
                    <Input
                        name="accountMateId"
                        type="search"
                        placeholder="Search by AccountMate ID"
                        defaultValue={searchAccountMateId}
                        className="w-40 min-w-0 sm:w-48"
                        onChange={(e) =>
                            reloadOnSearchClear(e, searchAccountMateId, () =>
                                router.push(`/manage/accounts${buildQuery({ page: 1, name: searchName || undefined })}`),
                            )
                        }
                    />
                </label>
                <Button type="submit" variant="sweet" className="shrink-0">
                    Search
                </Button>
            </form>

            <div className="flex flex-col gap-2 text-xs text-[#6e4a34] sm:flex-row sm:items-center sm:justify-between">
                <p className="w-64">
                    Showing {data.length} of {pagination.total} accounts
                    {(searchName || searchAccountMateId) && ' (filtered)'}.
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
                                            href={`/manage/accounts${buildQuery({
                                                page: n,
                                                name: searchName || undefined,
                                                accountMateId: searchAccountMateId || undefined,
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
                <p className="rounded-2xl border border-[#c49a78] bg-[#f8eddf] p-6 text-center text-xs text-[#6e4a34]">No accounts found.</p>
            ) : (
                <ul className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {data.map((acc) => (
                        <li key={acc.id}>
                            <article className="rounded-2xl border border-[#c49a78] bg-[#f8eddf] p-4 transition-colors">
                                <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-[#4a2518]">{acc.name || '—'}</p>
                                <p className="mt-0.5 text-[11px] text-[#6e4a34]">{acc.accountMateId ? `ID: ${acc.accountMateId}` : '—'}</p>
                                <p className="mt-1 truncate text-[11px] text-[#6e4a34]">{[acc.contactFirstName, acc.contactLastName].filter(Boolean).join(' ') || '—'}</p>
                                {acc.contactEmail && <p className="mt-0.5 truncate text-[11px] text-[#6e4a34]">{acc.contactEmail}</p>}
                                {acc.contactPhone && <p className="mt-0.5 text-[11px] text-[#6e4a34]">{acc.contactPhone}</p>}
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <Link
                                        href={`/manage/accounts/${acc.id}?returnTo=${encodeURIComponent(listHref)}`}
                                        className={cn(buttonVariants({ variant: 'sweet' }), 'text-[11px]')}
                                    >
                                        Edit
                                    </Link>
                                </div>
                            </article>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
