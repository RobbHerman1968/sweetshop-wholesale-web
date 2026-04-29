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
        <div className="flex min-h-screen flex-col bg-[#f2dfcc] text-[#3f1d12] font-sans">
            <ManageHeader />
            <main
                id={SITE_MAIN_ID}
                tabIndex={-1}
                className={cn('flex min-h-[calc(100vh-3rem)] flex-1 flex-col pt-12', SITE_MAIN_FOCUS_CLASS)}
            >
                <div className="flex min-h-[calc(100vh-3rem)] flex-1 flex-col md:flex-row">
                    <ManageSidebar />
                    <div className="min-w-0 flex-1 px-3 py-6 sm:px-4 md:px-6 md:py-8">{children}</div>
                </div>
            </main>
        </div>
    );
}
