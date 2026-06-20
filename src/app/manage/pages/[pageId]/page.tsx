import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPageByIdForManage } from '@/lib/db-pg/actions/page';
import { EditPageContent } from './edit-page-content';

type Props = {
    params: Promise<{ pageId: string }>;
};

export default async function ManageEditPagePage({ params }: Props) {
    const { pageId: pageIdParam } = await params;
    const pageId = parseInt(pageIdParam, 10);
    const sitePage = Number.isFinite(pageId) ? await getPageByIdForManage(pageId) : null;

    if (!sitePage) {
        notFound();
    }

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <div className="flex flex-wrap items-center gap-3">
                <Link href="/manage/pages" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34] underline-offset-4 hover:underline">
                    ← Back to pages
                </Link>
            </div>
            <EditPageContent page={sitePage} />
        </div>
    );
}
