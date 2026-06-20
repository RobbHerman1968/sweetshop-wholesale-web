export const WHOLESALE_BRAND_BAR_MENU_ID = 1;
export const WHOLESALE_PAGE_MENU_ID = 2;
export const WHOLESALE_SHOPPING_MENU_ID = 3;

export function usesGlobalMenuDisplayOrder(menuId: number): boolean {
    return menuId === WHOLESALE_SHOPPING_MENU_ID;
}

export type ManageMenuItemTarget = {
    categoryId: number | null;
    pageId: number | null;
    externalUrl: string | null;
};

export function getMenuUsageDescription(menuId: number): string | null {
    switch (menuId) {
        case WHOLESALE_BRAND_BAR_MENU_ID:
            return 'Top navigation bar on the public site';
        case WHOLESALE_PAGE_MENU_ID:
            return 'Left sidebar on CMS pages';
        case WHOLESALE_SHOPPING_MENU_ID:
            return 'Left sidebar in the shop catalog';
        default:
            return null;
    }
}

export function describeMenuItemTarget(
    item: ManageMenuItemTarget,
    categoryNames: Map<number, string>,
    pageNames: Map<number, string>,
): string {
    const externalUrl = item.externalUrl?.trim();
    if (externalUrl) return `External: ${externalUrl}`;

    if (item.pageId != null && item.pageId > 0) {
        return `Page: ${pageNames.get(item.pageId) ?? `#${item.pageId}`}`;
    }

    if (item.categoryId != null && item.categoryId > 0) {
        return `Category: ${categoryNames.get(item.categoryId) ?? `#${item.categoryId}`}`;
    }

    return 'Section header';
}
