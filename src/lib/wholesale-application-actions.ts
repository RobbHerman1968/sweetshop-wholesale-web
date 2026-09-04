'use server';

import { eq } from 'drizzle-orm';
import { db } from '@/lib/db-pg';
import { insertOrderLog } from '@/lib/db-pg/actions/order-log';
import { getApplyNowEmailAddress, getSendEmailFromAddress } from '@/lib/db-pg/actions/site-setting';
import { application } from '@/lib/drizzle/schema';
import { buildWholesaleApplicationEmailContent } from '@/lib/email/wholesale-application-email-template';
import { sendEmailViaResend } from '@/lib/resend-email';
import {
    getApplicationAttachmentFilename,
    validateApplicationAttachment,
} from '@/lib/wholesale-application-attachment';
import {
    wholesaleApplicationSchema,
    type WholesaleApplicationField,
    type WholesaleApplicationInput,
} from '@/lib/validations/wholesale-application';

function readFormString(formData: FormData, key: keyof WholesaleApplicationInput): string {
    const value = formData.get(key);
    return typeof value === 'string' ? value : '';
}

export type SubmitWholesaleApplicationResult =
    | { ok: true }
    | { ok: false; fieldErrors?: Partial<Record<WholesaleApplicationField, string>>; error?: string };

export async function submitWholesaleApplication(formData: FormData): Promise<SubmitWholesaleApplicationResult> {
    const input: WholesaleApplicationInput = {
        businessName: readFormString(formData, 'businessName'),
        taxId: readFormString(formData, 'taxId'),
        contactFirstName: readFormString(formData, 'contactFirstName'),
        contactLastName: readFormString(formData, 'contactLastName'),
        billingAddress1: readFormString(formData, 'billingAddress1'),
        billingAddress2: readFormString(formData, 'billingAddress2') || undefined,
        city: readFormString(formData, 'city'),
        state: readFormString(formData, 'state'),
        zipCode: readFormString(formData, 'zipCode'),
        phone: readFormString(formData, 'phone'),
        fax: readFormString(formData, 'fax') || undefined,
        email: readFormString(formData, 'email'),
    };
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
    const rawAttachment = formData.get('attachment');
    const attachmentFile = rawAttachment instanceof File && rawAttachment.size > 0 ? rawAttachment : null;
    const attachmentCheck = validateApplicationAttachment(attachmentFile);
    if (!attachmentCheck.ok) {
        return { ok: false, error: attachmentCheck.error };
    }

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
        await insertOrderLog({
            outcome: 'failure',
            stage: 'email',
            message: `Wholesale application email skipped for application #${applicationId} — email settings incomplete.`,
            error: !fromEmail ? 'Send Email From is not configured.' : 'Apply Now Email Address is not configured.',
        });
        return { ok: true };
    }

    let attachments: Array<{ filename: string; content: Buffer; contentType?: string }> | undefined;
    let attachmentName: string | undefined;
    if (attachmentFile) {
        attachmentName = getApplicationAttachmentFilename(attachmentFile.name);
        attachments = [
            {
                filename: attachmentName,
                content: Buffer.from(await attachmentFile.arrayBuffer()),
                contentType: attachmentFile.type || undefined,
            },
        ];
    }

    const { subject, html, text } = buildWholesaleApplicationEmailContent(data, { attachmentName });
    const result = await sendEmailViaResend({
        from: fromEmail,
        to: toEmail,
        subject,
        html,
        text,
        attachments,
        logContext: {
            stage: 'email',
            message: `Wholesale application email failed for application #${applicationId}.`,
            successMessage: `Wholesale application email sent for application #${applicationId}.`,
        },
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
