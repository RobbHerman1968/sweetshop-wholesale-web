import { Suspense } from 'react';
import { getPaginatedImagesFromDB } from '@/lib/db-pg/actions/image';
import { ImagesContent } from './images-content';

const PER_PAGE = 50;

type Props = {
    searchParams: Promise<{ page?: string; name?: string }>;
};

export default async function ManageImagesPage({ searchParams }: Props) {
    const params = await searchParams;
    const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
    const name = params.name?.trim() ?? '';

    const result = await getPaginatedImagesFromDB({
        page,
        limit: PER_PAGE,
        name: name || undefined,
    });

    return (
        <Suspense fallback={<div className="mx-auto max-w-7xl text-xs text-[#6e4a34]">Loading images…</div>}>
            <ImagesContent
                data={result.data.map((img) => ({
                    id: img.id,
                    name: img.name ?? img.imageName ?? '',
                    publicUrl: typeof img.path === 'string' ? img.path.trim() : '',
                }))}
                pagination={result.pagination}
                searchName={name}
            />
        </Suspense>
    );
}
