export const APPLICATION_ATTACHMENT_MAX_BYTES = 8 * 1024 * 1024;
export const APPLICATION_ATTACHMENT_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp';

const ALLOWED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp']);

export function getApplicationAttachmentFilename(name: string): string {
    const base = name.split(/[/\\]/).pop()?.trim() || 'attachment';
    const sanitized = base.replace(/[^\w.\- ()]+/g, '_').slice(0, 120);
    return sanitized || 'attachment';
}

function hasAllowedExtension(name: string): boolean {
    const match = name.toLowerCase().match(/\.[a-z0-9]+$/);
    return match != null && ALLOWED_EXTENSIONS.has(match[0]);
}

export function validateApplicationAttachment(file: File | null): { ok: true } | { ok: false; error: string } {
    if (!file || file.size === 0) {
        return { ok: true };
    }

    if (file.size > APPLICATION_ATTACHMENT_MAX_BYTES) {
        return { ok: false, error: 'File must be 8 MB or smaller.' };
    }

    if (!ALLOWED_TYPES.has(file.type) && !hasAllowedExtension(file.name)) {
        return { ok: false, error: 'Use a PDF, JPG, PNG, or WebP file.' };
    }

    return { ok: true };
}
