import { Suspense } from 'react';
import { getPaginatedImagesFromDB } from '@/lib/db-pg/actions/image';
import { parseImageLibraryFilter } from '@/lib/image-library-filter';
import { ImagesContent } from './images-content';

const PER_PAGE = 100;

type Props = {
    searchParams: Promise<{ page?: string; name?: string; type?: string }>;
};

export default async function ManageImagesPage({ searchParams }: Props) {
    const params = await searchParams;
    const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
    const name = params.name?.trim() ?? '';
    const imageType = parseImageLibraryFilter(params.type);

    const result = await getPaginatedImagesFromDB({
        page,
        limit: PER_PAGE,
        name: name || undefined,
        type: imageType,
    });

    return (
        <Suspense fallback={<div className="mx-auto w-full max-w-7xl text-xs text-[#6e4a34]">Loading images…</div>}>
            <div className="flex h-full min-h-0 flex-col">
                <ImagesContent
                    data={result.data.map((img) => ({
                        id: img.id,
                        name: img.name ?? '',
                        imageName: img.imageName ?? '',
                        isProductImage: img.isProductImage,
                        publicUrl: typeof img.path === 'string' ? img.path.trim() : '',
                    }))}
                    pagination={result.pagination}
                    searchName={name}
                    imageType={imageType}
                />
            </div>
        </Suspense>
    );
}
