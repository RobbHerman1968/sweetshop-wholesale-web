const LEGACY_DYNIMAGE_BASE = 'https://sweetshopusawholesale.com/dynimage/';

function encodeLegacyDynImageName(imageName: string): string {
    return encodeURIComponent(imageName.trim())
        .replace(/\(/g, '%28')
        .replace(/\)/g, '%29');
}

/** Legacy product image URL from the old site's dynimage handler. */
export function buildLegacyDynImageUrl(imageName: string, width = 800, height = 800): string {
    const trimmed = imageName.trim();
    if (!trimmed) return '';

    return `${LEGACY_DYNIMAGE_BASE}?img=${encodeLegacyDynImageName(trimmed)}&wid=${width}&hei=${height}&bg=FFFFFF,1&bfit=1`;
}
