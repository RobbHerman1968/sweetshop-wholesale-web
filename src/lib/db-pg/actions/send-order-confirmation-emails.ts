import { buildOrderCopyEmailContent, buildOrderCustomerEmailContent } from '@/lib/email/order-email-template';
import { sendEmailViaResend } from '@/lib/resend-email';
import { getOrderByIdForManage } from '@/lib/db-pg/actions/order';
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
            return;
        }

        if (!fromEmail) {
            console.error('[sendOrderConfirmationEmails] Send Email From is not configured');
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
            });

            if (!result.ok) {
                console.error('[sendOrderConfirmationEmails] customer email failed', result.error);
            }
        } else {
            console.error('[sendOrderConfirmationEmails] account customer email is missing');
        }

        if (!copyEmail) {
            console.error('[sendOrderConfirmationEmails] Copy Order Email Address is not configured');
            return;
        }

        const copyContent = buildOrderCopyEmailContent(detail, customerEmail, input.isNewCustomerOrder);
        const copyResult = await sendEmailViaResend({
            from: fromEmail,
            to: copyEmail,
            subject: copyContent.subject,
            html: copyContent.html,
            text: copyContent.text,
        });

        if (!copyResult.ok) {
            console.error('[sendOrderConfirmationEmails] copy email failed', copyResult.error);
        }
    } catch (error) {
        console.error('[sendOrderConfirmationEmails] unexpected failure', error);
    }
}
