import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAccountByIdForManage } from '@/lib/db-pg/actions/account';
import { getShoppingMenusFromDB } from '@/lib/db-pg/actions/menu';
import { EditAccountContent } from './edit-account-content';

type Props = {
    params: Promise<{ accountId: string }>;
    searchParams: Promise<{ returnTo?: string }>;
};

function resolveBackHref(returnTo: string | undefined): string {
    if (returnTo?.startsWith('/manage/accounts')) {
        return returnTo;
    }
    return '/manage/accounts';
}

export default async function ManageEditAccountPage({ params, searchParams }: Props) {
    const { accountId: accountIdParam } = await params;
    const { returnTo } = await searchParams;
    const accountId = parseInt(accountIdParam, 10);
    const [manageAccount, shoppingMenus] = await Promise.all([
        Number.isFinite(accountId) ? getAccountByIdForManage(accountId) : Promise.resolve(null),
        getShoppingMenusFromDB(),
    ]);

    if (!manageAccount) {
        notFound();
    }

    const backHref = resolveBackHref(returnTo);

    return (
        <div className="mx-auto w-full max-w-7xl space-y-6">
            <div className="flex flex-wrap items-center gap-3">
                <Link href={backHref} className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34] underline-offset-4 hover:underline">
                    ← Back to accounts
                </Link>
            </div>
            <EditAccountContent account={manageAccount} menus={shoppingMenus} backHref={backHref} />
        </div>
    );
}
