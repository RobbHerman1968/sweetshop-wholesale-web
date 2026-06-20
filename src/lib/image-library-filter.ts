export type ImageLibraryFilter = 'all' | 'product' | 'other';

export function parseImageLibraryFilter(value: string | undefined): ImageLibraryFilter {
    if (value === 'product' || value === 'other') return value;
    return 'all';
}
