import moment from 'moment-timezone';
import type { ManageOrderDetail } from '@/lib/db-pg/actions/order';
import { escapeHtml, escapeHtmlOrDash } from '@/lib/email/html-utils';

export type OrderEmailAddress = {
    type: string;
    firstName: string | null;
    lastName: string;
    companyName: string | null;
    address1: string;
    address2: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phoneNumber: string | null;
    emailAddress: string | null;
};

export type OrderEmailLineItem = {
    itemNumber: string;
    name: string;
    quantity: number;
    unitPrice: string | number;
    lineTotal: string | number;
    variableData: string | null;
};

export type OrderEmailPayment = {
    cardType: string | null;
    lastFour: string | null;
    expiration: string | null;
};

export type OrderEmailFulfillment = {
    expectedDeliveryDate: string | null;
    shippingCode: string | null;
    accountMateOrderNumber: number | null;
};

export type OrderEmailCustomer = {
    name: string;
    email: string | null;
    userId: number;
};

export type OrderEmailTotals = {
    subTotal: string | number;
    shipping: string | number;
    tax: string | number;
    promotionCode: string | null;
    promotionDiscount: string | number | null;
    total: string | number;
};

export type OrderEmailData = {
    orderNumber: string;
    orderDate: string | null;
    isNewCustomerOrder: boolean;
    comment: string | null;
    customer: OrderEmailCustomer;
    totals: OrderEmailTotals;
    payment: OrderEmailPayment;
    fulfillment: OrderEmailFulfillment;
    addresses: OrderEmailAddress[];
    items: OrderEmailLineItem[];
};

export type BuildOrderEmailOptions = {
    subject?: string;
    preheader?: string;
    headline?: string;
    introHtml?: string;
    introText?: string;
    showPayment?: boolean;
    showFulfillment?: boolean;
    showOrderType?: boolean;
};

export type MapOrderEmailDataOptions = {
    customerEmail?: string | null;
};

export type OrderEmailContent = {
    subject: string;
    html: string;
    text: string;
};

const BRAND = {
    brown: '#6e4a34',
    brownDark: '#4a2518',
    tan: '#c49a78',
    cream: '#f8eddf',
    creamLight: '#fdf7ef',
    page: '#f2dfcc',
    muted: '#8a7264',
};

function formatMoney(value: string | number | null | undefined): string {
    return `$${Number(value ?? 0).toFixed(2)}`;
}

function formatOrderDate(orderDate: string | null): string {
    if (!orderDate) return '—';
    return moment.utc(orderDate).local().format('MM/DD/YYYY hh:mm A');
}

function formatExpectedDeliveryDate(value: string | null): string {
    if (!value) return '—';
    return moment.utc(value).local().format('MM/DD/YYYY');
}

function formatAddressLabel(type: string): string {
    const normalized = type.trim().toLowerCase();
    if (normalized === 's' || normalized.includes('ship')) return 'Shipping';
    if (normalized === 'b' || normalized.includes('bill')) return 'Billing';
    return type.trim() || 'Address';
}

function addressSortOrder(type: string): number {
    const normalized = type.trim().toLowerCase();
    if (normalized === 's' || normalized.includes('ship')) return 0;
    if (normalized === 'b' || normalized.includes('bill')) return 1;
    return 2;
}

function formatAddressName(address: OrderEmailAddress): string {
    return [address.firstName, address.lastName].filter(Boolean).join(' ').trim() || address.lastName;
}

function renderMetaRow(label: string, value: string): string {
    return `<tr>
        <td style="padding:6px 0;color:${BRAND.muted};font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;width:160px;vertical-align:top;">${escapeHtml(label)}</td>
        <td style="padding:6px 0;color:${BRAND.brownDark};font-size:14px;vertical-align:top;">${value}</td>
    </tr>`;
}

function renderAddressCard(address: OrderEmailAddress): string {
    const lines = [
        `<div style="font-size:15px;font-weight:700;color:${BRAND.brownDark};margin-bottom:8px;">${escapeHtml(formatAddressName(address))}</div>`,
        address.companyName ? `<div style="font-size:14px;color:${BRAND.brownDark};margin-bottom:4px;">${escapeHtml(address.companyName)}</div>` : '',
        `<div style="font-size:14px;color:${BRAND.brownDark};line-height:1.6;">
            ${escapeHtml(address.address1)}<br />
            ${address.address2 ? `${escapeHtml(address.address2)}<br />` : ''}
            ${escapeHtml(`${address.city}, ${address.state} ${address.postalCode}`)}<br />
            ${escapeHtml(address.country)}
        </div>`,
        address.phoneNumber || address.emailAddress
            ? `<div style="margin-top:10px;font-size:13px;color:${BRAND.muted};line-height:1.6;">
                ${address.phoneNumber ? `${escapeHtml(address.phoneNumber)}<br />` : ''}
                ${address.emailAddress ? escapeHtml(address.emailAddress) : ''}
            </div>`
            : '',
    ].join('');

    return `<td style="width:50%;padding:0 8px 16px 0;vertical-align:top;">
        <div style="background:${BRAND.creamLight};border:1px solid ${BRAND.tan};border-radius:12px;padding:16px;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${BRAND.brown};margin-bottom:12px;">${escapeHtml(formatAddressLabel(address.type))}</div>
            ${lines}
        </div>
    </td>`;
}

function renderSectionTitle(title: string): string {
    return `<div style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${BRAND.brown};margin:0 0 12px;">${escapeHtml(title)}</div>`;
}

function renderLineItemsTable(items: OrderEmailLineItem[]): string {
    const rows = items
        .map((item, index) => {
            const background = index % 2 === 0 ? BRAND.creamLight : BRAND.cream;
            return `<tr style="background:${background};">
                <td style="padding:12px 10px;border-bottom:1px solid ${BRAND.tan};font-size:13px;color:${BRAND.brownDark};">${escapeHtml(item.itemNumber)}</td>
                <td style="padding:12px 10px;border-bottom:1px solid ${BRAND.tan};font-size:13px;color:${BRAND.brownDark};">
                    <div style="font-weight:600;">${escapeHtml(item.name)}</div>
                    ${item.variableData?.trim() ? `<div style="margin-top:4px;font-size:12px;color:${BRAND.muted};">${escapeHtml(item.variableData.trim())}</div>` : ''}
                </td>
                <td style="padding:12px 10px;border-bottom:1px solid ${BRAND.tan};font-size:13px;color:${BRAND.brownDark};text-align:center;">${item.quantity}</td>
                <td style="padding:12px 10px;border-bottom:1px solid ${BRAND.tan};font-size:13px;color:${BRAND.brownDark};text-align:right;white-space:nowrap;">${escapeHtml(formatMoney(item.unitPrice))}</td>
                <td style="padding:12px 10px;border-bottom:1px solid ${BRAND.tan};font-size:13px;color:${BRAND.brownDark};text-align:right;white-space:nowrap;font-weight:700;">${escapeHtml(formatMoney(item.lineTotal))}</td>
            </tr>`;
        })
        .join('');

    return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;border:1px solid ${BRAND.tan};border-radius:12px;overflow:hidden;">
        <thead>
            <tr style="background:${BRAND.brown};">
                <th align="left" style="padding:12px 10px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#ffffff;">Item #</th>
                <th align="left" style="padding:12px 10px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#ffffff;">Product</th>
                <th align="center" style="padding:12px 10px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#ffffff;">Qty</th>
                <th align="right" style="padding:12px 10px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#ffffff;">Price</th>
                <th align="right" style="padding:12px 10px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#ffffff;">Total</th>
            </tr>
        </thead>
        <tbody>
            ${rows || `<tr><td colspan="5" style="padding:16px;text-align:center;color:${BRAND.muted};font-size:14px;">No line items</td></tr>`}
        </tbody>
    </table>`;
}

function renderTotalsBox(data: OrderEmailData): string {
    const rows = [
        ['Subtotal', formatMoney(data.totals.subTotal)],
        ['Shipping', formatMoney(data.totals.shipping)],
        ['Tax', formatMoney(data.totals.tax)],
    ];

    if (data.totals.promotionDiscount != null && Number(data.totals.promotionDiscount) !== 0) {
        const label = data.totals.promotionCode ? `Promotion (${data.totals.promotionCode})` : 'Promotion';
        rows.push([label, `-${formatMoney(data.totals.promotionDiscount)}`]);
    }

    const body = rows
        .map(
            ([label, value]) => `<tr>
                <td style="padding:6px 0;font-size:14px;color:${BRAND.brownDark};">${escapeHtml(label)}</td>
                <td style="padding:6px 0;font-size:14px;color:${BRAND.brownDark};text-align:right;white-space:nowrap;">${escapeHtml(value)}</td>
            </tr>`,
        )
        .join('');

    return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;background:${BRAND.creamLight};border:1px solid ${BRAND.tan};border-radius:12px;">
        <tr>
            <td style="padding:16px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                    ${body}
                    <tr>
                        <td style="padding:12px 0 0;border-top:1px solid ${BRAND.tan};font-size:16px;font-weight:700;color:${BRAND.brownDark};">Total</td>
                        <td style="padding:12px 0 0;border-top:1px solid ${BRAND.tan};font-size:16px;font-weight:700;color:${BRAND.brownDark};text-align:right;white-space:nowrap;">${escapeHtml(formatMoney(data.totals.total))}</td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>`;
}

function renderPaymentSummary(payment: OrderEmailPayment): string {
    return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
        ${renderMetaRow('Card type', escapeHtmlOrDash(payment.cardType))}
    </table>`;
}

function renderFulfillmentSummary(fulfillment: OrderEmailFulfillment): string {
    return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
        ${renderMetaRow('Expected delivery', escapeHtml(formatExpectedDeliveryDate(fulfillment.expectedDeliveryDate)))}
        ${renderMetaRow('Ship code', escapeHtmlOrDash(fulfillment.shippingCode))}
    </table>`;
}

function renderPlainAddress(address: OrderEmailAddress): string[] {
    return [
        `${formatAddressLabel(address.type)}:`,
        formatAddressName(address),
        address.companyName ?? null,
        address.address1,
        address.address2 ?? null,
        `${address.city}, ${address.state} ${address.postalCode}`,
        address.country,
        address.phoneNumber ?? null,
        address.emailAddress ?? null,
        '',
    ].filter((line): line is string => Boolean(line));
}

export function mapManageOrderDetailToOrderEmailData(
    detail: ManageOrderDetail,
    options: MapOrderEmailDataOptions = {},
): OrderEmailData {
    const { order, items, addresses, user } = detail;
    const customerName =
        [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || user?.userName?.trim() || `User #${order.userId}`;
    const customerEmail = options.customerEmail?.trim() || user?.userName?.trim() || null;

    return {
        orderNumber: String(order.orderNumber ?? order.id),
        orderDate: order.orderDate,
        isNewCustomerOrder: Boolean(order.isNewCustomerOrder),
        comment: order.comment?.trim() || null,
        customer: {
            name: customerName,
            email: customerEmail,
            userId: order.userId,
        },
        totals: {
            subTotal: order.subTotal,
            shipping: order.shipping,
            tax: order.tax,
            promotionCode: order.promotionCode?.trim() || null,
            promotionDiscount: order.promotionDiscount,
            total: order.total,
        },
        payment: {
            cardType: order.ccType,
            lastFour: order.ccLastFour,
            expiration: order.ccExp,
        },
        fulfillment: {
            expectedDeliveryDate: order.expectedDeliveryDate,
            shippingCode: order.shippingCode,
            accountMateOrderNumber: order.accountMateOrderNumber,
        },
        addresses: addresses.map((address) => ({
            type: address.type,
            firstName: address.firstName,
            lastName: address.lastName,
            companyName: address.companyName,
            address1: address.address1,
            address2: address.address2,
            city: address.city,
            state: address.state,
            postalCode: address.postalCode,
            country: address.country,
            phoneNumber: address.phoneNumber,
            emailAddress: address.emailAddress,
        })),
        items: items.map((item) => ({
            itemNumber: item.itemNumber,
            name: item.name,
            quantity: item.quantity,
            unitPrice: Number(item.promotionPrice) > 0 ? item.promotionPrice : item.price,
            lineTotal: item.lineTotal,
            variableData: item.variableData,
        })),
    };
}

export function buildOrderEmail(data: OrderEmailData, options: BuildOrderEmailOptions = {}): OrderEmailContent {
    const subject = options.subject ?? `Sweet Shop USA Order #${data.orderNumber}`;
    const headline = options.headline ?? `Order #${data.orderNumber}`;
    const preheader = options.preheader ?? `Order #${data.orderNumber} for ${data.customer.name}`;
    const showPayment = options.showPayment ?? true;
    const showFulfillment = options.showFulfillment ?? true;
    const showOrderType = options.showOrderType ?? true;
    const sortedAddresses = [...data.addresses].sort((a, b) => addressSortOrder(a.type) - addressSortOrder(b.type));
    const addressCells = sortedAddresses.map(renderAddressCard).join('');
    const addressSection = sortedAddresses.length
        ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;"><tr>${addressCells}</tr></table>`
        : '';

    const introBlock = options.introHtml
        ? `<div style="margin:0 0 24px;padding:14px 16px;background:${BRAND.creamLight};border:1px solid ${BRAND.tan};border-radius:12px;font-size:14px;line-height:1.6;color:${BRAND.brownDark};">${options.introHtml}</div>`
        : '';

    const commentBlock = data.comment
        ? `<div style="margin-top:24px;padding:16px;background:${BRAND.creamLight};border:1px solid ${BRAND.tan};border-radius:12px;">
            ${renderSectionTitle('Order comment')}
            <div style="font-size:14px;line-height:1.7;color:${BRAND.brownDark};white-space:pre-wrap;">${escapeHtml(data.comment)}</div>
        </div>`
        : '';

    const paymentFulfillmentSection =
        showPayment && showFulfillment
            ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                                <tr>
                                    <td style="width:50%;padding-right:8px;vertical-align:top;">
                                        <div style="background:${BRAND.creamLight};border:1px solid ${BRAND.tan};border-radius:12px;padding:16px;">
                                            ${renderSectionTitle('Payment')}
                                            ${renderPaymentSummary(data.payment)}
                                        </div>
                                    </td>
                                    <td style="width:50%;padding-left:8px;vertical-align:top;">
                                        <div style="background:${BRAND.creamLight};border:1px solid ${BRAND.tan};border-radius:12px;padding:16px;">
                                            ${renderSectionTitle('Fulfillment')}
                                            ${renderFulfillmentSummary(data.fulfillment)}
                                        </div>
                                    </td>
                                </tr>
                            </table>`
            : showPayment
              ? `<div style="background:${BRAND.creamLight};border:1px solid ${BRAND.tan};border-radius:12px;padding:16px;">
                    ${renderSectionTitle('Payment')}
                    ${renderPaymentSummary(data.payment)}
                </div>`
              : showFulfillment
                ? `<div style="background:${BRAND.creamLight};border:1px solid ${BRAND.tan};border-radius:12px;padding:16px;">
                    ${renderSectionTitle('Fulfillment')}
                    ${renderFulfillmentSummary(data.fulfillment)}
                </div>`
                : '';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.page};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;background:${BRAND.page};">
        <tr>
            <td align="center" style="padding:24px 12px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:680px;border-collapse:collapse;">
                    <tr>
                        <td style="padding:24px 28px;background:${BRAND.brown};border-radius:16px 16px 0 0;">
                            <div style="font-size:11px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;color:#f8eddf;">Sweet Shop USA Wholesale</div>
                            <div style="margin-top:10px;font-size:28px;line-height:1.2;font-weight:700;color:#ffffff;">${escapeHtml(headline)}</div>
                            <div style="margin-top:8px;font-size:14px;color:#f8eddf;">Placed ${escapeHtml(formatOrderDate(data.orderDate))}</div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:28px;background:${BRAND.cream};border:1px solid ${BRAND.tan};border-top:none;border-radius:0 0 16px 16px;">
                            ${introBlock}
                            ${
                                showOrderType && data.isNewCustomerOrder
                                    ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin-bottom:24px;">
                                ${renderMetaRow('Order type', 'New customer order')}
                            </table>`
                                    : ''
                            }

                            ${addressSection ? `<div style="margin-bottom:24px;">${renderSectionTitle('Addresses')}${addressSection}</div>` : ''}

                            <div style="margin-bottom:24px;">
                                ${renderSectionTitle('Line items')}
                                ${renderLineItemsTable(data.items)}
                            </div>

                            <div style="margin-bottom:24px;">
                                ${renderSectionTitle('Order total')}
                                ${renderTotalsBox(data)}
                            </div>

                            ${paymentFulfillmentSection ? `<div style="margin-bottom:0;">${paymentFulfillmentSection}</div>` : ''}

                            ${commentBlock}
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

    const textSections = [
        options.introText ?? null,
        `Sweet Shop USA Order #${data.orderNumber}`,
        `Placed: ${formatOrderDate(data.orderDate)}`,
        '',
        showOrderType && data.isNewCustomerOrder ? 'Order type: New customer order' : null,
        showOrderType && data.isNewCustomerOrder ? '' : null,
        ...sortedAddresses.flatMap(renderPlainAddress),
        'Line items:',
        ...data.items.map(
            (item) =>
                `- ${item.itemNumber} | ${item.name} | qty ${item.quantity} | ${formatMoney(item.unitPrice)} | ${formatMoney(item.lineTotal)}`,
        ),
        '',
        `Subtotal: ${formatMoney(data.totals.subTotal)}`,
        `Shipping: ${formatMoney(data.totals.shipping)}`,
        `Tax: ${formatMoney(data.totals.tax)}`,
        data.totals.promotionDiscount != null && Number(data.totals.promotionDiscount) !== 0
            ? `Promotion: -${formatMoney(data.totals.promotionDiscount)}`
            : null,
        `Total: ${formatMoney(data.totals.total)}`,
        showPayment
            ? [
                  '',
                  'Payment:',
                  `Card type: ${data.payment.cardType?.trim() || '—'}`,
              ].join('\n')
            : null,
        showFulfillment
            ? [
                  '',
                  'Fulfillment:',
                  `Expected delivery: ${formatExpectedDeliveryDate(data.fulfillment.expectedDeliveryDate)}`,
                  `Ship code: ${data.fulfillment.shippingCode?.trim() || '—'}`,
              ].join('\n')
            : null,
        data.comment ? `\nComment:\n${data.comment}` : null,
    ].filter(Boolean);

    return {
        subject,
        html,
        text: textSections.join('\n'),
    };
}

export function buildOrderEmailFromManageDetail(
    detail: ManageOrderDetail,
    options: BuildOrderEmailOptions = {},
    mapOptions: MapOrderEmailDataOptions = {},
): OrderEmailContent {
    return buildOrderEmail(mapManageOrderDetailToOrderEmailData(detail, mapOptions), options);
}

export function buildOrderCustomerEmailContent(detail: ManageOrderDetail, customerEmail: string): OrderEmailContent {
    const orderNumber = String(detail.order.orderNumber ?? detail.order.id);

    return buildOrderEmailFromManageDetail(
        detail,
        {
            subject: `Sweetshop USA Order Confirmation ${orderNumber}`,
            headline: `Order Confirmation #${orderNumber}`,
            preheader: `Your Sweet Shop USA order #${orderNumber} confirmation.`,
            showPayment: false,
            showFulfillment: true,
            showOrderType: false,
        },
        { customerEmail },
    );
}

export function buildOrderCopyEmailContent(
    detail: ManageOrderDetail,
    customerEmail: string,
    isNewCustomerOrder: boolean,
): OrderEmailContent {
    const orderNumber = String(detail.order.orderNumber ?? detail.order.id);
    const subject = isNewCustomerOrder
        ? `Sweetshop USA Order Confirmation - New Account Mate Customer ${orderNumber}`
        : `Sweetshop USA Order Confirmation ${orderNumber}`;

    return buildOrderEmailFromManageDetail(
        detail,
        {
            subject,
            headline: `Order #${orderNumber}`,
            preheader: isNewCustomerOrder
                ? `New AccountMate customer order #${orderNumber}.`
                : `Internal copy of order #${orderNumber}.`,
            introHtml: isNewCustomerOrder ? 'This order was placed by a new AccountMate customer.' : undefined,
            introText: isNewCustomerOrder ? 'This order was placed by a new AccountMate customer.' : undefined,
            showPayment: true,
            showFulfillment: true,
            showOrderType: true,
        },
        { customerEmail },
    );
}

export function buildOrderDeveloperEmailContent(detail: ManageOrderDetail): OrderEmailContent {
    return buildOrderEmailFromManageDetail(detail, {
        subject: `Sweet Shop USA Order #${detail.order.orderNumber ?? detail.order.id}`,
        headline: `Order #${detail.order.orderNumber ?? detail.order.id}`,
        preheader: 'Order details sent for developer review.',
    });
}
