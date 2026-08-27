export function escapeHtml(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

export function escapeHtmlOrDash(value: string | null | undefined): string {
    const trimmed = value?.trim();
    return trimmed ? escapeHtml(trimmed) : '—';
}
