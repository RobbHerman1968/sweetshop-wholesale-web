import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCategoryByIdForManage } from '@/lib/db-pg/actions/category';
import { CategoryForm } from '../category-form';

type Props = {
    params: Promise<{ categoryId: string }>;
};

export default async function ManageEditCategoryPage({ params }: Props) {
    const { categoryId: categoryIdParam } = await params;
    const categoryId = parseInt(categoryIdParam, 10);
    const shopCategory = Number.isFinite(categoryId) ? await getCategoryByIdForManage(categoryId) : null;

    if (!shopCategory) {
        notFound();
    }

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <div className="flex flex-wrap items-center gap-3">
                <Link href="/manage/categories" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34] underline-offset-4 hover:underline">
                    ← Back to categories
                </Link>
            </div>
            <CategoryForm mode="edit" category={shopCategory} />
        </div>
    );
}
