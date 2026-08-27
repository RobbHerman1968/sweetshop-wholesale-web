import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { ManageHeader } from '@/components/manage-header';
import { ManageSidebar } from '@/components/manage-sidebar';
import { SITE_MAIN_FOCUS_CLASS, SITE_MAIN_ID } from '@/lib/site-main';
import { cn } from '@/lib/utils';

export default async function ManageLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        redirect('/');
    }

    if (!session.user.isAdmin) {
        redirect('/');
    }

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-[#f2dfcc] text-[#3f1d12] font-sans">
            <ManageHeader />
            <main
                id={SITE_MAIN_ID}
                tabIndex={-1}
                className={cn('flex min-h-0 flex-1 flex-col overflow-hidden pt-12', SITE_MAIN_FOCUS_CLASS)}
            >
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
                    <ManageSidebar />
                    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto px-3 py-6 sm:px-4 md:px-6 md:py-8">
                        <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col">{children}</div>
                    </div>
                </div>
            </main>
        </div>
    );
}
