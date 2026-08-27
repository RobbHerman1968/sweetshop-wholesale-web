import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getCategoryByIdForManage } from '@/lib/db-pg/actions/category';
import { getPaginatedProductsFromDB } from '@/lib/db-pg/actions/product';
import { parseProductStatusFilter, productStatusFilterToIsActive } from '@/lib/product-status-filter';
import { ProductsContent } from '@/app/manage/products/products-content';

const PER_PAGE = 48;

type Props = {
    params: Promise<{ categoryId: string }>;
    searchParams: Promise<{ page?: string; name?: string; itemNumber?: string; status?: string }>;
};

export default async function ManageCategoryProductsPage({ params, searchParams }: Props) {
    const { categoryId: categoryIdParam } = await params;
    const categoryId = parseInt(categoryIdParam, 10);
    const category = Number.isFinite(categoryId) ? await getCategoryByIdForManage(categoryId) : null;

    if (!category) {
        notFound();
    }

    const queryParams = await searchParams;
    const page = Math.max(1, parseInt(queryParams.page ?? '1', 10) || 1);
    const name = queryParams.name?.trim() ?? '';
    const itemNumber = queryParams.itemNumber?.trim() ?? '';
    const status = parseProductStatusFilter(queryParams.status);

    const result = await getPaginatedProductsFromDB({
        page,
        limit: PER_PAGE,
        name: name || undefined,
        itemNumber: itemNumber || undefined,
        isActive: productStatusFilterToIsActive(status),
        categoryId,
    });

    const data = result.data as Array<{
        id: number;
        name: string | null;
        itemNumber: string | null;
        price: string;
        isActive: boolean;
        productImages?: Array<{ vercelImage: { path: string; name: string } | null }>;
    }>;

    const basePath = `/manage/categories/${categoryId}/products`;

    return (
        <div className="flex h-full min-h-0 flex-col gap-4">
            <Link href="/manage/categories" className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34] underline-offset-4 hover:underline">
                ← Back to categories
            </Link>
            <Suspense fallback={<div className="mx-auto w-full max-w-7xl text-xs text-[#7c5b44]">Loading products…</div>}>
                <div className="flex min-h-0 flex-1 flex-col">
                    <ProductsContent
                        data={data}
                        pagination={result.pagination}
                        searchName={name}
                        searchItemNumber={itemNumber}
                        status={status}
                        basePath={basePath}
                        categoryName={category.name ?? undefined}
                    />
                </div>
            </Suspense>
        </div>
    );
}
