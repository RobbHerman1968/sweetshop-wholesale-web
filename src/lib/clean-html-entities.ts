export function cleanHtmlEntitySymbols(value: string): string {
    return value
        .replaceAll('&trade;', '™')
        .replaceAll('&reg;', '®')
        .replaceAll('&copy;', '©');
}

export function cleanHtmlEntitySymbolsOrNull(value: string | null | undefined): string | null {
    if (value == null) {
        return null;
    }
    return cleanHtmlEntitySymbols(value);
}
