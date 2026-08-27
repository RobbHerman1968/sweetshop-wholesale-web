import Link from 'next/link';
import { CategoryForm } from '../category-form';

export default function ManageAddCategoryPage() {
    return (
        <div className="mx-auto w-full max-w-7xl space-y-6">
            <div className="flex flex-wrap items-center gap-3">
                <Link
                    href="/manage/categories"
                    className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34] underline-offset-4 hover:underline"
                >
                    ← Back to categories
                </Link>
            </div>
            <CategoryForm mode="create" backHref="/manage/categories" />
        </div>
    );
}
