import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getManageAccountLinkForAccountMateId } from '@/lib/db-pg/actions/account';
import { getUserByIdForManage } from '@/lib/db-pg/actions/users';
import { EditUserContent } from './edit-user-content';

type Props = {
    params: Promise<{ userId: string }>;
    searchParams: Promise<{ returnTo?: string }>;
};

function resolveBackHref(returnTo: string | undefined): string {
    if (returnTo?.startsWith('/manage/users')) {
        return returnTo;
    }
    return '/manage/users';
}

export default async function ManageEditUserPage({ params, searchParams }: Props) {
    const { userId: userIdParam } = await params;
    const { returnTo } = await searchParams;
    const userId = parseInt(userIdParam, 10);
    const manageUser = Number.isFinite(userId) ? await getUserByIdForManage(userId) : null;

    if (!manageUser) {
        notFound();
    }

    const linkedAccount = await getManageAccountLinkForAccountMateId(manageUser.accountMateId);
    const backHref = resolveBackHref(returnTo);

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <div className="flex flex-wrap items-center gap-3">
                <Link href={backHref} className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34] underline-offset-4 hover:underline">
                    ← Back to users
                </Link>
            </div>
            <EditUserContent user={manageUser} linkedAccount={linkedAccount} backHref={backHref} />
        </div>
    );
}
