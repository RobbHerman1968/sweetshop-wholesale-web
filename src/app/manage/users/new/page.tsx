import Link from 'next/link';
import { AddUserContent } from './add-user-content';

type Props = {
    searchParams: Promise<{ returnTo?: string }>;
};

function resolveBackHref(returnTo: string | undefined): string {
    if (returnTo?.startsWith('/manage/users')) {
        return returnTo;
    }
    return '/manage/users';
}

export default async function ManageAddUserPage({ searchParams }: Props) {
    const { returnTo } = await searchParams;
    const backHref = resolveBackHref(returnTo);

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <div className="flex flex-wrap items-center gap-3">
                <Link href={backHref} className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34] underline-offset-4 hover:underline">
                    ← Back to users
                </Link>
            </div>
            <AddUserContent backHref={backHref} />
        </div>
    );
}
