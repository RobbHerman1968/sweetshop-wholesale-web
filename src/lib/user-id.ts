/** Normalize session/JWT/DB user id values to a positive integer. */
export function parseUserId(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        return value;
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) {
            return null;
        }
        const parsed = Number.parseInt(trimmed, 10);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }

    return null;
}
