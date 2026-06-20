'use server';

import {
    wholesaleApplicationSchema,
    type WholesaleApplicationField,
    type WholesaleApplicationInput,
} from '@/lib/validations/wholesale-application';

export type SubmitWholesaleApplicationResult =
    | { ok: true }
    | { ok: false; fieldErrors?: Partial<Record<WholesaleApplicationField, string>>; error?: string };

export async function submitWholesaleApplication(
    input: WholesaleApplicationInput,
): Promise<SubmitWholesaleApplicationResult> {
    const parsed = wholesaleApplicationSchema.safeParse(input);
    if (!parsed.success) {
        const fieldErrors: Partial<Record<WholesaleApplicationField, string>> = {};
        for (const issue of parsed.error.issues) {
            const path = issue.path[0];
            if (typeof path === 'string' && !fieldErrors[path as WholesaleApplicationField]) {
                fieldErrors[path as WholesaleApplicationField] = issue.message;
            }
        }
        return { ok: false, fieldErrors };
    }

    // TODO: persist application or notify wholesale support when email/storage is wired up.
    console.info('[Wholesale application]', parsed.data);

    return { ok: true };
}
