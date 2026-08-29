import { Resend } from 'resend';
import { insertLog } from '@/lib/db-pg/actions/log';

export type SendEmailLogContext = {
    stage?: string;
    message?: string;
    orderId?: number;
    orderNumber?: number;
    accountId?: number;
    userId?: number;
};

export type SendEmailInput = {
    from: string;
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
    replyTo?: string | string[];
    attachments?: Array<{
        filename: string;
        content: Buffer;
        contentType?: string;
    }>;
    /** Optional context written to Manage → Log when sending fails. */
    logContext?: SendEmailLogContext;
};

export type SendEmailResult = { ok: true; id: string } | { ok: false; error: string };

function normalizeRecipients(to: string | string[]): string[] {
    const values = Array.isArray(to) ? to : [to];
    return values.map((entry) => entry.trim()).filter(Boolean);
}

function formatUnknownError(error: unknown): string {
    if (error instanceof Error) {
        const parts = [error.name ? `${error.name}: ${error.message}` : error.message];
        if (error.stack) {
            parts.push(error.stack);
        }
        const cause = (error as Error & { cause?: unknown }).cause;
        if (cause != null) {
            parts.push(`cause=${stringifyErrorDetail(cause)}`);
        }
        return parts.filter(Boolean).join('\n');
    }

    return stringifyErrorDetail(error);
}

function stringifyErrorDetail(value: unknown): string {
    if (value == null) {
        return '';
    }
    if (typeof value === 'string') {
        return value.trim();
    }
    if (value instanceof Error) {
        return formatUnknownError(value);
    }
    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return String(value);
    }
}

async function logEmailFailure(
    errorDetail: string,
    input: Pick<SendEmailInput, 'to' | 'subject' | 'from' | 'logContext'>,
): Promise<void> {
    const to = normalizeRecipients(input.to).join(', ');
    const from = input.from.trim();
    const subject = input.subject.trim() || '(no subject)';
    const stage = input.logContext?.stage?.trim() || 'email';
    const message = input.logContext?.message?.trim() || `Email failed: ${subject}`;

    const error = [
        errorDetail.trim() || 'Unknown email failure.',
        '',
        'Email details:',
        `subject=${subject}`,
        from ? `from=${from}` : 'from=(empty)',
        to ? `to=${to}` : 'to=(empty)',
        input.logContext?.orderId != null ? `orderId=${input.logContext.orderId}` : null,
        input.logContext?.orderNumber != null ? `orderNumber=${input.logContext.orderNumber}` : null,
        input.logContext?.accountId != null ? `accountId=${input.logContext.accountId}` : null,
        input.logContext?.userId != null ? `userId=${input.logContext.userId}` : null,
    ]
        .filter((line) => line != null)
        .join('\n');

    await insertLog({
        outcome: 'failure',
        stage,
        message,
        orderId: input.logContext?.orderId,
        orderNumber: input.logContext?.orderNumber,
        accountId: input.logContext?.accountId,
        userId: input.logContext?.userId,
        error,
    });
}

export async function sendEmailViaResend(input: SendEmailInput): Promise<SendEmailResult> {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey) {
        const error = 'RESEND_API_KEY is not configured.';
        await logEmailFailure(error, input);
        return { ok: false, error };
    }

    const from = input.from.trim();
    if (!from) {
        const error = 'A from email address is required.';
        await logEmailFailure(error, input);
        return { ok: false, error };
    }

    const to = normalizeRecipients(input.to);
    if (to.length === 0) {
        const error = 'At least one recipient email address is required.';
        await logEmailFailure(error, input);
        return { ok: false, error };
    }

    const subject = input.subject.trim();
    if (!subject) {
        const error = 'Email subject is required.';
        await logEmailFailure(error, input);
        return { ok: false, error };
    }

    const resend = new Resend(apiKey);

    try {
        const replyTo = input.replyTo ? normalizeRecipients(input.replyTo) : [];
        const result = await resend.emails.send({
            from,
            to,
            subject,
            html: input.html,
            text: input.text,
            ...(replyTo.length > 0 ? { replyTo } : {}),
            ...(input.attachments && input.attachments.length > 0 ? { attachments: input.attachments } : {}),
        });

        if (result.error) {
            const shortMessage = result.error.message || 'Resend rejected the email.';
            const detail = [
                shortMessage,
                `Resend error name: ${result.error.name || '(none)'}`,
                `Resend error payload:\n${stringifyErrorDetail(result.error)}`,
            ].join('\n');
            await logEmailFailure(detail, input);
            return { ok: false, error: shortMessage };
        }

        const id = result.data?.id?.trim();
        if (!id) {
            const error = 'Resend did not return an email id.';
            const detail = [
                error,
                `Resend response data:\n${stringifyErrorDetail(result.data ?? null)}`,
            ].join('\n');
            await logEmailFailure(detail, input);
            return { ok: false, error };
        }

        return { ok: true, id };
    } catch (error) {
        console.error('[sendEmailViaResend] failed', error);
        const shortMessage = error instanceof Error ? error.message : 'Unable to send email through Resend.';
        await logEmailFailure(formatUnknownError(error), input);
        return {
            ok: false,
            error: shortMessage,
        };
    }
}
