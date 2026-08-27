'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { getOrderByIdForManage } from '@/lib/db-pg/actions/order';
import { getDeveloperEmailAddress, getSendEmailFromAddress } from '@/lib/db-pg/actions/site-setting';
import { buildOrderDeveloperEmailContent } from '@/lib/email/order-email-template';
import { sendEmailViaResend } from '@/lib/resend-email';

export type SendOrderToDeveloperResult = { ok: true } | { ok: false; error: string };

export async function sendOrderToDeveloper(orderId: number): Promise<SendOrderToDeveloperResult> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
        return { ok: false, error: 'Unauthorized.' };
    }

    if (!Number.isFinite(orderId) || orderId <= 0) {
        return { ok: false, error: 'Invalid order.' };
    }

    const [detail, developerEmail, fromEmail] = await Promise.all([
        getOrderByIdForManage(orderId),
        getDeveloperEmailAddress(),
        getSendEmailFromAddress(),
    ]);

    if (!detail) {
        return { ok: false, error: 'Order not found.' };
    }

    if (!developerEmail) {
        return { ok: false, error: 'Configure Developer Email Address in Site Settings before sending.' };
    }

    if (!fromEmail) {
        return { ok: false, error: 'Configure Send Email From in Site Settings before sending.' };
    }

    const { subject, html, text } = buildOrderDeveloperEmailContent(detail);
    const result = await sendEmailViaResend({
        from: fromEmail,
        to: developerEmail,
        subject,
        html,
        text,
    });

    if (!result.ok) {
        return result;
    }

    return { ok: true };
}
