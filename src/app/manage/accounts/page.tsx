import { Suspense } from 'react';
import { getPaginatedAccountsFromDB } from '@/lib/db-pg/actions/account';
import { getShoppingMenusFromDB } from '@/lib/db-pg/actions/menu';
import { AccountsContent } from './accounts-content';

const PER_PAGE = 96;

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
    const menus = await getShoppingMenusFromDB();

    return (
        <Suspense fallback={<div className="mx-auto w-full max-w-7xl text-xs text-[#6e4a34]">Loading accounts…</div>}>
            <div className="flex h-full min-h-0 flex-col">
                <AccountsContent
                    data={result.data}
                    menus={menus}
                    pagination={result.pagination}
                    searchName={name}
                    searchAccountMateId={accountMateId}
                />
            </div>
        </Suspense>
    );
}
