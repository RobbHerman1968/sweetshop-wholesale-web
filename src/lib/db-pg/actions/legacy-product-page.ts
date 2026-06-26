'use server';

import { getProductImagesFromSweetshopOldByProductId } from '@/lib/db-sweetshop-old';
import {
    buildLegacyProductPageUrl,
    isLegacyRedirectedHomepage,
    legacyProductImageFromDbPath,
    parseLegacyProductPageImage,
    pickLegacyDbProductImagePath,
    type LegacyProductPageImageResult,
} from '@/lib/legacy-product-page-image';

async function getLegacyProductImageFromOldDb(productId: number, pageUrl: string): Promise<LegacyProductPageImageResult> {
    try {
        const rows = await getProductImagesFromSweetshopOldByProductId(productId);
        const imagePath = pickLegacyDbProductImagePath(rows);
        if (!imagePath) {
            return {
                pageUrl,
                imageUrl: null,
                imageName: null,
                error: 'No legacy ProductImage row found for this product.',
            };
        }

        return legacyProductImageFromDbPath(pageUrl, imagePath);
    } catch {
        return {
            pageUrl,
            imageUrl: null,
            imageName: null,
            error: 'Could not load legacy ProductImage from the old database.',
        };
    }
}

export async function getLegacyProductPageImage(productId: number): Promise<LegacyProductPageImageResult> {
    if (!Number.isFinite(productId) || productId <= 0) {
        return {
            pageUrl: buildLegacyProductPageUrl(productId),
            imageUrl: null,
            imageName: null,
            error: 'Invalid product id.',
        };
    }

    const pageUrl = buildLegacyProductPageUrl(productId);

    try {
        const response = await fetch(pageUrl, {
            headers: {
                Accept: 'text/html',
                'User-Agent': 'SweetShop-Wholesale-Manage/1.0',
            },
            cache: 'no-store',
            redirect: 'manual',
        });

        if (response.status >= 300 && response.status < 400) {
            return getLegacyProductImageFromOldDb(productId, pageUrl);
        }

        if (!response.ok) {
            const dbFallback = await getLegacyProductImageFromOldDb(productId, pageUrl);
            if (dbFallback.imageUrl) return dbFallback;
            return {
                pageUrl,
                imageUrl: null,
                imageName: null,
                error: `Legacy page returned ${response.status}.`,
            };
        }

        const html = await response.text();

        if (isLegacyRedirectedHomepage(html, productId)) {
            return getLegacyProductImageFromOldDb(productId, pageUrl);
        }

        const parsed = parseLegacyProductPageImage(html, productId, pageUrl);
        if (parsed.imageUrl) {
            return parsed;
        }

        return getLegacyProductImageFromOldDb(productId, pageUrl);
    } catch {
        const dbFallback = await getLegacyProductImageFromOldDb(productId, pageUrl);
        if (dbFallback.imageUrl) return dbFallback;

        return {
            pageUrl,
            imageUrl: null,
            imageName: null,
            error: 'Could not fetch the legacy product page.',
        };
    }
}
