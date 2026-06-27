'use server';

import { cache } from 'react';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
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

type FormResult = { ok: true } | { ok: false; error: string };

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

function parseCategoryForm(formData: FormData) {
    const name = String(formData.get('name') ?? '').trim();
    if (!name) {
        return { ok: false as const, error: 'Category name is required.' };
    }

    const navName = slugifyPageNavName(name);
    if (!navName) {
        return { ok: false as const, error: 'Enter a valid category name.' };
    }

    const isActive = formData.get('isActive') === 'on' || formData.get('isActive') === 'true';

    return {
        ok: true as const,
        values: {
            name,
            navName,
            isActive,
        },
    };
}

function revalidateCategoryPaths(categoryId: number, navName: string) {
    revalidatePath('/manage/categories');
    revalidatePath(`/manage/categories/${categoryId}`);
    revalidatePath(buildShopCategoryPath(categoryId, navName));
    revalidatePath('/shop');
}

export async function createCategoryFromForm(formData: FormData): Promise<FormResult> {
    const parsed = parseCategoryForm(formData);
    if (!parsed.ok) return parsed;

    const [created] = await db
        .insert(category)
        .values({
            name: parsed.values.name,
            navName: parsed.values.navName,
            isActive: parsed.values.isActive,
        })
        .returning({ id: category.id });

    revalidateCategoryPaths(created.id, parsed.values.navName);
    redirect(`/manage/categories/${created.id}`);
}

export async function updateCategoryFromForm(formData: FormData): Promise<FormResult> {
    const id = Number(formData.get('id'));
    if (!Number.isFinite(id) || id <= 0) {
        return { ok: false, error: 'Invalid category.' };
    }

    const existing = await getCategoryByIdForManage(id);
    if (!existing) {
        return { ok: false, error: 'Category not found.' };
    }

    const parsed = parseCategoryForm(formData);
    if (!parsed.ok) return parsed;

    await db
        .update(category)
        .set({
            name: parsed.values.name,
            navName: parsed.values.navName,
            isActive: parsed.values.isActive,
        })
        .where(eq(category.id, id));

    revalidateCategoryPaths(id, parsed.values.navName);
    return { ok: true };
}
