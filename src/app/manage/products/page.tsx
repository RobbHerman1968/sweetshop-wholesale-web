import { Suspense } from 'react';
import { getPaginatedProductsFromDB } from '@/lib/db-pg/actions/product';
import { ProductsContent } from './products-content';

const PER_PAGE = 50;

type Props = {
    searchParams: Promise<{ page?: string; name?: string; itemNumber?: string }>;
};

export default async function ManageProductsPage({ searchParams }: Props) {
    const params = await searchParams;
    const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
    const name = params.name?.trim() ?? '';
    const itemNumber = params.itemNumber?.trim() ?? '';

    const result = await getPaginatedProductsFromDB({
        page,
        limit: PER_PAGE,
        name: name || undefined,
        itemNumber: itemNumber || undefined,
    });

    const data = result.data as Array<{
        id: number;
        name: string | null;
        itemNumber: string | null;
        price: string;
        isActive: boolean;
        productImages?: Array<{ vercelImage: { path: string; name: string } | null }>;
    }>;

    return (
        <Suspense fallback={<div className="mx-auto max-w-7xl text-xs text-[#7c5b44]">Loading products…</div>}>
            <ProductsContent data={data} pagination={result.pagination} searchName={name} searchItemNumber={itemNumber} />
        </Suspense>
    );
}
