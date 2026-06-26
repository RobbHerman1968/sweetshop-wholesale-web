'use server';

import { revalidatePath } from 'next/cache';
import { sql, inArray } from 'drizzle-orm';

import { db } from '@/lib/db-pg';
import { getCategoriesFromSweetshopOld, getCategoryProductsFromSweetshopOld } from '@/lib/db-sweetshop-old';
import { category, product, productCategory } from '@/lib/drizzle/schema';
import { slugifyPageNavName } from '@/lib/page-path';

export type ProductCategorySyncResult = {
    categoriesFetched: number;
    categoriesInserted: number;
    categoriesUpdated: number;
    categoriesSkipped: number;
    linksFetched: number;
    linksInserted: number;
    linksUpdated: number;
    linksSkipped: number;
    linksRemoved: number;
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
    const order = Number(row.Order ?? row.order ?? row.DisplayOrder ?? row.displayOrder ?? 0);
    return Number.isFinite(order) ? order : 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapLegacyCategoryRow(row: any) {
    const id = readLegacyId(row);
    if (id == null) {
        return null;
    }

    const name = trimOrEmpty(row.Name ?? row.name);
    const navNameRaw = trimOrEmpty(row.Nav_Name ?? row.NavName ?? row.navName);
    const navName = navNameRaw || slugifyPageNavName(name || `category-${id}`);

    return {
        id,
        name: name || `Category ${id}`,
        navName,
        isActive: readLegacyBoolean(row.IsActive ?? row.isActive, false),
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapLegacyCategoryProductRow(row: any) {
    const id = readLegacyId(row);
    const productId = Number(row.ProductId ?? row.productId);
    const categoryId = Number(row.CategoryId ?? row.categoryId);

    if (id == null || !Number.isFinite(productId) || productId <= 0 || !Number.isFinite(categoryId) || categoryId <= 0) {
        return null;
    }

    return {
        id,
        productId,
        categoryId,
        displayOrder: readLegacyOrder(row),
    };
}

type LegacyCategoryRow = NonNullable<ReturnType<typeof mapLegacyCategoryRow>>;
type LegacyCategoryProductRow = NonNullable<ReturnType<typeof mapLegacyCategoryProductRow>>;

async function upsertCategoryChunk(chunk: LegacyCategoryRow[]) {
    if (chunk.length === 0) {
        return;
    }

    await db
        .insert(category)
        .values(chunk)
        .onConflictDoUpdate({
            target: category.id,
            set: {
                name: sql`excluded.name`,
                navName: sql`excluded."navName"`,
                isActive: sql`excluded."isActive"`,
            },
        });
}

async function upsertCategoryProductChunk(chunk: LegacyCategoryProductRow[]) {
    if (chunk.length === 0) {
        return;
    }

    await db
        .insert(productCategory)
        .values(chunk)
        .onConflictDoUpdate({
            target: productCategory.id,
            set: {
                productId: sql`excluded."productId"`,
                categoryId: sql`excluded."categoryId"`,
                displayOrder: sql`excluded."displayOrder"`,
            },
        });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function syncLegacyCategoryRows(rows: any[]): Promise<Pick<ProductCategorySyncResult, 'categoriesFetched' | 'categoriesInserted' | 'categoriesUpdated' | 'categoriesSkipped'>> {
    const existingRows = await db.select({ id: category.id }).from(category);
    const existingCategoryIds = new Set(existingRows.map((row) => row.id));

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const pendingRows: LegacyCategoryRow[] = [];
    const chunkSize = 500;

    console.log(`Category sync: starting ${rows.length} legacy Category rows`);

    async function flushChunk() {
        if (pendingRows.length === 0) {
            return;
        }

        const chunk = pendingRows.splice(0, pendingRows.length);
        await upsertCategoryChunk(chunk);
    }

    for (const row of rows) {
        const mapped = mapLegacyCategoryRow(row);
        if (!mapped) {
            skipped += 1;
            continue;
        }

        if (existingCategoryIds.has(mapped.id)) {
            updated += 1;
        } else {
            inserted += 1;
            existingCategoryIds.add(mapped.id);
        }

        pendingRows.push(mapped);

        if (pendingRows.length >= chunkSize) {
            await flushChunk();
        }
    }

    await flushChunk();

    console.log(`Category sync: complete (${updated} updated, ${inserted} inserted, ${skipped} skipped, ${rows.length} fetched)`);

    return {
        categoriesFetched: rows.length,
        categoriesInserted: inserted,
        categoriesUpdated: updated,
        categoriesSkipped: skipped,
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function syncLegacyCategoryProductRows(rows: any[]): Promise<
    Pick<ProductCategorySyncResult, 'linksFetched' | 'linksInserted' | 'linksUpdated' | 'linksSkipped' | 'linksRemoved'>
> {
    const [productRows, categoryRows] = await Promise.all([
        db.select({ id: product.id }).from(product),
        db.select({ id: category.id }).from(category),
    ]);
    const validProductIds = new Set(productRows.map((row) => row.id));
    const validCategoryIds = new Set(categoryRows.map((row) => row.id));

    const existingRows = await db.select({ id: productCategory.id }).from(productCategory);
    const existingLinkIds = new Set(existingRows.map((row) => row.id));
    const syncedLegacyLinkIds = new Set<number>();

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const pendingRows: LegacyCategoryProductRow[] = [];
    const chunkSize = 500;

    console.log(`Product category link sync: starting ${rows.length} legacy CategoryProduct rows`);

    async function flushChunk() {
        if (pendingRows.length === 0) {
            return;
        }

        const chunk = pendingRows.splice(0, pendingRows.length);
        await upsertCategoryProductChunk(chunk);
    }

    for (const row of rows) {
        const mapped = mapLegacyCategoryProductRow(row);
        if (!mapped) {
            skipped += 1;
            continue;
        }

        if (!validProductIds.has(mapped.productId) || !validCategoryIds.has(mapped.categoryId)) {
            skipped += 1;
            continue;
        }

        syncedLegacyLinkIds.add(mapped.id);

        if (existingLinkIds.has(mapped.id)) {
            updated += 1;
        } else {
            inserted += 1;
            existingLinkIds.add(mapped.id);
        }

        pendingRows.push(mapped);

        if (pendingRows.length >= chunkSize) {
            await flushChunk();
        }
    }

    await flushChunk();

    let linksRemoved = 0;
    if (rows.length === 0) {
        if (existingRows.length > 0) {
            await db.delete(productCategory).where(inArray(productCategory.id, existingRows.map((row) => row.id)));
            linksRemoved = existingRows.length;
        }
    } else if (syncedLegacyLinkIds.size > 0) {
        const idsToRemove = existingRows.map((row) => row.id).filter((id) => !syncedLegacyLinkIds.has(id));
        if (idsToRemove.length > 0) {
            await db.delete(productCategory).where(inArray(productCategory.id, idsToRemove));
            linksRemoved = idsToRemove.length;
        }
    }

    console.log(
        `Product category link sync: complete (${updated} updated, ${inserted} inserted, ${skipped} skipped, ${linksRemoved} removed, ${rows.length} fetched)`,
    );

    return {
        linksFetched: rows.length,
        linksInserted: inserted,
        linksUpdated: updated,
        linksSkipped: skipped,
        linksRemoved,
    };
}

export async function syncProductCategoriesFromLegacy(): Promise<ProductCategorySyncResult> {
    try {
        const [categoryRows, linkRows] = await Promise.all([getCategoriesFromSweetshopOld(), getCategoryProductsFromSweetshopOld()]);
        const categoryResult = await syncLegacyCategoryRows(categoryRows);
        const linkResult = await syncLegacyCategoryProductRows(linkRows);

        revalidatePath('/manage/categories');
        revalidatePath('/manage/products');
        revalidatePath('/shop');

        return {
            ...categoryResult,
            ...linkResult,
        };
    } catch (error) {
        console.error('Error syncing product categories from legacy:', error);
        throw error instanceof Error ? error : new Error('Failed to sync product categories from legacy');
    }
}
