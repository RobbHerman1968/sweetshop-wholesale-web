'use server';

import { cache } from 'react';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db-pg';
import { page } from '@/lib/drizzle/schema';
import { and, asc, eq, ilike, sql } from 'drizzle-orm';
import { buildPagePath, slugifyPageNavName } from '@/lib/page-path';

export type SitePage = {
    id: number;
    name: string;
    navName: string;
    content: string;
    imageUrl: string | null;
    isActive: boolean;
};

function mapPageRow(match: {
    id: number;
    name: string | null;
    navName: string | null;
    content: string | null;
    imageUrl: string | null;
    isActive: boolean | null;
}): SitePage {
    return {
        id: match.id,
        name: match.name?.trim() || '',
        navName: match.navName?.trim() || '',
        content: match.content ?? '',
        imageUrl: match.imageUrl?.trim() || null,
        isActive: match.isActive ?? false,
    };
}

export const getPageById = cache(async (pageId: number): Promise<SitePage | null> => {
    if (!Number.isFinite(pageId) || pageId <= 0) return null;

    const row = await db
        .select({
            id: page.id,
            name: page.name,
            navName: page.navName,
            content: page.content,
            imageUrl: page.imageUrl,
            isActive: page.isActive,
        })
        .from(page)
        .where(and(eq(page.id, pageId), eq(page.isActive, true)))
        .limit(1);

    const match = row[0];
    if (!match) return null;

    return mapPageRow(match);
});

export async function getPageByIdForManage(pageId: number): Promise<SitePage | null> {
    if (!Number.isFinite(pageId) || pageId <= 0) return null;

    const row = await db
        .select({
            id: page.id,
            name: page.name,
            navName: page.navName,
            content: page.content,
            imageUrl: page.imageUrl,
            isActive: page.isActive,
        })
        .from(page)
        .where(eq(page.id, pageId))
        .limit(1);

    const match = row[0];
    if (!match) return null;

    return mapPageRow(match);
}

export async function getPaginatedPagesFromDB({
    page: pageNum = 1,
    limit = 50,
    name,
}: {
    page?: number;
    limit?: number;
    name?: string;
} = {}) {
    const offset = (pageNum - 1) * limit;
    const whereClause = name ? ilike(page.name, `%${name}%`) : undefined;

    const data = await db
        .select({
            id: page.id,
            name: page.name,
            navName: page.navName,
            content: page.content,
            imageUrl: page.imageUrl,
            isActive: page.isActive,
        })
        .from(page)
        .where(whereClause)
        .orderBy(asc(page.name))
        .limit(limit)
        .offset(offset);

    const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(page)
        .where(whereClause);

    return {
        data: data.map(mapPageRow),
        pagination: {
            total: Number(count),
            page: pageNum,
            limit,
            totalPages: Math.max(1, Math.ceil(Number(count) / limit)),
        },
    };
}

function getFormRichText(formData: FormData, key: string, fallback: string | undefined): string {
    const raw = formData.get(key);
    return typeof raw === 'string' ? raw : (fallback ?? '');
}

export async function updatePageFromForm(formData: FormData) {
    const id = Number(formData.get('id'));
    if (!id) return;

    const existing = await getPageByIdForManage(id);
    if (!existing) return;

    const name = (formData.get('name') as string)?.trim() ?? existing.name;
    const navName = slugifyPageNavName(name);
    const imageUrlRaw = (formData.get('imageUrl') as string)?.trim();
    const imageUrl = imageUrlRaw || null;
    const content = getFormRichText(formData, 'content', existing.content);
    const isActive = formData.get('isActive') === 'on' || formData.get('isActive') === 'true';

    await db
        .update(page)
        .set({
            name,
            navName,
            content,
            imageUrl,
            isActive,
        })
        .where(eq(page.id, id));

    revalidatePath('/manage/pages');
    revalidatePath(`/manage/pages/${id}`);
    revalidatePath(buildPagePath(id, navName));
    revalidatePath(`/page/${id}`);
}
