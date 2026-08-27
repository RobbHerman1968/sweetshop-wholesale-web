'use server';

import { cache } from 'react';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db-pg';
import { page } from '@/lib/drizzle/schema';
import { and, asc, eq, ilike, or, sql } from 'drizzle-orm';
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

type FooterLegalPageLinks = {
    termsPageHref: string | null;
    privacyPageHref: string | null;
};

async function getActivePagePathByPatterns(options: {
    defaultName: string;
    namePattern: string;
    navPattern: string;
}): Promise<string | null> {
    const navSlug = slugifyPageNavName(options.defaultName);

    const [row] = await db
        .select({
            id: page.id,
            navName: page.navName,
            name: page.name,
        })
        .from(page)
        .where(
            and(
                eq(page.isActive, true),
                or(
                    eq(page.navName, navSlug),
                    ilike(page.name, options.namePattern),
                    ilike(page.navName, options.navPattern),
                ),
            ),
        )
        .orderBy(asc(page.id))
        .limit(1);

    if (!row) {
        return null;
    }

    return buildPagePath(row.id, row.navName?.trim() || row.name?.trim() || navSlug);
}

export const getFooterLegalPageLinks = cache(async (): Promise<FooterLegalPageLinks> => {
    const [termsPageHref, privacyPageHref] = await Promise.all([
        getActivePagePathByPatterns({
            defaultName: 'Terms and Conditions',
            namePattern: '%terms%condition%',
            navPattern: '%terms%condition%',
        }),
        getActivePagePathByPatterns({
            defaultName: 'Privacy Policy',
            namePattern: '%privacy%policy%',
            navPattern: '%privacy%policy%',
        }),
    ]);

    return { termsPageHref, privacyPageHref };
});

/** @deprecated Use getFooterLegalPageLinks instead. */
export const getTermsAndConditionsPagePath = cache(async (): Promise<string | null> => {
    const links = await getFooterLegalPageLinks();
    return links.termsPageHref;
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

type PageFormResult = { ok: true } | { ok: false; error: string };

function parsePageForm(formData: FormData, contentFallback = '') {
    const name = String(formData.get('name') ?? '').trim();
    if (!name) {
        return { ok: false as const, error: 'Page name is required.' };
    }

    const navName = slugifyPageNavName(name);
    if (!navName) {
        return { ok: false as const, error: 'Enter a valid page name.' };
    }

    const content = getFormRichText(formData, 'content', contentFallback);
    const isActive = formData.get('isActive') === 'on' || formData.get('isActive') === 'true';

    return {
        ok: true as const,
        values: {
            name,
            navName,
            content,
            isActive,
        },
    };
}

function revalidatePagePaths(pageId: number, navName: string) {
    revalidatePath('/manage/pages');
    revalidatePath(`/manage/pages/${pageId}`);
    revalidatePath(buildPagePath(pageId, navName));
    revalidatePath(`/page/${pageId}`);
    revalidatePath('/');
}

export async function createPageFromForm(formData: FormData): Promise<PageFormResult> {
    const parsed = parsePageForm(formData);
    if (!parsed.ok) {
        return parsed;
    }

    const [created] = await db
        .insert(page)
        .values({
            name: parsed.values.name,
            navName: parsed.values.navName,
            content: parsed.values.content,
            imageUrl: null,
            isActive: parsed.values.isActive,
        })
        .returning({ id: page.id });

    revalidatePagePaths(created.id, parsed.values.navName);
    redirect(`/manage/pages/${created.id}`);
}

export async function updatePageFromForm(formData: FormData) {
    const id = Number(formData.get('id'));
    if (!id) return;

    const existing = await getPageByIdForManage(id);
    if (!existing) return;

    const parsed = parsePageForm(formData, existing.content);
    if (!parsed.ok) {
        return;
    }

    await db
        .update(page)
        .set({
            name: parsed.values.name,
            navName: parsed.values.navName,
            content: parsed.values.content,
            imageUrl: existing.imageUrl,
            isActive: parsed.values.isActive,
        })
        .where(eq(page.id, id));

    revalidatePagePaths(id, parsed.values.navName);
}
