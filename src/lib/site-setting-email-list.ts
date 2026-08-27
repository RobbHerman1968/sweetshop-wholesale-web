import { z } from 'zod';

const emailSchema = z.string().trim().email();

export function parseEmailList(value: string | null | undefined): string[] {
    if (!value?.trim()) {
        return [];
    }

    return value
        .split(/[;,\n\r]+/)
        .map((entry) => entry.trim())
        .filter(Boolean);
}

export function formatEmailListForInput(value: string | null | undefined): string {
    return parseEmailList(value).join('\n');
}

export function normalizeEmailListInput(
    raw: string,
): { ok: true; value: string } | { ok: false; error: string } {
    const emails = parseEmailList(raw);

    for (const email of emails) {
        const parsed = emailSchema.safeParse(email);
        if (!parsed.success) {
            return { ok: false, error: `Enter valid email addresses. Invalid: ${email}` };
        }
    }

    return { ok: true, value: emails.join(';') };
}

export function normalizeSingleEmailInput(
    raw: string,
): { ok: true; value: string } | { ok: false; error: string } {
    const email = raw.trim();
    if (!email) {
        return { ok: true, value: '' };
    }

    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
        return { ok: false, error: 'Enter a valid email address.' };
    }

    return { ok: true, value: parsed.data };
}
