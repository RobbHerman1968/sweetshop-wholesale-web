export function normalizePageNavName(navName: string): string {
    return navName.trim();
}

/** URL slug from a page title: alphanumeric + dashes, no consecutive spaces or dashes. */
export function slugifyPageNavName(name: string): string {
    return name
        .trim()
        .replace(/[^a-zA-Z0-9\s-]/g, '')
        .replace(/\s+/g, ' ')
        .replace(/\s/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase();
}

export function pageNavNamesMatch(urlNavName: string, pageNavName: string): boolean {
    return normalizePageNavName(urlNavName).toLowerCase() === normalizePageNavName(pageNavName).toLowerCase();
}

export function buildPagePath(pageId: number, navName: string): string {
    const slug = normalizePageNavName(navName);
    if (!slug) return `/page/${pageId}`;
    return `/page/${pageId}/${encodeURIComponent(slug)}`;
}
