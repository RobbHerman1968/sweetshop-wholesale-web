import { cache } from 'react';
import { db } from '@/lib/db-pg';
import { category, menu, menuItem, page } from '@/lib/drizzle/schema';
import { and, asc, eq, ilike, inArray, sql } from 'drizzle-orm';
import type { BrandBarNavCategory, BrandBarNavLink, BrandBarNavSection } from '@/assets/brand-bar-nav';
import { getCategoryIdsWithActiveProducts } from '@/lib/db-pg/actions/product';
import { buildPagePath } from '@/lib/page-path';
import { buildShopCategoryPath } from '@/lib/shop-category-path';
import { getShoppingMenuIdFromSession } from '@/lib/shop-shopping-menu';
import { applyShopByLocationAccountName } from '@/lib/brand-bar-shop-by-location';
import { getWholesaleAccountSwitcherState } from '@/lib/wholesale-account-switcher-actions';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import {
    WHOLESALE_BRAND_BAR_MENU_ID,
    WHOLESALE_PAGE_MENU_ID,
    WHOLESALE_SHOPPING_MENU_ID,
} from '@/lib/menu-manage-utils';

export { WHOLESALE_BRAND_BAR_MENU_ID, WHOLESALE_PAGE_MENU_ID, WHOLESALE_SHOPPING_MENU_ID };

export type ManageMenu = {
    id: number;
    name: string;
    description: string;
    isShopping: boolean;
    shippingLeadTime: number;
    itemCount: number;
};

export type ManageMenuItem = {
    id: number;
    menuId: number;
    parentMenuItemId: number;
    categoryId: number | null;
    pageId: number | null;
    externalUrl: string | null;
    name: string;
    isActive: boolean;
    displayOrder: number;
};

export type MenuEditLookup = {
    id: number;
    name: string;
};

function mapMenuItemRow(match: {
    id: number;
    menuId: number;
    parentMenuItemId: number;
    categoryId: number | null;
    pageId: number | null;
    externalUrl: string | null;
    name: string | null;
    isActive: boolean | null;
    displayOrder: number | null;
}): ManageMenuItem {
    return {
        id: match.id,
        menuId: match.menuId,
        parentMenuItemId: match.parentMenuItemId,
        categoryId: match.categoryId,
        pageId: match.pageId,
        externalUrl: match.externalUrl?.trim() || null,
        name: match.name?.trim() || '',
        isActive: match.isActive ?? false,
        displayOrder: match.displayOrder ?? 0,
    };
}

export async function getMenusFromDB(): Promise<ManageMenu[]> {
    const menus = await db
        .select({
            id: menu.id,
            name: menu.name,
            description: menu.description,
            isShopping: menu.isShopping,
            shippingLeadTime: menu.shippingLeadTime,
        })
        .from(menu)
        .orderBy(asc(menu.id));

    return mapMenusWithItemCounts(menus);
}

export async function getShoppingMenusFromDB(): Promise<ManageMenu[]> {
    const menus = await db
        .select({
            id: menu.id,
            name: menu.name,
            description: menu.description,
            isShopping: menu.isShopping,
            shippingLeadTime: menu.shippingLeadTime,
        })
        .from(menu)
        .where(eq(menu.isShopping, true))
        .orderBy(asc(menu.id));

    return mapMenusWithItemCounts(menus);
}

async function mapMenusWithItemCounts(
    menus: {
        id: number;
        name: string | null;
        description: string | null;
        isShopping: boolean | null;
        shippingLeadTime: number | null;
    }[],
): Promise<ManageMenu[]> {
    const counts = await db
        .select({
            menuId: menuItem.menuId,
            count: sql<number>`count(*)`,
        })
        .from(menuItem)
        .groupBy(menuItem.menuId);

    const countByMenuId = new Map(counts.map((row) => [row.menuId, Number(row.count)]));

    return menus.map((row) => ({
        id: row.id,
        name: row.name?.trim() || `Menu ${row.id}`,
        description: row.description?.trim() || '',
        isShopping: row.isShopping ?? false,
        shippingLeadTime: row.shippingLeadTime ?? 14,
        itemCount: countByMenuId.get(row.id) ?? 0,
    }));
}

export async function getMenuByIdForManage(menuId: number): Promise<ManageMenu | null> {
    if (!Number.isFinite(menuId) || menuId <= 0) return null;

    const row = await db
        .select({
            id: menu.id,
            name: menu.name,
            description: menu.description,
            isShopping: menu.isShopping,
            shippingLeadTime: menu.shippingLeadTime,
        })
        .from(menu)
        .where(eq(menu.id, menuId))
        .limit(1);
    const match = row[0];
    if (!match) return null;

    const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(menuItem)
        .where(eq(menuItem.menuId, menuId));

    return {
        id: match.id,
        name: match.name?.trim() || `Menu ${match.id}`,
        description: match.description?.trim() || '',
        isShopping: match.isShopping ?? false,
        shippingLeadTime: match.shippingLeadTime ?? 14,
        itemCount: Number(count),
    };
}

export async function getMenuItemsForManage(menuId: number, name?: string): Promise<ManageMenuItem[]> {
    if (!Number.isFinite(menuId) || menuId <= 0) return [];

    const whereClause = name
        ? and(eq(menuItem.menuId, menuId), ilike(menuItem.name, `%${name}%`))
        : eq(menuItem.menuId, menuId);

    const rows = await db
        .select({
            id: menuItem.id,
            menuId: menuItem.menuId,
            parentMenuItemId: menuItem.parentMenuItemId,
            categoryId: menuItem.categoryId,
            pageId: menuItem.pageId,
            externalUrl: menuItem.externalUrl,
            name: menuItem.name,
            isActive: menuItem.isActive,
            displayOrder: menuItem.displayOrder,
        })
        .from(menuItem)
        .where(whereClause)
        .orderBy(asc(menuItem.displayOrder), asc(menuItem.id));

    return rows.map(mapMenuItemRow);
}

export async function getMenuItemByIdForManage(itemId: number): Promise<ManageMenuItem | null> {
    if (!Number.isFinite(itemId) || itemId <= 0) return null;

    const row = await db
        .select({
            id: menuItem.id,
            menuId: menuItem.menuId,
            parentMenuItemId: menuItem.parentMenuItemId,
            categoryId: menuItem.categoryId,
            pageId: menuItem.pageId,
            externalUrl: menuItem.externalUrl,
            name: menuItem.name,
            isActive: menuItem.isActive,
            displayOrder: menuItem.displayOrder,
        })
        .from(menuItem)
        .where(eq(menuItem.id, itemId))
        .limit(1);

    const match = row[0];
    if (!match) return null;

    return mapMenuItemRow(match);
}

export async function getMenuEditLookups(): Promise<{ categories: MenuEditLookup[]; pages: MenuEditLookup[] }> {
    const [categories, pages] = await Promise.all([
        db
            .select({ id: category.id, name: category.name })
            .from(category)
            .orderBy(asc(category.name)),
        db
            .select({ id: page.id, name: page.name })
            .from(page)
            .orderBy(asc(page.name)),
    ]);

    return {
        categories: categories.map((row) => ({ id: row.id, name: row.name?.trim() || `Category ${row.id}` })),
        pages: pages.map((row) => ({ id: row.id, name: row.name?.trim() || `Page ${row.id}` })),
    };
}

export async function getMenuItemNameMaps(items: ManageMenuItem[]): Promise<{
    categoryNames: Map<number, string>;
    pageNames: Map<number, string>;
}> {
    const categoryIds = [...new Set(items.map((item) => item.categoryId).filter((id): id is number => id != null && id > 0))];
    const pageIds = [...new Set(items.map((item) => item.pageId).filter((id): id is number => id != null && id > 0))];
    const categoryNames = new Map<number, string>();
    const pageNames = new Map<number, string>();

    if (categoryIds.length > 0) {
        const categories = await db
            .select({ id: category.id, name: category.name })
            .from(category)
            .where(inArray(category.id, categoryIds));

        for (const row of categories) {
            categoryNames.set(row.id, row.name?.trim() || `Category ${row.id}`);
        }
    }

    if (pageIds.length > 0) {
        const pages = await db
            .select({ id: page.id, name: page.name })
            .from(page)
            .where(inArray(page.id, pageIds));

        for (const row of pages) {
            pageNames.set(row.id, row.name?.trim() || `Page ${row.id}`);
        }
    }

    return { categoryNames, pageNames };
}

function formatMenuLabel(name: string): string {
    return name.replace(/[^\s/&]+/g, (word) => {
        if (!word) return word;
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });
}

type MenuRow = {
    id: number;
    parentMenuItemId: number;
    categoryId: number | null;
    pageId: number | null;
    externalUrl: string | null;
    name: string | null;
    displayOrder: number;
};

function menuItemHref(row: Pick<MenuRow, 'categoryId' | 'pageId' | 'externalUrl'>, categoryNavNames: Map<number, string>, pageNavNames: Map<number, string>): string {
    const externalUrl = row.externalUrl?.trim();
    if (externalUrl) return externalUrl;

    if (row.pageId != null && row.pageId > 0) {
        const navName = pageNavNames.get(row.pageId)?.trim();
        if (!navName) return `/page/${row.pageId}`;
        return buildPagePath(row.pageId, navName);
    }

    if (row.categoryId == null || row.categoryId <= 0) return '/shop';

    const navName = categoryNavNames.get(row.categoryId)?.trim();
    if (!navName) return `/shop/${row.categoryId}`;

    return buildShopCategoryPath(row.categoryId, navName);
}

function rowToLink(row: MenuRow, categoryNavNames: Map<number, string>, pageNavNames: Map<number, string>): BrandBarNavLink {
    const title = formatMenuLabel(row.name?.trim() || 'Link');
    const categoryNav = row.categoryId != null && row.categoryId > 0 ? categoryNavNames.get(row.categoryId) : undefined;
    const pageNav = row.pageId != null && row.pageId > 0 ? pageNavNames.get(row.pageId) : undefined;
    const externalUrl = row.externalUrl?.trim();

    return {
        title,
        href: menuItemHref(row, categoryNavNames, pageNavNames),
        description: pageNav?.trim() || categoryNav?.trim() || title,
        categoryId: row.categoryId,
        pageId: row.pageId,
        externalUrl: externalUrl || null,
        opensInNewWindow: Boolean(externalUrl),
    };
}

function isSectionHeader(row: MenuRow): boolean {
    if (row.externalUrl?.trim()) return false;
    if (row.pageId != null && row.pageId > 0) return false;
    return row.categoryId == null || row.categoryId === 0;
}

function isSeasonSectionStarter(name: string | null | undefined): boolean {
    return /^season/i.test(name?.trim() ?? '');
}

function pushSection(sections: BrandBarNavSection[], section: BrandBarNavSection | null) {
    if (!section || section.links.length === 0) return;
    sections.push(section);
}

/** Flat sibling list: `categoryId = 0` rows start a section; following rows are links until the next header. */
function buildSectionsFromFlatSiblings(childRows: MenuRow[], categoryNavNames: Map<number, string>, pageNavNames: Map<number, string>): BrandBarNavSection[] {
    const sections: BrandBarNavSection[] = [];
    let current: BrandBarNavSection | null = null;

    for (const child of childRows) {
        const title = formatMenuLabel(child.name?.trim() || 'Link');

        if (isSectionHeader(child)) {
            pushSection(sections, current);
            current = { title, links: [] };
            continue;
        }

        const link = rowToLink(child, categoryNavNames, pageNavNames);

        if (current && current.links.length > 0 && isSeasonSectionStarter(child.name)) {
            pushSection(sections, current);
            current = { title: 'Season', links: [link] };
            continue;
        }

        if (!current) {
            current = { title: '', links: [link] };
        } else {
            current.links.push(link);
        }
    }

    pushSection(sections, current);
    return sections;
}

/** Nested tree: level-2 rows become section titles; their children become links. */
function buildSectionsFromNestedChildren(childRows: MenuRow[], byParent: Map<number, MenuRow[]>, categoryNavNames: Map<number, string>, pageNavNames: Map<number, string>): BrandBarNavSection[] {
    const sections: BrandBarNavSection[] = [];

    for (const child of childRows) {
        const grandchildren = byParent.get(child.id) ?? [];
        const title = formatMenuLabel(child.name?.trim() || 'Section');

        if (grandchildren.length > 0) {
            const links = grandchildren.filter((row) => !isSectionHeader(row)).map((row) => rowToLink(row, categoryNavNames, pageNavNames));
            if (links.length > 0) {
                sections.push({ title, links });
            }
            continue;
        }

        if (isSectionHeader(child)) {
            pushSection(sections, { title, links: [] });
            continue;
        }

        const last = sections[sections.length - 1];
        const link = rowToLink(child, categoryNavNames, pageNavNames);
        if (last) {
            last.links.push(link);
        } else {
            sections.push({ title: '', links: [link] });
        }
    }

    return sections.filter((section) => section.links.length > 0);
}

function buildBrandBarNavCategories(rows: MenuRow[], categoryNavNames: Map<number, string>, pageNavNames: Map<number, string>): BrandBarNavCategory[] {
    const byParent = new Map<number, MenuRow[]>();

    for (const row of rows) {
        const parentId = row.parentMenuItemId;
        const siblings = byParent.get(parentId) ?? [];
        siblings.push(row);
        byParent.set(parentId, siblings);
    }

    for (const siblings of byParent.values()) {
        siblings.sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id);
    }

    const topLevel = byParent.get(0) ?? [];

    return topLevel.map((top) => {
        const childRows = byParent.get(top.id) ?? [];
        const topCategoryNav = top.categoryId != null && top.categoryId > 0 ? categoryNavNames.get(top.categoryId) : undefined;
        const hasNestedChildren = childRows.some((child) => (byParent.get(child.id)?.length ?? 0) > 0);
        const sections = hasNestedChildren ? buildSectionsFromNestedChildren(childRows, byParent, categoryNavNames, pageNavNames) : buildSectionsFromFlatSiblings(childRows, categoryNavNames, pageNavNames);

        return {
            label: formatMenuLabel(top.name?.trim() || 'Menu'),
            description: topCategoryNav?.trim() || formatMenuLabel(top.name?.trim() || ''),
            sections,
        };
    });
}

export const getShopMenuCategoryIds = cache(async (menuId = WHOLESALE_SHOPPING_MENU_ID): Promise<number[]> => {
    const rows = await db
        .select({ categoryId: menuItem.categoryId })
        .from(menuItem)
        .where(and(eq(menuItem.menuId, menuId), eq(menuItem.isActive, true)));

    return [...new Set(rows.map((row) => row.categoryId).filter((id): id is number => id != null && id > 0))];
});

export function remapBrandBarCategoryLinksForShopMenu(
    categories: BrandBarNavCategory[],
    shopMenuCategoryIds: number[],
): BrandBarNavCategory[] {
    const allowed = new Set(shopMenuCategoryIds);

    return categories.map((group) => ({
        ...group,
        sections: group.sections.map((section) => ({
            ...section,
            links: section.links.map((link) => {
                if (link.categoryId == null || link.categoryId <= 0) return link;
                if (allowed.has(link.categoryId)) return link;
                return { ...link, href: '/shop' };
            }),
        })),
    }));
}

export async function getBrandBarNavCategoriesForSiteHeader(
    menuId = WHOLESALE_BRAND_BAR_MENU_ID,
): Promise<BrandBarNavCategory[]> {
    const shoppingMenuId = await getShoppingMenuIdFromSession();
    const session = await getServerSession(authOptions);
    const [categories, shopMenuCategoryIds, switcherState] = await Promise.all([
        getBrandBarNavCategories(menuId),
        getShopMenuCategoryIds(shoppingMenuId),
        session?.user ? getWholesaleAccountSwitcherState() : Promise.resolve(null),
    ]);

    const remapped = remapBrandBarCategoryLinksForShopMenu(categories, shopMenuCategoryIds);
    return applyShopByLocationAccountName(remapped, switcherState?.selectedAccountDisplayName);
}

export const getBrandBarNavCategories = cache(async (menuId = WHOLESALE_BRAND_BAR_MENU_ID): Promise<BrandBarNavCategory[]> => {
    const rows = await db
        .select({
            id: menuItem.id,
            parentMenuItemId: menuItem.parentMenuItemId,
            categoryId: menuItem.categoryId,
            pageId: menuItem.pageId,
            externalUrl: menuItem.externalUrl,
            name: menuItem.name,
            displayOrder: menuItem.displayOrder,
        })
        .from(menuItem)
        .where(and(eq(menuItem.menuId, menuId), eq(menuItem.isActive, true)))
        .orderBy(asc(menuItem.displayOrder), asc(menuItem.id));

    if (rows.length === 0) return [];

    const categoryIds = [...new Set(rows.map((row) => row.categoryId).filter((id): id is number => id != null && id > 0))];
    const pageIds = [...new Set(rows.map((row) => row.pageId).filter((id): id is number => id != null && id > 0))];
    const categoryNavNames = new Map<number, string>();
    const pageNavNames = new Map<number, string>();

    if (categoryIds.length > 0) {
        const categories = await db
            .select({
                id: category.id,
                navName: category.navName,
                name: category.name,
            })
            .from(category)
            .where(inArray(category.id, categoryIds));

        for (const row of categories) {
            categoryNavNames.set(row.id, row.navName?.trim() || row.name?.trim() || '');
        }
    }

    if (pageIds.length > 0) {
        const pages = await db
            .select({
                id: page.id,
                navName: page.navName,
                name: page.name,
            })
            .from(page)
            .where(inArray(page.id, pageIds));

        for (const row of pages) {
            pageNavNames.set(row.id, row.navName?.trim() || row.name?.trim() || '');
        }
    }

    return buildBrandBarNavCategories(rows, categoryNavNames, pageNavNames);
});

function filterShopNavCategoriesByActiveProducts(
    categories: BrandBarNavCategory[],
    activeCategoryIds: Set<number>,
): BrandBarNavCategory[] {
    return categories
        .map((group) => ({
            ...group,
            sections: group.sections
                .map((section) => ({
                    ...section,
                    links: section.links.filter((link) => {
                        if (link.categoryId == null || link.categoryId <= 0) return true;
                        return activeCategoryIds.has(link.categoryId);
                    }),
                }))
                .filter((section) => section.links.length > 0),
        }))
        .filter((group) => group.sections.length > 0);
}

export const getShopNavCategories = cache(async (menuId = WHOLESALE_SHOPPING_MENU_ID): Promise<BrandBarNavCategory[]> => {
    const [categories, activeCategoryIds] = await Promise.all([
        getBrandBarNavCategories(menuId),
        getCategoryIdsWithActiveProducts(),
    ]);

    return filterShopNavCategoriesByActiveProducts(categories, activeCategoryIds);
});
