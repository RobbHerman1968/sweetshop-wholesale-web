import { Suspense } from 'react';
import { getManageAccountLinksForAccountMateIds } from '@/lib/db-pg/actions/account';
import { getPaginatedUsersFromDB } from '@/lib/db-pg/actions/users';
import { parseAccountMateId } from '@/lib/wholesale-api';
import { UsersContent } from './users-content';

const PER_PAGE = 50;

type Props = {
    searchParams: Promise<{ page?: string; userName?: string; lastName?: string; accountMateId?: string }>;
};

export default async function ManageUsersPage({ searchParams }: Props) {
    const params = await searchParams;
    const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
    const userName = params.userName?.trim() ?? '';
    const lastName = params.lastName?.trim() ?? '';
    const accountMateId = params.accountMateId?.trim() ?? '';

    const result = await getPaginatedUsersFromDB({
        page,
        limit: PER_PAGE,
        userName: userName || undefined,
        lastName: lastName || undefined,
        accountMateId: accountMateId || undefined,
    });

    const accountLinksByMateId = await getManageAccountLinksForAccountMateIds(result.data.map((row) => row.accountMateId));
    const data = result.data.map((row) => {
        const parsedAccountMateId = parseAccountMateId(row.accountMateId ?? undefined);
        const linkedAccount = parsedAccountMateId ? accountLinksByMateId.get(parsedAccountMateId) ?? null : null;
        return { ...row, linkedAccount };
    });

    return (
        <Suspense fallback={<div className="mx-auto w-full max-w-7xl text-xs text-[#6e4a34]">Loading users…</div>}>
            <div className="flex h-full min-h-0 flex-col">
                <UsersContent
                    data={data}
                    pagination={result.pagination}
                    searchUserName={userName}
                    searchLastName={lastName}
                    searchAccountMateId={accountMateId}
                />
            </div>
        </Suspense>
    );
}
