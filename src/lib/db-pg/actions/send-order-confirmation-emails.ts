import { buildOrderCopyEmailContent, buildOrderCustomerEmailContent } from '@/lib/email/order-email-template';
import { sendEmailViaResend } from '@/lib/resend-email';
import { getOrderByIdForManage } from '@/lib/db-pg/actions/order';
import { insertOrderLog } from '@/lib/db-pg/actions/order-log';
import { getCopyOrderEmailAddress, getSendEmailFromAddress } from '@/lib/db-pg/actions/site-setting';

export type SendOrderConfirmationEmailsInput = {
    orderId: number;
    customerEmail: string;
    isNewCustomerOrder: boolean;
};

/** Sends customer and internal order confirmation emails. Never throws. */
export async function sendOrderConfirmationEmails(input: SendOrderConfirmationEmailsInput): Promise<void> {
    try {
        const customerEmail = input.customerEmail.trim();
        const [fromEmail, copyEmail, detail] = await Promise.all([
            getSendEmailFromAddress(),
            getCopyOrderEmailAddress(),
            getOrderByIdForManage(input.orderId),
        ]);

        if (!detail) {
            console.error('[sendOrderConfirmationEmails] order not found', input.orderId);
            await insertOrderLog({
                outcome: 'failure',
                stage: 'email',
                message: `Order confirmation emails skipped — order ${input.orderId} not found.`,
                orderId: input.orderId,
                error: 'Order not found.',
            });
            return;
        }

        const orderNumber = detail.order.orderNumber ?? undefined;
        const accountId = detail.account?.id ?? undefined;
        const userId = detail.order.userId ?? undefined;
        const orderLabel = orderNumber ?? detail.order.id;

        if (!fromEmail) {
            console.error('[sendOrderConfirmationEmails] Send Email From is not configured');
            await insertOrderLog({
                outcome: 'failure',
                stage: 'email',
                message: `Order confirmation emails skipped — Send Email From is not configured (order #${orderLabel}).`,
                orderId: detail.order.id,
                orderNumber,
                accountId,
                userId,
                error: 'Send Email From is not configured.',
            });
            return;
        }

        if (customerEmail) {
            const content = buildOrderCustomerEmailContent(detail, customerEmail);
            const result = await sendEmailViaResend({
                from: fromEmail,
                to: customerEmail,
                subject: content.subject,
                html: content.html,
                text: content.text,
                logContext: {
                    stage: 'email',
                    message: `Customer order confirmation email failed for order #${orderLabel}.`,
                    successMessage: `Customer order confirmation email sent for order #${orderLabel}.`,
                    orderId: detail.order.id,
                    orderNumber,
                    accountId,
                    userId,
                },
            });

            if (!result.ok) {
                console.error('[sendOrderConfirmationEmails] customer email failed', result.error);
            }
        } else {
            console.error('[sendOrderConfirmationEmails] account customer email is missing');
            await insertOrderLog({
                outcome: 'failure',
                stage: 'email',
                message: `Customer order confirmation email skipped — no customer email for order #${orderLabel}.`,
                orderId: detail.order.id,
                orderNumber,
                accountId,
                userId,
                error: 'Account customer email is missing.',
            });
        }

        if (!copyEmail) {
            console.error('[sendOrderConfirmationEmails] Copy Order Email Address is not configured');
            await insertOrderLog({
                outcome: 'failure',
                stage: 'email',
                message: `Internal order copy email skipped — Copy Order Email Address is not configured (order #${orderLabel}).`,
                orderId: detail.order.id,
                orderNumber,
                accountId,
                userId,
                error: 'Copy Order Email Address is not configured.',
            });
            return;
        }

        const copyContent = buildOrderCopyEmailContent(detail, customerEmail, input.isNewCustomerOrder);
        const copyResult = await sendEmailViaResend({
            from: fromEmail,
            to: copyEmail,
            subject: copyContent.subject,
            html: copyContent.html,
            text: copyContent.text,
            logContext: {
                stage: 'email',
                message: `Internal order copy email failed for order #${orderLabel}.`,
                successMessage: `Internal order copy email sent for order #${orderLabel}.`,
                orderId: detail.order.id,
                orderNumber,
                accountId,
                userId,
            },
        });

        if (!copyResult.ok) {
            console.error('[sendOrderConfirmationEmails] copy email failed', copyResult.error);
        }
    } catch (error) {
        console.error('[sendOrderConfirmationEmails] unexpected failure', error);
        await insertOrderLog({
            outcome: 'failure',
            stage: 'email',
            message: `Order confirmation emails failed unexpectedly for order ${input.orderId}.`,
            orderId: input.orderId,
            error: error instanceof Error ? error.message : 'Unexpected email failure.',
        });
    }
}
