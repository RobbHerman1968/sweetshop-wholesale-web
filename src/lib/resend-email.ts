import { Resend } from 'resend';

export type SendEmailInput = {
    from: string;
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
    replyTo?: string | string[];
};

export type SendEmailResult = { ok: true; id: string } | { ok: false; error: string };

function normalizeRecipients(to: string | string[]): string[] {
    const values = Array.isArray(to) ? to : [to];
    return values.map((entry) => entry.trim()).filter(Boolean);
}

export async function sendEmailViaResend(input: SendEmailInput): Promise<SendEmailResult> {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey) {
        return { ok: false, error: 'RESEND_API_KEY is not configured.' };
    }

    const from = input.from.trim();
    if (!from) {
        return { ok: false, error: 'A from email address is required.' };
    }

    const to = normalizeRecipients(input.to);
    if (to.length === 0) {
        return { ok: false, error: 'At least one recipient email address is required.' };
    }

    const subject = input.subject.trim();
    if (!subject) {
        return { ok: false, error: 'Email subject is required.' };
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
        });

        if (result.error) {
            return { ok: false, error: result.error.message || 'Resend rejected the email.' };
        }

        const id = result.data?.id?.trim();
        if (!id) {
            return { ok: false, error: 'Resend did not return an email id.' };
        }

        return { ok: true, id };
    } catch (error) {
        console.error('[sendEmailViaResend] failed', error);
        return {
            ok: false,
            error: error instanceof Error ? error.message : 'Unable to send email through Resend.',
        };
    }
}
