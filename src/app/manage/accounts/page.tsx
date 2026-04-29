import { Suspense } from 'react';
import { getPaginatedAccountsFromDB } from '@/lib/db-pg/actions/account';
import { AccountsContent } from './accounts-content';

const PER_PAGE = 50;

type Props = {
    searchParams: Promise<{ page?: string; name?: string; accountMateId?: string }>;
};

export default async function ManageAccountsPage({ searchParams }: Props) {
    const params = await searchParams;
    const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
    const name = params.name?.trim() ?? '';
    const accountMateId = params.accountMateId?.trim() ?? '';

    const result = await getPaginatedAccountsFromDB({
        page,
        limit: PER_PAGE,
        name: name || undefined,
        accountMateId: accountMateId || undefined,
    });

    return (
        <Suspense fallback={<div className="mx-auto max-w-7xl text-xs text-[#6e4a34]">Loading accounts…</div>}>
            <AccountsContent
                data={result.data}
                pagination={result.pagination}
                searchName={name}
                searchAccountMateId={accountMateId}
            />
        </Suspense>
    );
}
