'use server';

import { eq } from 'drizzle-orm';
import { db } from '@/lib/db-pg';
import { getApplyNowEmailAddress, getSendEmailFromAddress } from '@/lib/db-pg/actions/site-setting';
import { application } from '@/lib/drizzle/schema';
import { buildWholesaleApplicationEmailContent } from '@/lib/email/wholesale-application-email-template';
import { sendEmailViaResend } from '@/lib/resend-email';
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

    const data = parsed.data;

    let applicationId: number;
    try {
        const [row] = await db
            .insert(application)
            .values({
                businessName: data.businessName.trim(),
                taxId: data.taxId.trim(),
                contactFirstName: data.contactFirstName.trim(),
                contactLastName: data.contactLastName.trim(),
                billingAddress1: data.billingAddress1.trim(),
                billingAddress2: data.billingAddress2?.trim() || null,
                city: data.city.trim(),
                state: data.state.trim(),
                zipCode: data.zipCode.trim(),
                phone: data.phone.trim(),
                fax: data.fax?.trim() || null,
                email: data.email.trim(),
                emailSent: false,
            })
            .returning({ id: application.id });

        if (!row?.id) {
            return { ok: false, error: 'Unable to submit your application. Please try again.' };
        }

        applicationId = row.id;
    } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (message.includes('application') && message.includes('does not exist')) {
            return {
                ok: false,
                error: 'Apply src/lib/drizzle/0022_application.sql before accepting applications.',
            };
        }

        console.error('[Wholesale application] save failed', error);
        return { ok: false, error: 'Unable to submit your application. Please try again.' };
    }

    const [fromEmail, toEmail] = await Promise.all([getSendEmailFromAddress(), getApplyNowEmailAddress()]);

    if (!fromEmail || !toEmail) {
        console.error('[Wholesale application] missing email settings', { hasFrom: Boolean(fromEmail), hasTo: Boolean(toEmail) });
        return { ok: true };
    }

    const { subject, html, text } = buildWholesaleApplicationEmailContent(data);
    const result = await sendEmailViaResend({
        from: fromEmail,
        to: toEmail,
        subject,
        html,
        text,
    });

    if (!result.ok) {
        console.error('[Wholesale application] email failed', result.error);
        return { ok: true };
    }

    try {
        await db.update(application).set({ emailSent: true }).where(eq(application.id, applicationId));
    } catch (error) {
        console.error('[Wholesale application] emailSent update failed', error);
    }

    return { ok: true };
}
