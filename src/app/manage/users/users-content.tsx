'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationEllipsis } from '@/components/ui/pagination';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type UserRow = {
    id: number;
    userName: string;
    firstName: string | null;
    lastName: string | null;
    isActive: boolean;
    isAdmin: boolean;
};

type UsersContentProps = {
    data: UserRow[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
    searchUserName: string;
    searchLastName: string;
};

function buildQuery(params: { page?: number; userName?: string; lastName?: string }) {
    const q = new URLSearchParams();
    if (params.page != null && params.page > 1) q.set('page', String(params.page));
    if (params.userName?.trim()) q.set('userName', params.userName.trim());
    if (params.lastName?.trim()) q.set('lastName', params.lastName.trim());
    return q.toString() ? `?${q.toString()}` : '';
}

export function UsersContent({ data, pagination, searchUserName, searchLastName }: UsersContentProps) {
    const router = useRouter();

    const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const userName = (form.elements.namedItem('userName') as HTMLInputElement).value;
        const lastName = (form.elements.namedItem('lastName') as HTMLInputElement).value;
        const query = buildQuery({ page: 1, userName: userName || undefined, lastName: lastName || undefined });
        router.push(`/manage/users${query}`);
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

    const listHref = `/manage/users${buildQuery({ page, userName: searchUserName || undefined, lastName: searchLastName || undefined })}`;

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <h1 className="text-[14px] font-semibold uppercase tracking-[0.3em] text-[#6e4a34]">Manage Users</h1>

            <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Username</span>
                    <Input name="userName" type="search" placeholder="Search by username" defaultValue={searchUserName} className="w-48 min-w-0 sm:w-56" />
                </label>
                <label className="flex flex-col gap-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Last name</span>
                    <Input name="lastName" type="search" placeholder="Search by last name" defaultValue={searchLastName} className="w-40 min-w-0 sm:w-48" />
                </label>
                <Button type="submit" variant="sweet" className="shrink-0">
                    Search
                </Button>
            </form>

            <div className="flex flex-col gap-2 text-xs text-[#6e4a34] sm:flex-row sm:items-center sm:justify-between">
                <p className="w-64">
                    Showing {data.length} of {pagination.total} users
                    {(searchUserName || searchLastName) && ' (filtered)'}.
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
                                            href={`/manage/users${buildQuery({
                                                page: n,
                                                userName: searchUserName || undefined,
                                                lastName: searchLastName || undefined,
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
                <p className="rounded-2xl border border-[#c49a78] bg-[#f8eddf] p-6 text-center text-xs text-[#6e4a34]">No users found.</p>
            ) : (
                <ul className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {data.map((u) => (
                        <li key={u.id}>
                            <article className="rounded-2xl border border-[#c49a78] bg-[#f8eddf] p-4 transition-colors">
                                <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-[#4a2518]">{u.userName}</p>
                                <p className="mt-0.5 text-[11px] text-[#6e4a34]">{[u.firstName, u.lastName].filter(Boolean).join(' ') || '—'}</p>
                                <div className="mt-1 flex gap-1.5">
                                    {u.isAdmin && <span className="rounded bg-[#4a2518] px-1.5 py-0.5 text-[10px] uppercase text-[#fdf7ef]">Admin</span>}
                                    {!u.isActive && <span className="rounded bg-amber-700/80 px-1.5 py-0.5 text-[10px] uppercase text-white">Inactive</span>}
                                </div>
                                <div className="mt-3">
                                    <Link
                                        href={`/manage/users/${u.id}?returnTo=${encodeURIComponent(listHref)}`}
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
