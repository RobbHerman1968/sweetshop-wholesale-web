'use server';

import { getServerSession } from 'next-auth';
import { sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/auth';
import { getAccountByIdForManage } from '@/lib/db-pg/actions/account';
import { resolveExcelOrderSheetRows } from '@/lib/db-pg/actions/excel-order-sheet-validation';
import { insertOrderLog, isAccountMateSuccessStatus } from '@/lib/db-pg/actions/order-log';
import { sendOrderConfirmationEmails } from '@/lib/db-pg/actions/send-order-confirmation-emails';
import type { PlaceOrder } from '@/lib/db-pg/entities/place-order-entity';
import { db } from '@/lib/db-pg';
import { order, orderAddress, orderItem } from '@/lib/drizzle/schema';
import type {
    ApproveExcelOrderSheetResult,
    ExcelOrderSheetRawRow,
    ExcelOrderSheetValidatedOrder,
} from '@/lib/excel-order-sheet/types';
import { selectFirstEmailAddress } from '@/lib/checkout-utils';
import { parseUserId } from '@/lib/user-id';
import { parseAccountMateOrderNumber, placeWholesaleOrder } from '@/lib/wholesale-api';

function trim(value: string | null | undefined): string {
    return value?.trim() ?? '';
}

function toMoney(value: number): string {
    return (Math.round(value * 100) / 100).toFixed(2);
}

function splitContactName(company: string): { firstName: string; lastName: string } {
    const name = trim(company);
    if (!name) {
        return { firstName: 'Customer', lastName: 'Order' };
    }
    return { firstName: name.slice(0, 60), lastName: 'Order' };
}

async function requireAdminUserId(): Promise<number | null> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
        return null;
    }
    return parseUserId(session.user.id);
}

async function allocateNextOrderNumber(): Promise<number> {
    const [result] = await db.select({ max: sql<number>`coalesce(max(${order.orderNumber}), 9999)` }).from(order);
    const next = Number(result?.max ?? 9999) + 1;
    return next < 10000 ? 10000 : next;
}

async function placeValidatedSheetOrder(
    sheetOrder: ExcelOrderSheetValidatedOrder,
    adminUserId: number,
): Promise<
    { ok: true; orderId: number; orderNumber: number; accountMateOrderNumber: number | null } | { ok: false; error: string }
> {
    const accountRow = await getAccountByIdForManage(sheetOrder.accountId);
    if (!accountRow) {
        return { ok: false, error: 'Account not found.' };
    }

    const billingContact = splitContactName(sheetOrder.billingCompany);
    const shippingContact = splitContactName(sheetOrder.shippingCompany);
    const customerEmail =
        selectFirstEmailAddress(accountRow.contactEmail) || `${sheetOrder.accountMateId}@sweetshopusa.com`;
    const lineTotal = sheetOrder.quantity * sheetOrder.price;
    const shippingCost = 0;
    const tax = 0;
    const expectedDeliveryDate = sheetOrder.expectedDeliveryDate || sheetOrder.requestDate;
    const shippingDate =
        expectedDeliveryDate && expectedDeliveryDate.length > 0
            ? `${expectedDeliveryDate}T12:00:00.000Z`
            : new Date(Date.now() + 14 * 86400000).toISOString();
    const comment = trim(sheetOrder.commentOrGiftMessage) || null;

    const placeOrderPayload: PlaceOrder = {
        account: {
            id: sheetOrder.accountId,
            emailAddress: customerEmail,
            accountMateId: sheetOrder.accountMateId,
        },
        cart: {
            id: sheetOrder.lineNumber,
            cartId: `sheet-${sheetOrder.lineNumber}`,
            shippingMethod: '3RD PARTY',
            shippingDate,
            shippingCost,
            comment,
        },
        billingAddress: {
            company: sheetOrder.billingCompany || null,
            firstName: billingContact.firstName,
            lastName: billingContact.lastName,
            address1: sheetOrder.billingAddress1,
            address2: sheetOrder.billingAddress2 || null,
            city: sheetOrder.billingCity,
            state: sheetOrder.billingState,
            zipCode: sheetOrder.billingZip,
            country: 'US',
            phoneNumber: trim(accountRow.contactPhone) || null,
        },
        shippingAddress: {
            company: sheetOrder.shippingCompany || null,
            firstName: shippingContact.firstName,
            lastName: shippingContact.lastName,
            address1: sheetOrder.shippingAddress1,
            address2: sheetOrder.shippingAddress2 || null,
            city: sheetOrder.shippingCity,
            state: sheetOrder.shippingState,
            zipCode: sheetOrder.shippingZip,
            country: 'US',
            phoneNumber: trim(accountRow.contactPhone) || null,
        },
        items: [
            {
                itemNumber: sheetOrder.itemNumber,
                quantity: sheetOrder.quantity,
                price: sheetOrder.price,
                weight: sheetOrder.weight,
            },
        ],
        payment: { terms: trim(accountRow.terms) || 'TERMS' },
    };

    let apiResponse;
    try {
        apiResponse = await placeWholesaleOrder(placeOrderPayload);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to submit the order to AccountMate.';
        await insertOrderLog({
            outcome: 'failure',
            message,
            stage: 'excel-order-sheet',
            error: message,
            userId: adminUserId,
            accountId: sheetOrder.accountId,
            accountMateId: sheetOrder.accountMateId,
        });
        return { ok: false, error: message };
    }

    if (!apiResponse.ok) {
        await insertOrderLog({
            outcome: 'failure',
            message: apiResponse.message,
            stage: 'excel-order-sheet',
            error: apiResponse.message,
            userId: adminUserId,
            accountId: sheetOrder.accountId,
            accountMateId: sheetOrder.accountMateId,
        });
        return { ok: false, error: apiResponse.message };
    }

    const apiResult = apiResponse.data;
    const orderNumber = await allocateNextOrderNumber();
    const nowIso = new Date().toISOString();
    const accountMateOrderNumber = parseAccountMateOrderNumber(apiResult.accountMateOrderNumber);

    const [insertedOrder] = await db
        .insert(order)
        .values({
            userId: adminUserId,
            orderNumber,
            orderDate: nowIso,
            subTotal: toMoney(lineTotal),
            shipping: toMoney(shippingCost),
            tax: toMoney(tax),
            promotionCode: null,
            promotionDiscount: null,
            total: toMoney(lineTotal + shippingCost + tax),
            ccLastFour: trim(accountRow.terms) || 'TERMS',
            ccExp: null,
            ccType: null,
            comment,
            expectedDeliveryDate: shippingDate,
            shippingCode: '3RD PARTY',
            accountMateReturnStatus: trim(apiResult.accountMateOrderMessage) || null,
            accountMateTransactionId: trim(apiResult.accountMateOrderTransactionId) || null,
            isNewCustomerOrder: 0,
            accountMateOrderNumber,
        })
        .returning({ id: order.id });

    await db.insert(orderItem).values({
        orderId: insertedOrder.id,
        itemNumber: sheetOrder.itemNumber,
        productId: sheetOrder.productId,
        name: trim(sheetOrder.productName) || sheetOrder.itemNumber,
        imagePath: null,
        price: toMoney(sheetOrder.price),
        promotionPrice: '0',
        quantity: sheetOrder.quantity,
        lineTotal: toMoney(lineTotal),
        weight: toMoney(sheetOrder.weight),
        variableData: null,
        timeStamp: nowIso,
    });

    await db.insert(orderAddress).values([
        {
            orderId: insertedOrder.id,
            type: 'S',
            firstName: shippingContact.firstName,
            lastName: shippingContact.lastName,
            companyName: sheetOrder.shippingCompany || null,
            address1: sheetOrder.shippingAddress1,
            address2: sheetOrder.shippingAddress2 || null,
            city: sheetOrder.shippingCity,
            state: sheetOrder.shippingState,
            postalCode: sheetOrder.shippingZip,
            country: 'US',
            phoneNumber: trim(accountRow.contactPhone) || '',
            emailAddress: customerEmail,
        },
        {
            orderId: insertedOrder.id,
            type: 'B',
            firstName: billingContact.firstName,
            lastName: billingContact.lastName,
            companyName: sheetOrder.billingCompany || null,
            address1: sheetOrder.billingAddress1,
            address2: sheetOrder.billingAddress2 || null,
            city: sheetOrder.billingCity,
            state: sheetOrder.billingState,
            postalCode: sheetOrder.billingZip,
            country: 'US',
            phoneNumber: trim(accountRow.contactPhone) || '',
            emailAddress: customerEmail,
        },
    ]);

    const accountMateStatus = trim(apiResult.accountMateOrderMessage);
    const accountMateSuccess = isAccountMateSuccessStatus(accountMateStatus);

    await insertOrderLog({
        outcome: accountMateSuccess ? 'success' : 'failure',
        message: accountMateSuccess
            ? `Excel sheet row ${sheetOrder.lineNumber}: web order #${orderNumber} placed.`
            : `Excel sheet row ${sheetOrder.lineNumber}: web order #${orderNumber} saved; AccountMate returned ${accountMateStatus ?? 'unknown status'}.`,
        stage: 'excel-order-sheet',
        userId: adminUserId,
        accountId: sheetOrder.accountId,
        orderId: insertedOrder.id,
        orderNumber,
        accountMateId: sheetOrder.accountMateId,
        accountMateOrderNumber: apiResult.accountMateOrderNumber ?? null,
        accountMateTransactionId: apiResult.accountMateOrderTransactionId ?? null,
        accountMateStatus,
        error: accountMateSuccess ? null : accountMateStatus ?? 'Unknown AccountMate status',
    });

    void sendOrderConfirmationEmails({
        orderId: insertedOrder.id,
        customerEmail: selectFirstEmailAddress(accountRow.contactEmail) ?? '',
        isNewCustomerOrder: false,
    });

    return { ok: true, orderId: insertedOrder.id, orderNumber, accountMateOrderNumber };
}

/** Places orders after explicit approval. Not used by validate/preview. */
export async function approveExcelOrderSheetOrders(
    orders: ExcelOrderSheetValidatedOrder[],
): Promise<ApproveExcelOrderSheetResult> {
    const adminUserId = await requireAdminUserId();
    if (adminUserId == null) {
        return { ok: false, error: 'You must be signed in as an administrator.' };
    }

    if (!orders.length) {
        return { ok: false, error: 'No orders to approve.' };
    }

    const rawRows: ExcelOrderSheetRawRow[] = orders.map((orderRow) => ({
        lineNumber: orderRow.lineNumber,
        accountMateId: orderRow.accountMateId,
        documentId: orderRow.documentId,
        po: orderRow.po,
        commentOrGiftMessage: orderRow.commentOrGiftMessage,
        expectedDeliveryDate: orderRow.expectedDeliveryDate,
        requestDate: orderRow.requestDate,
        billingCompany: orderRow.billingCompany,
        billingAddress1: orderRow.billingAddress1,
        billingAddress2: orderRow.billingAddress2,
        billingCity: orderRow.billingCity,
        billingState: orderRow.billingState,
        billingZip: orderRow.billingZip,
        shippingCompany: orderRow.shippingCompany,
        shippingAddress1: orderRow.shippingAddress1,
        shippingAddress2: orderRow.shippingAddress2,
        shippingCity: orderRow.shippingCity,
        shippingState: orderRow.shippingState,
        shippingZip: orderRow.shippingZip,
        itemNumber: orderRow.itemNumber,
        quantity: String(orderRow.quantity),
        price: String(orderRow.price),
        weight: String(orderRow.weight),
    }));

    const revalidated = await resolveExcelOrderSheetRows(rawRows);
    if (!revalidated.ok) {
        return { ok: false, error: revalidated.errors.join(' ') };
    }

    const results: Array<{
        lineNumber: number;
        ok: boolean;
        orderId?: number;
        orderNumber?: number;
        accountMateOrderNumber?: number | null;
        error?: string;
    }> = [];

    for (const sheetOrder of revalidated.orders) {
        const result = await placeValidatedSheetOrder(sheetOrder, adminUserId);
        if (result.ok) {
            results.push({
                lineNumber: sheetOrder.lineNumber,
                ok: true,
                orderId: result.orderId,
                orderNumber: result.orderNumber,
                accountMateOrderNumber: result.accountMateOrderNumber,
            });
        } else {
            results.push({
                lineNumber: sheetOrder.lineNumber,
                ok: false,
                error: result.error,
            });
        }
    }

    revalidatePath('/manage/orders');
    revalidatePath('/manage/upload-excel-order-sheet');

    return { ok: true, results };
}
