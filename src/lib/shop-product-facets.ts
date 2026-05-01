export type ShopProductFacet = {
    id: string;
    label: string;
    /** Match when any term appears in product name or description (case-insensitive substring). */
    searchTerms: string[];
};

/**
 * Keyword facets for wholesale shop filtering. Terms are matched against `product.name` and `product.description`.
 * Adjust `searchTerms` as your catalog copy evolves (runs as ILIKE substrings).
 */
export const SHOP_PRODUCT_FACETS: ShopProductFacet[] = [
    { id: 'truffles', label: 'Truffles', searchTerms: ['truffle'] },
    { id: 'fudge', label: 'Fudge', searchTerms: ['fudge'] },
    { id: 'clusters', label: 'Clusters', searchTerms: ['cluster'] },
    { id: 'nuts-chewies', label: 'Nuts & chewies', searchTerms: ['chewie', 'nuts and chewies'] },
    { id: 'famous-brags', label: 'Famous Brags', searchTerms: ['famous brag', 'brags'] },
    { id: 'toffee', label: 'Toffee', searchTerms: ['toffee'] },
    { id: 'brittle', label: 'Brittle', searchTerms: ['brittle'] },
    { id: 'turtles', label: 'Turtles', searchTerms: ['turtle'] },
    { id: 'gift-packaging', label: 'Gifts & tins', searchTerms: ['gift tin', 'gift set', 'gift box'] },
    { id: 'assortment', label: 'Assortments', searchTerms: ['assortment'] },
    { id: 'dark-chocolate', label: 'Dark chocolate', searchTerms: ['dark chocolate'] },
    { id: 'milk-chocolate', label: 'Milk chocolate', searchTerms: ['milk chocolate'] },
    { id: 'mrs-weinstein', label: "Mrs. Weinstein's", searchTerms: ['weinstein'] },
    {
        id: 'seasonal',
        label: 'Seasonal / holiday',
        searchTerms: ['seasonal', 'holiday', 'christmas', 'easter', 'valentine', 'halloween'],
    },
];

const FACET_BY_ID = new Map(SHOP_PRODUCT_FACETS.map((f) => [f.id, f]));

export function normalizeShopFacetIds(raw: string[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const id of raw) {
        const trimmed = id.trim();
        if (!trimmed || seen.has(trimmed) || !FACET_BY_ID.has(trimmed)) continue;
        seen.add(trimmed);
        out.push(trimmed);
    }
    return out;
}

export function parseShopFacetParams(raw: string | string[] | undefined): string[] {
    if (raw == null) return [];
    const list = Array.isArray(raw) ? raw : [raw];
    return normalizeShopFacetIds(list.map(String));
}

/** Title-case each word for UI (spaces, `/`, and `&` act as boundaries). */
export function formatShopFacetLabel(label: string): string {
    return label.replace(/[^\s/&]+/g, (word) => {
        if (!word) return word;
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });
}
