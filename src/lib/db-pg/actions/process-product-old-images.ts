'use server';

import { revalidatePath } from 'next/cache';
import { sql } from 'drizzle-orm';

import { db } from '@/lib/db-pg';
import { getProductImagesFromSweetshopOld } from '@/lib/db-sweetshop-old';
import { productOldImage } from '@/lib/drizzle/schema';

export type ProductOldImageLoadResult = {
    fetched: number;
    inserted: number;
    updated: number;
    skipped: number;
};

function trimOrEmpty(value: unknown): string {
    if (value == null) {
        return '';
    }
    return String(value).trim();
}

function readLegacyId(row: Record<string, unknown>): number | null {
    const id = Number(row.Id ?? row.id);
    return Number.isFinite(id) && id > 0 ? id : null;
}

function readLegacyBoolean(value: unknown, fallback = false): boolean {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'number') {
        return value !== 0;
    }
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true' || normalized === '1') return true;
        if (normalized === 'false' || normalized === '0') return false;
    }
    return fallback;
}

function readLegacyOrder(row: Record<string, unknown>): number {
    const order = Number(row.Order ?? row.order ?? 0);
    return Number.isFinite(order) ? order : 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapLegacyProductImageRow(row: any) {
    const id = readLegacyId(row);
    const productId = Number(row.ProductId ?? row.productId);
    const fileName = trimOrEmpty(row.Path ?? row.path);

    if (id == null || !Number.isFinite(productId) || productId <= 0 || !fileName) {
        return null;
    }

    return {
        id,
        productId,
        fileName,
        isDefault: readLegacyBoolean(row.IsDefault ?? row.isDefault, false),
        isActive: readLegacyBoolean(row.IsActive ?? row.isActive, true),
        order: readLegacyOrder(row),
    };
}

type LegacyProductOldImageRow = NonNullable<ReturnType<typeof mapLegacyProductImageRow>>;

async function upsertProductOldImageChunk(chunk: LegacyProductOldImageRow[]) {
    if (chunk.length === 0) {
        return;
    }

    await db
        .insert(productOldImage)
        .values(chunk)
        .onConflictDoUpdate({
            target: productOldImage.id,
            set: {
                productId: sql`excluded."productId"`,
                fileName: sql`excluded."fileName"`,
                isDefault: sql`excluded."isDefault"`,
                isActive: sql`excluded."isActive"`,
                order: sql`excluded."order"`,
            },
        });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadProductOldImagesFromLegacyRows(rows: any[]): Promise<ProductOldImageLoadResult> {
    const existingRows = await db.select({ id: productOldImage.id }).from(productOldImage);
    const existingIds = new Set(existingRows.map((row) => row.id));

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const pendingRows: LegacyProductOldImageRow[] = [];
    const chunkSize = 500;

    console.log(`Product old image load: starting ${rows.length} legacy ProductImage rows`);

    async function flushChunk() {
        if (pendingRows.length === 0) {
            return;
        }

        const chunk = pendingRows.splice(0, pendingRows.length);
        await upsertProductOldImageChunk(chunk);
    }

    for (const row of rows) {
        const mapped = mapLegacyProductImageRow(row);
        if (!mapped) {
            skipped += 1;
            continue;
        }

        if (existingIds.has(mapped.id)) {
            updated += 1;
        } else {
            inserted += 1;
            existingIds.add(mapped.id);
        }

        pendingRows.push(mapped);

        if (pendingRows.length >= chunkSize) {
            await flushChunk();
        }
    }

    await flushChunk();

    console.log(`Product old image load: complete (${updated} updated, ${inserted} inserted, ${skipped} skipped, ${rows.length} fetched)`);

    return {
        fetched: rows.length,
        inserted,
        updated,
        skipped,
    };
}

export async function loadProductOldImagesFromLegacy(): Promise<ProductOldImageLoadResult> {
    try {
        const rows = await getProductImagesFromSweetshopOld();
        const result = await loadProductOldImagesFromLegacyRows(rows);

        revalidatePath('/manage/products');
        revalidatePath('/shop');

        return result;
    } catch (error) {
        console.error('Error loading product old images from legacy ProductImage:', error);
        throw error instanceof Error ? error : new Error('Failed to load product old images from legacy ProductImage');
    }
}
