import { Resend } from 'resend';
import { insertLog } from '@/lib/db-pg/actions/log';

export type SendEmailLogContext = {
    stage?: string;
    /** Logged on failure. Defaults to `Email failed: {subject}`. */
    message?: string;
    /** Logged on success. Defaults to `Email sent: {subject}`. */
    successMessage?: string;
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
    /** Optional context written to Manage → Log on send success or failure. */
    logContext?: SendEmailLogContext;
};

export type SendEmailResult = { ok: true; id: string } | { ok: false; error: string };

const MAX_SEND_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 500;

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

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

type ResendErrorLike = {
    name?: string | null;
    message?: string | null;
    statusCode?: number | null;
};

function isTransientResendError(error: ResendErrorLike): boolean {
    const name = error.name?.trim().toLowerCase() ?? '';
    const message = error.message?.trim().toLowerCase() ?? '';
    const statusCode = error.statusCode;

    if (name === 'application_error') {
        return true;
    }

    if (statusCode === 429 || (typeof statusCode === 'number' && statusCode >= 500)) {
        return true;
    }

    // statusCode null + fetch/network wording = request never reached Resend
    if (statusCode == null) {
        return (
            message.includes('could not be resolved') ||
            message.includes('unable to fetch') ||
            message.includes('fetch failed') ||
            message.includes('network') ||
            message.includes('econnreset') ||
            message.includes('etimedout') ||
            message.includes('enotfound') ||
            message.includes('socket')
        );
    }

    return false;
}

function isTransientThrownError(error: unknown): boolean {
    if (!(error instanceof Error)) {
        return false;
    }

    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    if (name === 'aborterror' || name === 'timeouterror') {
        return true;
    }

    return (
        message.includes('could not be resolved') ||
        message.includes('unable to fetch') ||
        message.includes('fetch failed') ||
        message.includes('network') ||
        message.includes('econnreset') ||
        message.includes('etimedout') ||
        message.includes('enotfound') ||
        message.includes('socket') ||
        message.includes('timeout')
    );
}

function emailLogMeta(input: Pick<SendEmailInput, 'to' | 'subject' | 'from' | 'logContext'>) {
    const to = normalizeRecipients(input.to).join(', ');
    const from = input.from.trim();
    const subject = input.subject.trim() || '(no subject)';
    const stage = input.logContext?.stage?.trim() || 'email';

    return {
        to,
        from,
        subject,
        stage,
        orderId: input.logContext?.orderId,
        orderNumber: input.logContext?.orderNumber,
        accountId: input.logContext?.accountId,
        userId: input.logContext?.userId,
    };
}

function formatEmailDetails(
    meta: ReturnType<typeof emailLogMeta>,
    extra: Array<string | null | undefined> = [],
): string {
    return [
        'Email details:',
        `subject=${meta.subject}`,
        meta.from ? `from=${meta.from}` : 'from=(empty)',
        meta.to ? `to=${meta.to}` : 'to=(empty)',
        meta.orderId != null ? `orderId=${meta.orderId}` : null,
        meta.orderNumber != null ? `orderNumber=${meta.orderNumber}` : null,
        meta.accountId != null ? `accountId=${meta.accountId}` : null,
        meta.userId != null ? `userId=${meta.userId}` : null,
        ...extra,
    ]
        .filter((line) => line != null)
        .join('\n');
}

async function logEmailFailure(
    errorDetail: string,
    input: Pick<SendEmailInput, 'to' | 'subject' | 'from' | 'logContext'>,
): Promise<void> {
    const meta = emailLogMeta(input);
    const baseMessage = input.logContext?.message?.trim() || `Email failed: ${meta.subject}`;
    const detail = errorDetail.trim() || 'Unknown email failure.';
    const shortDetail = detail.split('\n').map((line) => line.trim()).find(Boolean) || detail;
    const message = [
        baseMessage,
        meta.to ? `to=${meta.to}` : null,
        shortDetail,
    ]
        .filter((line) => line != null)
        .join('\n');
    const error = [detail, '', formatEmailDetails(meta)].join('\n');

    await insertLog({
        outcome: 'failure',
        stage: meta.stage,
        message,
        orderId: meta.orderId,
        orderNumber: meta.orderNumber,
        accountId: meta.accountId,
        userId: meta.userId,
        error,
    });
}

async function logEmailSuccess(
    resendId: string,
    input: Pick<SendEmailInput, 'to' | 'subject' | 'from' | 'logContext'>,
): Promise<void> {
    const meta = emailLogMeta(input);
    const baseMessage = input.logContext?.successMessage?.trim() || `Email sent: ${meta.subject}`;
    const message = [
        baseMessage,
        meta.to ? `to=${meta.to}` : null,
        `resendId=${resendId}`,
    ]
        .filter((line) => line != null)
        .join('\n');

    await insertLog({
        outcome: 'success',
        stage: meta.stage,
        message,
        orderId: meta.orderId,
        orderNumber: meta.orderNumber,
        accountId: meta.accountId,
        userId: meta.userId,
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
    const replyTo = input.replyTo ? normalizeRecipients(input.replyTo) : [];
    const sendPayload = {
        from,
        to,
        subject,
        html: input.html,
        text: input.text,
        ...(replyTo.length > 0 ? { replyTo } : {}),
        ...(input.attachments && input.attachments.length > 0 ? { attachments: input.attachments } : {}),
    };

    let lastShortMessage = 'Unable to send email through Resend.';
    let lastDetail = lastShortMessage;

    for (let attempt = 1; attempt <= MAX_SEND_ATTEMPTS; attempt++) {
        try {
            const result = await resend.emails.send(sendPayload);

            if (result.error) {
                const shortMessage = result.error.message || 'Resend rejected the email.';
                const detail = [
                    shortMessage,
                    `Resend error name: ${result.error.name || '(none)'}`,
                    `Resend error payload:\n${stringifyErrorDetail(result.error)}`,
                    attempt > 1 ? `attempts=${attempt}` : null,
                ]
                    .filter((line) => line != null)
                    .join('\n');

                lastShortMessage = shortMessage;
                lastDetail = detail;

                if (attempt < MAX_SEND_ATTEMPTS && isTransientResendError(result.error)) {
                    const delayMs = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
                    console.warn(
                        `[sendEmailViaResend] transient failure (attempt ${attempt}/${MAX_SEND_ATTEMPTS}), retrying in ${delayMs}ms`,
                        shortMessage,
                    );
                    await sleep(delayMs);
                    continue;
                }

                await logEmailFailure(detail, input);
                return { ok: false, error: shortMessage };
            }

            const id = result.data?.id?.trim();
            if (!id) {
                const error = 'Resend did not return an email id.';
                const detail = [
                    error,
                    `Resend response data:\n${stringifyErrorDetail(result.data ?? null)}`,
                    attempt > 1 ? `attempts=${attempt}` : null,
                ]
                    .filter((line) => line != null)
                    .join('\n');
                await logEmailFailure(detail, input);
                return { ok: false, error };
            }

            if (attempt > 1) {
                console.info(`[sendEmailViaResend] succeeded on attempt ${attempt}`);
            }

            await logEmailSuccess(id, input);
            return { ok: true, id };
        } catch (error) {
            const shortMessage = error instanceof Error ? error.message : 'Unable to send email through Resend.';
            lastShortMessage = shortMessage;
            lastDetail = formatUnknownError(error);

            if (attempt < MAX_SEND_ATTEMPTS && isTransientThrownError(error)) {
                const delayMs = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
                console.warn(
                    `[sendEmailViaResend] transient exception (attempt ${attempt}/${MAX_SEND_ATTEMPTS}), retrying in ${delayMs}ms`,
                    shortMessage,
                );
                await sleep(delayMs);
                continue;
            }

            console.error('[sendEmailViaResend] failed', error);
            await logEmailFailure(
                [
                    lastDetail,
                    attempt > 1 ? `attempts=${attempt}` : null,
                ]
                    .filter((line) => line != null)
                    .join('\n'),
                input,
            );
            return {
                ok: false,
                error: shortMessage,
            };
        }
    }

    await logEmailFailure(
        [lastDetail, `attempts=${MAX_SEND_ATTEMPTS}`].join('\n'),
        input,
    );
    return { ok: false, error: lastShortMessage };
}
