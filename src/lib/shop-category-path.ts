export function normalizeShopCategoryNavName(navName: string): string {
    return navName.trim();
}

export function shopCategoryNavNamesMatch(urlNavName: string, categoryNavName: string): boolean {
    return normalizeShopCategoryNavName(urlNavName).toLowerCase() === normalizeShopCategoryNavName(categoryNavName).toLowerCase();
}

export function buildShopCategoryPath(categoryId: number, navName: string): string {
    const slug = normalizeShopCategoryNavName(navName);
    if (!slug) return `/shop/${categoryId}`;
    return `/shop/${categoryId}/${encodeURIComponent(slug)}`;
}

export function buildShopCategoryQuery(
    categoryPath: string,
    params: {
        page?: number;
        search?: string;
        facetIds?: string[];
    },
): string {
    const q = new URLSearchParams();
    if (params.page != null && params.page > 1) q.set('page', String(params.page));
    if (params.search?.trim()) q.set('search', params.search.trim());
    for (const id of params.facetIds ?? []) q.append('facet', id);
    const qs = q.toString();
    return qs ? `${categoryPath}?${qs}` : categoryPath;
}
