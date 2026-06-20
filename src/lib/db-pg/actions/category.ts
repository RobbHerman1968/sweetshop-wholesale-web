'use server';

import { cache } from 'react';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db-pg';
import { category } from '@/lib/drizzle/schema';
import { and, asc, eq, ilike, sql } from 'drizzle-orm';
import { slugifyPageNavName } from '@/lib/page-path';
import { buildShopCategoryPath } from '@/lib/shop-category-path';

export type ShopCategory = {
    id: number;
    name: string;
    navName: string;
    isActive: boolean;
};

function mapCategoryRow(match: {
    id: number;
    name: string | null;
    navName: string | null;
    isActive: boolean | null;
}): ShopCategory {
    return {
        id: match.id,
        name: match.name?.trim() || '',
        navName: match.navName?.trim() || '',
        isActive: match.isActive ?? false,
    };
}

export const getShopCategoryById = cache(async (categoryId: number): Promise<ShopCategory | null> => {
    if (!Number.isFinite(categoryId) || categoryId <= 0) return null;

    const row = await db
        .select({
            id: category.id,
            name: category.name,
            navName: category.navName,
            isActive: category.isActive,
        })
        .from(category)
        .where(and(eq(category.id, categoryId), eq(category.isActive, true)))
        .limit(1);

    const match = row[0];
    if (!match) return null;

    return mapCategoryRow(match);
});

export async function getCategoryByIdForManage(categoryId: number): Promise<ShopCategory | null> {
    if (!Number.isFinite(categoryId) || categoryId <= 0) return null;

    const row = await db
        .select({
            id: category.id,
            name: category.name,
            navName: category.navName,
            isActive: category.isActive,
        })
        .from(category)
        .where(eq(category.id, categoryId))
        .limit(1);

    const match = row[0];
    if (!match) return null;

    return mapCategoryRow(match);
}

export async function getAllCategoriesForManage(): Promise<ShopCategory[]> {
    const rows = await db
        .select({
            id: category.id,
            name: category.name,
            navName: category.navName,
            isActive: category.isActive,
        })
        .from(category)
        .orderBy(asc(category.name));

    return rows.map(mapCategoryRow);
}

export async function getPaginatedCategoriesFromDB({
    page: pageNum = 1,
    limit = 50,
    name,
}: {
    page?: number;
    limit?: number;
    name?: string;
} = {}) {
    const offset = (pageNum - 1) * limit;
    const whereClause = name ? ilike(category.name, `%${name}%`) : undefined;

    const data = await db
        .select({
            id: category.id,
            name: category.name,
            navName: category.navName,
            isActive: category.isActive,
        })
        .from(category)
        .where(whereClause)
        .orderBy(asc(category.name))
        .limit(limit)
        .offset(offset);

    const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(category)
        .where(whereClause);

    return {
        data: data.map(mapCategoryRow),
        pagination: {
            total: Number(count),
            page: pageNum,
            limit,
            totalPages: Math.max(1, Math.ceil(Number(count) / limit)),
        },
    };
}

export async function updateCategoryFromForm(formData: FormData) {
    const id = Number(formData.get('id'));
    if (!id) return;

    const existing = await getCategoryByIdForManage(id);
    if (!existing) return;

    const name = (formData.get('name') as string)?.trim() ?? existing.name;
    const navName = slugifyPageNavName(name);
    const isActive = formData.get('isActive') === 'on' || formData.get('isActive') === 'true';

    await db
        .update(category)
        .set({
            name,
            navName,
            isActive,
        })
        .where(eq(category.id, id));

    revalidatePath('/manage/categories');
    revalidatePath(`/manage/categories/${id}`);
    revalidatePath(buildShopCategoryPath(id, navName));
    revalidatePath('/shop');
}
