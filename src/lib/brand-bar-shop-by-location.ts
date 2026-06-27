import type { BrandBarNavCategory } from '@/assets/brand-bar-nav';

const SHOP_BY_LOCATION_LABEL = /shop\s*by\s*location/i;

export function isShopByLocationBrandBarCategory(label: string): boolean {
    return SHOP_BY_LOCATION_LABEL.test(label.trim());
}

/** Overlay the signed-in wholesale account name on the brand-bar "Shop By Location" category. */
export function applyShopByLocationAccountName(
    categories: BrandBarNavCategory[],
    accountDisplayName: string | null | undefined,
): BrandBarNavCategory[] {
    const name = accountDisplayName?.trim();
    if (!name) return categories;

    return categories.map((group) =>
        isShopByLocationBrandBarCategory(group.label) ? { ...group, description: name } : group,
    );
}
