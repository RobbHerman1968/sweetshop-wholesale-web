'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { getOrderByIdForManage, type ManageOrderDetail } from '@/lib/db-pg/actions/order';
import {
    getDeveloperEmailAddress,
    getSalesOrderEmailAddress,
    getSendEmailFromAddress,
} from '@/lib/db-pg/actions/site-setting';
import {
    buildOrderCopyEmailContent,
    buildOrderCustomerEmailContent,
    buildOrderDeveloperEmailContent,
} from '@/lib/email/order-email-template';
import { sendEmailViaResend } from '@/lib/resend-email';

export type SendOrderEmailResult = { ok: true } | { ok: false; error: string };

function resolveCustomerEmail(detail: ManageOrderDetail): string | null {
    const billing = detail.addresses.find((address) => {
        const type = address.type.trim().toLowerCase();
        return type === 'b' || type.includes('bill');
    });
    const shipping = detail.addresses.find((address) => {
        const type = address.type.trim().toLowerCase();
        return type === 's' || type.includes('ship');
    });

    const candidates = [
        billing?.emailAddress,
        shipping?.emailAddress,
        detail.user?.userName,
    ];

    for (const candidate of candidates) {
        const trimmed = candidate?.trim();
        if (trimmed) {
            return trimmed;
        }
    }

    return null;
}

async function requireAdminOrder(orderId: number): Promise<
    { ok: true; detail: ManageOrderDetail; fromEmail: string } | { ok: false; error: string }
> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
        return { ok: false, error: 'Unauthorized.' };
    }

    if (!Number.isFinite(orderId) || orderId <= 0) {
        return { ok: false, error: 'Invalid order.' };
    }

    const [detail, fromEmail] = await Promise.all([getOrderByIdForManage(orderId), getSendEmailFromAddress()]);

    if (!detail) {
        return { ok: false, error: 'Order not found.' };
    }

    if (!fromEmail) {
        return { ok: false, error: 'Configure Send Email From in Site Settings before sending.' };
    }

    return { ok: true, detail, fromEmail };
}

export async function sendOrderToCustomer(orderId: number): Promise<SendOrderEmailResult> {
    const gate = await requireAdminOrder(orderId);
    if (!gate.ok) {
        return gate;
    }

    const customerEmail = resolveCustomerEmail(gate.detail);
    if (!customerEmail) {
        return { ok: false, error: 'This order has no customer email address.' };
    }

    const { subject, html, text } = buildOrderCustomerEmailContent(gate.detail, customerEmail);
    const result = await sendEmailViaResend({
        from: gate.fromEmail,
        to: customerEmail,
        subject,
        html,
        text,
        logContext: {
            stage: 'email',
            message: `Manual customer order email failed for order #${gate.detail.order.orderNumber ?? orderId}.`,
            successMessage: `Manual customer order email sent for order #${gate.detail.order.orderNumber ?? orderId}.`,
            orderId: gate.detail.order.id,
            orderNumber: gate.detail.order.orderNumber ?? undefined,
            accountId: gate.detail.account?.id ?? undefined,
            userId: gate.detail.order.userId,
        },
    });

    if (!result.ok) {
        return result;
    }

    return { ok: true };
}

export async function sendOrderToSales(orderId: number): Promise<SendOrderEmailResult> {
    const gate = await requireAdminOrder(orderId);
    if (!gate.ok) {
        return gate;
    }

    const salesEmail = await getSalesOrderEmailAddress();
    if (!salesEmail) {
        return { ok: false, error: 'Configure Sales Order Email Address in Site Settings before sending.' };
    }

    const customerEmail = resolveCustomerEmail(gate.detail) ?? '';
    const { subject, html, text } = buildOrderCopyEmailContent(
        gate.detail,
        customerEmail,
        gate.detail.order.isNewCustomerOrder === 1,
    );
    const result = await sendEmailViaResend({
        from: gate.fromEmail,
        to: salesEmail,
        subject,
        html,
        text,
        logContext: {
            stage: 'email',
            message: `Manual sales order email failed for order #${gate.detail.order.orderNumber ?? orderId}.`,
            successMessage: `Manual sales order email sent for order #${gate.detail.order.orderNumber ?? orderId}.`,
            orderId: gate.detail.order.id,
            orderNumber: gate.detail.order.orderNumber ?? undefined,
            accountId: gate.detail.account?.id ?? undefined,
            userId: gate.detail.order.userId,
        },
    });

    if (!result.ok) {
        return result;
    }

    return { ok: true };
}

export async function sendOrderToDeveloper(orderId: number): Promise<SendOrderEmailResult> {
    const gate = await requireAdminOrder(orderId);
    if (!gate.ok) {
        return gate;
    }

    const developerEmail = await getDeveloperEmailAddress();
    if (!developerEmail) {
        return { ok: false, error: 'Configure Developer Email Address in Site Settings before sending.' };
    }

    const { subject, html, text } = buildOrderDeveloperEmailContent(gate.detail);
    const result = await sendEmailViaResend({
        from: gate.fromEmail,
        to: developerEmail,
        subject,
        html,
        text,
        logContext: {
            stage: 'email',
            message: `Manual developer order email failed for order #${gate.detail.order.orderNumber ?? orderId}.`,
            successMessage: `Manual developer order email sent for order #${gate.detail.order.orderNumber ?? orderId}.`,
            orderId: gate.detail.order.id,
            orderNumber: gate.detail.order.orderNumber ?? undefined,
            accountId: gate.detail.account?.id ?? undefined,
            userId: gate.detail.order.userId,
        },
    });

    if (!result.ok) {
        return result;
    }

    return { ok: true };
}
