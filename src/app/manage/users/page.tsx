import { Suspense } from 'react';
import { getPaginatedUsersFromDB } from '@/lib/db-pg/actions/users';
import { UsersContent } from './users-content';

const PER_PAGE = 50;

type Props = {
    searchParams: Promise<{ page?: string; userName?: string; lastName?: string }>;
};

export default async function ManageUsersPage({ searchParams }: Props) {
    const params = await searchParams;
    const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
    const userName = params.userName?.trim() ?? '';
    const lastName = params.lastName?.trim() ?? '';

    const result = await getPaginatedUsersFromDB({
        page,
        limit: PER_PAGE,
        userName: userName || undefined,
        lastName: lastName || undefined,
    });

    return (
        <Suspense fallback={<div className="mx-auto max-w-7xl text-xs text-[#6e4a34]">Loading users…</div>}>
            <UsersContent
                data={result.data}
                pagination={result.pagination}
                searchUserName={userName}
                searchLastName={lastName}
            />
        </Suspense>
    );
}
