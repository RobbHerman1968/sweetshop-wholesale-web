import { buildLegacyDynImageUrl } from '@/lib/legacy-dynimage-url';

export const LEGACY_WHOLESALE_ORIGIN = 'https://sweetshopusawholesale.com';

export type LegacyProductImageSource = 'legacy-page' | 'legacy-db';

export function buildLegacyProductPageUrl(productId: number, categoryId = 230, slug = 'tttt'): string {
    return `${LEGACY_WHOLESALE_ORIGIN}/shopping/product/${productId}/${categoryId}/${slug}`;
}

export function decodeHtmlEntities(value: string): string {
    return value
        .replace(/&amp;/g, '&')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
}

/** Extract img filename from a legacy /dynimage/ src and rebuild at the requested size. */
export function normalizeLegacyDynImageSrc(src: string, width = 800, height = 800): { imageUrl: string; imageName: string | null } {
    const decoded = decodeHtmlEntities(src.trim());
    const absolute = decoded.startsWith('http')
        ? decoded
        : `${LEGACY_WHOLESALE_ORIGIN}${decoded.startsWith('/') ? decoded : `/${decoded}`}`;

    try {
        const url = new URL(absolute);
        const imgParam = url.searchParams.get('img')?.trim();
        if (!imgParam) {
            return { imageUrl: absolute, imageName: null };
        }

        const imageName = decodeURIComponent(imgParam.replace(/\+/g, ' '));
        return {
            imageUrl: buildLegacyDynImageUrl(imageName, width, height),
            imageName,
        };
    } catch {
        return { imageUrl: absolute, imageName: null };
    }
}

export function pickLegacyDbProductImagePath(rows: unknown[]): string | null {
    const mapped = rows
        .map((row) => {
            const r = row as { Path?: string; IsDefault?: boolean; Id?: number };
            return {
                path: String(r.Path ?? '').trim(),
                isDefault: Boolean(r.IsDefault),
                id: Number(r.Id ?? 0),
            };
        })
        .filter((row) => row.path);

    if (mapped.length === 0) return null;

    mapped.sort((a, b) => {
        if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
        return a.id - b.id;
    });

    return mapped[0].path;
}

/** True when HTML looks like the legacy homepage rather than a product detail page. */
export function isLegacyRedirectedHomepage(html: string, productId: number): boolean {
    const hasFeaturedCarousel = html.includes('FeaturedSectionImage');
    const hasProductDetailLink = new RegExp(`/shopping/product/${productId}/`, 'i').test(html);
    return hasFeaturedCarousel && !hasProductDetailLink;
}

function isFeaturedSectionDynImage(html: string, matchIndex: number): boolean {
    const contextBefore = html.slice(Math.max(0, matchIndex - 500), matchIndex);
    return contextBefore.includes('FeaturedSectionImage') || contextBefore.includes('FeaturedSectionDescription');
}

/** Find the product dynimage src in legacy HTML, skipping homepage carousel promos. */
export function findFirstDynImageSrc(html: string, productId: number): string | null {
    const productPath = `/shopping/product/${productId}/`;
    const linkedMatch = html.match(
        new RegExp(`<a[^>]+href="[^"]*${productPath.replace(/\//g, '\\/')}[^"]*"[^>]*>\\s*<img[^>]+src="([^"]+)"`, 'i'),
    );
    if (linkedMatch?.[1]?.includes('dynimage')) {
        return linkedMatch[1];
    }

    const dynImagePattern = /src="(\/?dynimage\/\?[^"]+)"/gi;
    let match: RegExpExecArray | null;
    while ((match = dynImagePattern.exec(html)) !== null) {
        const src = match[1];
        if (!src.includes('dynimage')) continue;
        if (isFeaturedSectionDynImage(html, match.index)) continue;
        return src;
    }

    return null;
}

export type LegacyProductPageImageResult = {
    pageUrl: string;
    imageUrl: string | null;
    imageName: string | null;
    source?: LegacyProductImageSource;
    error?: string;
};

export function parseLegacyProductPageImage(html: string, productId: number, pageUrl: string): LegacyProductPageImageResult {
    const src = findFirstDynImageSrc(html, productId);
    if (!src) {
        return {
            pageUrl,
            imageUrl: null,
            imageName: null,
            error: 'No dynimage found on the legacy product page.',
        };
    }

    const { imageUrl, imageName } = normalizeLegacyDynImageSrc(src);
    return { pageUrl, imageUrl, imageName, source: 'legacy-page' };
}

export function legacyProductImageFromDbPath(pageUrl: string, imagePath: string): LegacyProductPageImageResult {
    return {
        pageUrl,
        imageUrl: buildLegacyDynImageUrl(imagePath),
        imageName: imagePath,
        source: 'legacy-db',
    };
}
