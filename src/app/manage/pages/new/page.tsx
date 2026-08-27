import Link from 'next/link';
import { PageForm } from '../page-form';

export default function ManageAddPagePage() {
    return (
        <div className="mx-auto w-full max-w-7xl space-y-6">
            <div className="flex flex-wrap items-center gap-3">
                <Link
                    href="/manage/pages"
                    className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34] underline-offset-4 hover:underline"
                >
                    ← Back to pages
                </Link>
            </div>
            <PageForm mode="create" backHref="/manage/pages" />
        </div>
    );
}
