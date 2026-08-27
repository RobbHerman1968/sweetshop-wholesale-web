'use server';

import { cache } from 'react';
import { revalidatePath } from 'next/cache';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db-pg';
import { getShopCategoryById } from '@/lib/db-pg/actions/category';
import { category, homepageContent, product, productCategory, productImage, vercelImage } from '@/lib/drizzle/schema';
import { buildShopCategoryPath } from '@/lib/shop-category-path';
import {
    DEFAULT_HOME_PAGE_CONTENT,
    HOMEPAGE_CONTENT_ROW_ID,
    HOMEPAGE_SECTION_DESCRIPTION_MAX_LENGTH,
    HOMEPAGE_SECTION_PRODUCT_COUNT,
    HOMEPAGE_SECTION_TITLE_MAX_LENGTH,
    normalizeHomePageContent,
    parseHomePageContent,
    resolveHomePageSectionTitle,
    serializeHomePageContent,
    type HomePageContent,
    type HomePageDisplayContent,
    type HomePageProductDisplay,
    type HomePageSectionConfig,
    type HomePageSectionDisplay,
} from '@/lib/homepage-content';

type FormResult = { ok: true } | { ok: false; error: string };

export type HomepageCategoryOption = {
    id: number;
    name: string;
    navName: string;
};

export type HomepageProductOption = {
    id: number;
    name: string;
    itemNumber: string;
    imagePath: string | null;
};

async function readHomePageContentRaw(): Promise<string | null> {
    try {
        const [row] = await db
            .select({ content: homepageContent.content })
            .from(homepageContent)
            .where(eq(homepageContent.id, HOMEPAGE_CONTENT_ROW_ID))
            .limit(1);

        return row?.content?.trim() || null;
    } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (message.includes('homepageContent') && message.includes('does not exist')) {
            return null;
        }
        throw error;
    }
}

async function upsertHomePageContentTextValue(content: string): Promise<FormResult> {
    try {
        await db
            .insert(homepageContent)
            .values({
                id: HOMEPAGE_CONTENT_ROW_ID,
                content,
                updatedAt: new Date().toISOString(),
            })
            .onConflictDoUpdate({
                target: homepageContent.id,
                set: {
                    content,
                    updatedAt: new Date().toISOString(),
                },
            });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to save homepage content.';
        if (message.includes('homepageContent') && message.includes('does not exist')) {
            return { ok: false, error: 'Apply src/lib/drizzle/0021_homepage_content_table.sql before saving homepage content.' };
        }

        return { ok: false, error: message };
    }

    return { ok: true };
}

export async function getActiveCategoriesForHomepageSetup(): Promise<HomepageCategoryOption[]> {
    const rows = await db
        .select({
            id: category.id,
            name: category.name,
            navName: category.navName,
        })
        .from(category)
        .where(eq(category.isActive, true))
        .orderBy(asc(category.name));

    return rows.map((row) => ({
        id: row.id,
        name: row.name?.trim() || `Category ${row.id}`,
        navName: row.navName?.trim() || '',
    }));
}

export async function getActiveProductsForCategoryForHomepageSetup(categoryId: number): Promise<HomepageProductOption[]> {
    if (!Number.isFinite(categoryId) || categoryId <= 0) {
        return [];
    }

    const rows = await db
        .select({
            id: product.id,
            name: product.name,
            itemNumber: product.itemNumber,
            imagePath: vercelImage.path,
        })
        .from(product)
        .innerJoin(productCategory, eq(productCategory.productId, product.id))
        .leftJoin(productImage, eq(productImage.productId, product.id))
        .leftJoin(vercelImage, eq(vercelImage.id, productImage.vercelImageId))
        .where(and(eq(productCategory.categoryId, categoryId), eq(product.isActive, true)))
        .orderBy(asc(product.name));

    const byId = new Map<number, HomepageProductOption>();

    for (const row of rows) {
        if (byId.has(row.id)) {
            continue;
        }

        byId.set(row.id, {
            id: row.id,
            name: row.name?.trim() || `Product ${row.id}`,
            itemNumber: row.itemNumber?.trim() || '',
            imagePath: row.imagePath ?? null,
        });
    }

    return Array.from(byId.values());
}

async function persistHomePageContent(content: HomePageContent): Promise<FormResult> {
    const serialized = serializeHomePageContent(content);
    const saveResult = await upsertHomePageContentTextValue(serialized);

    if (!saveResult.ok) {
        return saveResult;
    }

    revalidatePath('/');
    revalidatePath('/manage/homepage-setup');
    return { ok: true };
}

async function validateHomePageHero(hero: HomePageContent['hero']): Promise<FormResult> {
    if (!hero.title.trim()) {
        return { ok: false, error: 'Hero title is required.' };
    }

    return { ok: true };
}

async function validateHomePageSection(section: HomePageSectionConfig, sectionLabel: string): Promise<FormResult> {
    if (!section.categoryId) {
        return { ok: false, error: `${sectionLabel}: choose an active category.` };
    }

    const activeCategory = await getShopCategoryById(section.categoryId);
    if (!activeCategory) {
        return { ok: false, error: `${sectionLabel}: category is not active.` };
    }

    if (section.description.length > HOMEPAGE_SECTION_DESCRIPTION_MAX_LENGTH) {
        return { ok: false, error: `${sectionLabel}: description is too long.` };
    }

    if (section.title.length > HOMEPAGE_SECTION_TITLE_MAX_LENGTH) {
        return { ok: false, error: `${sectionLabel}: title is too long.` };
    }

    const selectedIds = section.productIds.filter((id) => id > 0);
    if (selectedIds.length !== HOMEPAGE_SECTION_PRODUCT_COUNT) {
        return { ok: false, error: `${sectionLabel}: select ${HOMEPAGE_SECTION_PRODUCT_COUNT} products.` };
    }

    if (new Set(selectedIds).size !== selectedIds.length) {
        return { ok: false, error: `${sectionLabel}: choose three different products.` };
    }

    const validRows = await db
        .select({ id: product.id })
        .from(product)
        .innerJoin(productCategory, eq(productCategory.productId, product.id))
        .where(
            and(
                inArray(product.id, selectedIds),
                eq(product.isActive, true),
                eq(productCategory.categoryId, section.categoryId),
            ),
        );

    if (validRows.length !== selectedIds.length) {
        return { ok: false, error: `${sectionLabel}: all products must be active and belong to the selected category.` };
    }

    return { ok: true };
}

async function validateHomePageContent(content: HomePageContent): Promise<FormResult> {
    const normalized = normalizeHomePageContent(content);

    const heroValidation = await validateHomePageHero(normalized.hero);
    if (!heroValidation.ok) {
        return heroValidation;
    }

    for (let index = 0; index < normalized.sections.length; index += 1) {
        const section = normalized.sections[index];
        const validation = await validateHomePageSection(section, `Section ${index + 1}`);
        if (!validation.ok) {
            return validation;
        }
    }

    return { ok: true };
}

async function resolveSection(section: HomePageSectionConfig): Promise<HomePageSectionDisplay | null> {
    if (!section.categoryId) {
        return null;
    }

    const activeCategory = await getShopCategoryById(section.categoryId);
    if (!activeCategory) {
        return null;
    }

    const selectedIds = section.productIds.filter((id) => id > 0);
    if (selectedIds.length !== HOMEPAGE_SECTION_PRODUCT_COUNT) {
        return null;
    }

    const rows = await db
        .select({
            id: product.id,
            name: product.name,
            itemNumber: product.itemNumber,
            imagePath: vercelImage.path,
        })
        .from(product)
        .innerJoin(productCategory, eq(productCategory.productId, product.id))
        .leftJoin(productImage, eq(productImage.productId, product.id))
        .leftJoin(vercelImage, eq(vercelImage.id, productImage.vercelImageId))
        .where(
            and(
                inArray(product.id, selectedIds),
                eq(product.isActive, true),
                eq(productCategory.categoryId, section.categoryId),
            ),
        );

    const byId = new Map<number, HomePageProductDisplay>();

    for (const row of rows) {
        if (byId.has(row.id)) {
            continue;
        }

        byId.set(row.id, {
            id: row.id,
            name: row.name?.trim() || `Product ${row.id}`,
            itemNumber: row.itemNumber?.trim() || '',
            imagePath: row.imagePath ?? null,
        });
    }

    const products = selectedIds.map((id) => byId.get(id)).filter((productRow): productRow is HomePageProductDisplay => productRow != null);

    return {
        categoryId: activeCategory.id,
        title: resolveHomePageSectionTitle(section.title, activeCategory.name),
        categoryName: activeCategory.name,
        categoryHref: buildShopCategoryPath(activeCategory.id, activeCategory.navName),
        description: section.description.trim(),
        products,
    };
}

async function resolveHomePageDisplay(content: HomePageContent): Promise<HomePageDisplayContent> {
    const normalized = normalizeHomePageContent(content);
    const sections: HomePageSectionDisplay[] = [];

    for (const section of normalized.sections) {
        const resolved = await resolveSection(section);
        if (resolved) {
            sections.push(resolved);
        }
    }

    return {
        hero: normalized.hero,
        sections,
    };
}

export const getHomePageDisplayForSite = cache(async (): Promise<HomePageDisplayContent> => {
    const raw = await readHomePageContentRaw();
    const content = parseHomePageContent(raw);
    return resolveHomePageDisplay(content);
});

export async function getHomePageContentForManage(): Promise<HomePageContent> {
    const raw = await readHomePageContentRaw();
    return parseHomePageContent(raw);
}

export async function saveHomePageHero(hero: HomePageContent['hero']): Promise<FormResult> {
    const current = parseHomePageContent(await readHomePageContentRaw());
    const normalized = normalizeHomePageContent({ hero, sections: current.sections });
    const validation = await validateHomePageHero(normalized.hero);

    if (!validation.ok) {
        return validation;
    }

    return persistHomePageContent(normalized);
}

export async function saveHomePageSectionOrder(sections: HomePageSectionConfig[]): Promise<FormResult> {
    const current = parseHomePageContent(await readHomePageContentRaw());

    return persistHomePageContent(
        normalizeHomePageContent({
            hero: current.hero,
            sections,
        }),
    );
}

export async function saveHomePageSectionAtIndex(
    sectionIndex: number,
    section: HomePageSectionConfig,
    sections: HomePageSectionConfig[],
): Promise<FormResult> {
    const current = parseHomePageContent(await readHomePageContentRaw());
    const normalizedSections = normalizeHomePageContent({ hero: current.hero, sections }).sections;

    if (sectionIndex < 0 || sectionIndex >= normalizedSections.length) {
        return { ok: false, error: 'Invalid section.' };
    }

    normalizedSections[sectionIndex] = normalizeHomePageContent({ sections: [section] }).sections[0];
    const validation = await validateHomePageSection(normalizedSections[sectionIndex], `Section ${sectionIndex + 1}`);

    if (!validation.ok) {
        return validation;
    }

    return persistHomePageContent(
        normalizeHomePageContent({
            hero: current.hero,
            sections: normalizedSections,
        }),
    );
}

export async function removeHomePageSectionAtIndex(sectionIndex: number, sections: HomePageSectionConfig[]): Promise<FormResult> {
    const current = parseHomePageContent(await readHomePageContentRaw());
    const normalizedSections = normalizeHomePageContent({ hero: current.hero, sections }).sections.filter((_, index) => index !== sectionIndex);

    return persistHomePageContent(
        normalizeHomePageContent({
            hero: current.hero,
            sections: normalizedSections,
        }),
    );
}

export async function updateHomePageContent(content: HomePageContent): Promise<FormResult> {
    const normalized = normalizeHomePageContent(content);
    const validation = await validateHomePageContent(normalized);

    if (!validation.ok) {
        return validation;
    }

    return persistHomePageContent(normalized);
}

export async function resetHomePageContentToDefaults(): Promise<FormResult> {
    return persistHomePageContent(DEFAULT_HOME_PAGE_CONTENT);
}
