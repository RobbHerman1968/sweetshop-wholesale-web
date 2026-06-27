export const WHOLESALE_BRAND_BAR_MENU_ID = 1;
export const WHOLESALE_PAGE_MENU_ID = 2;
export const WHOLESALE_SHOPPING_MENU_ID = 3;
export const HEB_SHOPPING_MENU_ID = 4;

/** Legacy `SignInLocation` values mapped to wholesale `account.menuId`. */
export function mapSignInLocationIdToMenuId(signInLocationId: number): number {
    switch (signInLocationId) {
        case 0:
            return WHOLESALE_SHOPPING_MENU_ID;
        case 1:
            return 5;
        case 2:
            return 6;
        case 3:
            return HEB_SHOPPING_MENU_ID;
        case 4:
            return 7;
        default:
            return 0;
    }
}

export function usesGlobalMenuDisplayOrder(menuId: number): boolean {
    return menuId === WHOLESALE_SHOPPING_MENU_ID || menuId === HEB_SHOPPING_MENU_ID;
}

export type ManageMenuItemTarget = {
    categoryId: number | null;
    pageId: number | null;
    externalUrl: string | null;
};

export function formatManageMenuLabel(menu: { id: number; name: string | null | undefined }): string {
    const name = menu.name?.trim() || `Menu ${menu.id}`;
    const usage = getMenuUsageDescription(menu.id);
    return usage ? `${name} — ${usage}` : name;
}

export function isAccountShoppingMenuId(menuId: number): boolean {
    return menuId >= WHOLESALE_SHOPPING_MENU_ID;
}

export function getMenuUsageDescription(menuId: number): string | null {
    switch (menuId) {
        case WHOLESALE_BRAND_BAR_MENU_ID:
            return 'Top navigation bar on the public site';
        case WHOLESALE_PAGE_MENU_ID:
            return 'Left sidebar on Pages Menu';
        case WHOLESALE_SHOPPING_MENU_ID:
            return 'Left sidebar in the Shopping Menu';
        case HEB_SHOPPING_MENU_ID:
            return 'Left sidebar in the HEB Shopping Menu';
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
