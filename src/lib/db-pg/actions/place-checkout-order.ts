'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { eq, sql } from 'drizzle-orm';
import { authOptions } from '@/auth';
import { canAccessAccountForShop, getAccountByIdForManage } from '@/lib/db-pg/actions/account';
import { clearCartCheckoutDetails } from '@/lib/db-pg/actions/cart-address';
import { getCartByAccountId } from '@/lib/db-pg/actions/cart';
import type { PlaceOrder } from '@/lib/db-pg/entities/place-order-entity';
import type {
    CheckoutBillingForm,
    CheckoutPaymentForm,
    CheckoutShippingForm,
} from '@/lib/checkout-types';
import {
    getBillingFieldErrors,
    getCheckoutBillingEmailAddress,
    getShippingFieldErrors,
    selectFirstEmailAddress,
    shippingFormToBillingForm,
    toAccountMateShipVia,
    validatePaymentStep,
} from '@/lib/checkout-utils';
import { db } from '@/lib/db-pg';
import { account, cart, cartItem, order, orderAddress, orderItem, user } from '@/lib/drizzle/schema';
import { getEffectiveWholesaleAccountIdForShopCatalog } from '@/lib/wholesale-account-switcher-actions';
import { parseUserId } from '@/lib/user-id';
import { insertOrderLog, isAccountMateSuccessStatus } from '@/lib/db-pg/actions/order-log';
import { syncOrderIdSequences } from '@/lib/db-pg/actions/order';
import { sendOrderConfirmationEmails } from '@/lib/db-pg/actions/send-order-confirmation-emails';
import { placeWholesaleOrder, parseAccountMateId, parseAccountMateOrderNumber } from '@/lib/wholesale-api';
import { normalizeCardDigits } from '@/lib/checkout-payment-validation';

export type PlaceCheckoutOrderInput = {
    shipping: CheckoutShippingForm;
    billing: CheckoutBillingForm;
    billingSameAsShipping: boolean;
    payment: CheckoutPaymentForm;
    shippingCost: number;
    tax: number;
    estimatedTotal: number;
};

export type PlaceCheckoutOrderResult =
    | { ok: true; orderId: number; orderNumber: number | null }
    | { ok: false; error: string };

function trim(value: string | null | undefined): string {
    return value?.trim() ?? '';
}

function toMoney(value: number): string {
    return (Math.round(value * 100) / 100).toFixed(2);
}

function toExpectedDeliveryTimestamp(value: string): string {
    return `${value.trim()}T12:00:00.000Z`;
}

const WEB_ORDER_NUMBER_START = 60000;

async function allocateNextOrderNumber(): Promise<number> {
    const [result] = await db.select({ max: sql<number>`coalesce(max(${order.orderNumber}), ${WEB_ORDER_NUMBER_START - 1})` }).from(order);
    const next = Number(result?.max ?? WEB_ORDER_NUMBER_START - 1) + 1;
    return next < WEB_ORDER_NUMBER_START ? WEB_ORDER_NUMBER_START : next;
}

async function clearCartAfterOrder(cartId: number): Promise<void> {
    await db.delete(cartItem).where(eq(cartItem.cartId, cartId));
    await clearCartCheckoutDetails(cartId);
    await db
        .update(cart)
        .set({
            subTotal: '0',
            tax: '0',
            shipping: '0',
            discounts: '0',
            total: '0',
            modifiedDate: sql`now()`,
        })
        .where(eq(cart.id, cartId));
}

async function persistAccountMateId(accountId: number, userId: number, accountMateId: string): Promise<void> {
    const trimmed = parseAccountMateId(accountMateId);
    if (!trimmed) {
        return;
    }

    const [accountRow] = await db
        .select({ accountMateId: account.accountMateId })
        .from(account)
        .where(eq(account.id, accountId))
        .limit(1);

    if (!parseAccountMateId(accountRow?.accountMateId ?? undefined)) {
        await db.update(account).set({ accountMateId: trimmed }).where(eq(account.id, accountId));
    }

    const [userRow] = await db
        .select({ accountMateId: user.accountMateId })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);

    if (!trimOrNull(userRow?.accountMateId)) {
        await db.update(user).set({ accountMateId: trimmed }).where(eq(user.id, userId));
    }
}

function trimOrNull(value: string | null | undefined): string | null {
    const trimmed = trim(value);
    return trimmed || null;
}

function mapAddressForm(form: CheckoutBillingForm | CheckoutShippingForm) {
    return {
        company: trimOrNull(form.companyName),
        firstName: trim(form.firstName),
        lastName: trim(form.lastName),
        address1: trim(form.addressLine1),
        address2: trimOrNull(form.addressLine2),
        city: trim(form.city),
        state: trim(form.state),
        zipCode: trim(form.zipCode),
        country: trim(form.country) || 'United States',
        phoneNumber: trimOrNull(form.phoneNumber),
    };
}

function buildPlaceOrderPayment(payment: CheckoutPaymentForm, accountIsTerms: boolean): PlaceOrder['payment'] {
    if (accountIsTerms || payment.payByTerms) {
        return { terms: trim(payment.terms) };
    }

    return {
        ccName: trim(payment.cardName),
        ccNumber: normalizeCardDigits(payment.cardNumber),
        ccMonth: trim(payment.cardMonth),
        ccYear: trim(payment.cardYear),
        ccCCV: trim(payment.cardCcv),
        ccType: trim(payment.cardType),
    };
}

function buildStoredCardFields(payment: CheckoutPaymentForm, accountIsTerms: boolean) {
    if (accountIsTerms || payment.payByTerms) {
        return {
            ccLastFour: trim(payment.terms) || null,
            ccExp: null,
            ccType: null,
        };
    }

    const digits = normalizeCardDigits(payment.cardNumber);
    const lastFour = digits.slice(-4);

    return {
        ccLastFour: lastFour ? `************${lastFour}` : null,
        ccExp: payment.cardMonth && payment.cardYear ? `${payment.cardMonth}/${payment.cardYear}` : null,
        ccType: trimOrNull(payment.cardType),
    };
}

type OrderLogContext = {
    userId?: number;
    accountId?: number;
    cartId?: number | string;
    orderId?: number;
    orderNumber?: number | null;
    accountMateId?: string | null;
    accountMateOrderNumber?: string | number | null;
    accountMateTransactionId?: string | null;
    accountMateStatus?: string | null;
};

async function failCheckoutOrder(
    message: string,
    context: OrderLogContext = {},
    stage = 'validation',
): Promise<PlaceCheckoutOrderResult> {
    await insertOrderLog({
        outcome: 'failure',
        message,
        stage,
        error: message,
        userId: context.userId ?? null,
        accountId: context.accountId ?? null,
        cartId: context.cartId ?? null,
        orderId: context.orderId ?? null,
        orderNumber: context.orderNumber ?? null,
        accountMateId: context.accountMateId ?? null,
        accountMateOrderNumber: context.accountMateOrderNumber ?? null,
        accountMateTransactionId: context.accountMateTransactionId ?? null,
        accountMateStatus: context.accountMateStatus ?? null,
    });
    return { ok: false, error: message };
}

export async function placeCheckoutOrder(input: PlaceCheckoutOrderInput): Promise<PlaceCheckoutOrderResult> {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return failCheckoutOrder('Sign in to place an order.');
    }

    const userId = parseUserId(session.user.id);
    if (userId == null) {
        return failCheckoutOrder('Sign in to place an order.');
    }

    const isAdmin = session.user.isAdmin ?? false;
    const accountId = await getEffectiveWholesaleAccountIdForShopCatalog(userId, isAdmin);
    if (accountId == null) {
        return failCheckoutOrder('Select a wholesale account before placing an order.', { userId });
    }

    const canAccess = await canAccessAccountForShop(userId, accountId, isAdmin);
    if (!canAccess) {
        return failCheckoutOrder('You cannot place an order for this account.', { userId, accountId });
    }

    const shippingErrors = getShippingFieldErrors(input.shipping);
    if (Object.keys(shippingErrors).length > 0) {
        return failCheckoutOrder(Object.values(shippingErrors)[0] ?? 'Shipping details are incomplete.', { userId, accountId });
    }

    const billingForm = input.billingSameAsShipping ? shippingFormToBillingForm(input.shipping) : input.billing;
    const billingErrors = getBillingFieldErrors(billingForm);
    if (Object.keys(billingErrors).length > 0) {
        return failCheckoutOrder(Object.values(billingErrors)[0] ?? 'Billing details are incomplete.', { userId, accountId });
    }

    const accountRow = await getAccountByIdForManage(accountId);
    if (!accountRow) {
        return failCheckoutOrder('Account not found.', { userId, accountId });
    }

    const paymentError = validatePaymentStep(input.payment, accountRow.isTerms ?? false);
    if (paymentError) {
        return failCheckoutOrder(paymentError, { userId, accountId });
    }

    const cartData = await getCartByAccountId(accountId);
    if (!cartData?.cartItems.length) {
        return failCheckoutOrder('Your cart is empty.', { userId, accountId });
    }

    const existingAccountMateId = trimOrNull(accountRow.accountMateId);
    const billingEmailAddress = getCheckoutBillingEmailAddress(
        input.shipping,
        {
            firstName: trim(accountRow.contactFirstName),
            lastName: trim(accountRow.contactLastName),
            companyName: trim(accountRow.name),
            addressLine1: trim(accountRow.contactAddress1),
            addressLine2: trim(accountRow.contactAddress2),
            city: trim(accountRow.contactCity),
            state: trim(accountRow.contactState),
            zipCode: trim(accountRow.contactZipCode),
            emailAddress: selectFirstEmailAddress(accountRow.contactEmail) || trim(session.user.email),
            phoneNumber: trim(accountRow.contactPhone),
            terms: trim(accountRow.terms),
            isTerms: accountRow.isTerms ?? false,
        },
        [],
        billingForm,
    );

    const placeOrderPayload: PlaceOrder = {
        account: {
            id: accountId,
            emailAddress: billingEmailAddress || selectFirstEmailAddress(accountRow.contactEmail) || trim(session.user.email),
            accountMateId: existingAccountMateId,
        },
        cart: {
            id: cartData.id,
            cartId: String(cartData.id),
            shippingMethod: toAccountMateShipVia(input.shipping.shippingMethod),
            shippingDate: toExpectedDeliveryTimestamp(input.shipping.expectedDeliveryDate),
            shippingCost: input.shippingCost,
            comment: trimOrNull(input.shipping.comment),
        },
        billingAddress: mapAddressForm(billingForm),
        shippingAddress: mapAddressForm(input.shipping),
        items: cartData.cartItems.map((item) => ({
            id: item.id,
            cartId: item.cartId,
            itemNumber: trim(item.product.itemNumber),
            quantity: item.quantity,
            price: item.quantity > 0 ? item.lineTotal / item.quantity : Number(item.product.price),
            weight: Number(item.product.weightInOunces ?? 0),
        })),
        payment: buildPlaceOrderPayment(input.payment, accountRow.isTerms ?? false),
    };

    let apiResponse;
    try {
        apiResponse = await placeWholesaleOrder(placeOrderPayload);
    } catch (error) {
        console.error('[placeCheckoutOrder] wholesale API failed', error);
        const message = error instanceof Error ? error.message : 'Unable to submit the order to AccountMate.';
        return failCheckoutOrder(
            message,
            {
                userId,
                accountId,
                cartId: cartData.id,
                accountMateId: existingAccountMateId,
            },
            'accountmate',
        );
    }

    if (!apiResponse.ok) {
        return failCheckoutOrder(
            apiResponse.message,
            {
                userId,
                accountId,
                cartId: cartData.id,
                accountMateId: existingAccountMateId,
            },
            'accountmate',
        );
    }

    const apiResult = apiResponse.data;

    await insertOrderLog({
        outcome: apiResponse.accountMateSuccess ? 'success' : 'failure',
        message: apiResponse.message,
        stage: 'accountmate',
        userId,
        accountId,
        cartId: cartData.id,
        accountMateId: apiResult.account.accountMateId ?? existingAccountMateId,
        accountMateOrderNumber: apiResult.accountMateOrderNumber ?? null,
        accountMateTransactionId: apiResult.accountMateOrderTransactionId ?? null,
        accountMateStatus: apiResponse.accountMateStatus,
        error: apiResponse.accountMateSuccess ? null : apiResponse.accountMateStatus ?? apiResponse.message,
    });

    const resolvedAccountMateId = trimOrNull(apiResult.account.accountMateId) ?? existingAccountMateId;
    if (resolvedAccountMateId && resolvedAccountMateId !== existingAccountMateId) {
        await persistAccountMateId(accountId, userId, resolvedAccountMateId);
    }

    const orderNumber = await allocateNextOrderNumber();
    const cardFields = buildStoredCardFields(input.payment, accountRow.isTerms ?? false);
    const nowIso = new Date().toISOString();
    await syncOrderIdSequences();

    const [insertedOrder] = await db
        .insert(order)
        .values({
            userId,
            orderNumber,
            orderDate: nowIso,
            subTotal: toMoney(cartData.subTotal),
            shipping: toMoney(input.shippingCost),
            tax: toMoney(input.tax),
            promotionCode: null,
            promotionDiscount: null,
            total: toMoney(input.estimatedTotal),
            ccLastFour: cardFields.ccLastFour,
            ccExp: cardFields.ccExp,
            ccType: cardFields.ccType,
            comment: trimOrNull(input.shipping.comment),
            expectedDeliveryDate: toExpectedDeliveryTimestamp(input.shipping.expectedDeliveryDate),
            shippingCode: toAccountMateShipVia(input.shipping.shippingMethod),
            accountMateReturnStatus: trimOrNull(apiResult.accountMateOrderMessage),
            accountMateTransactionId: trimOrNull(apiResult.accountMateOrderTransactionId),
            isNewCustomerOrder: existingAccountMateId ? 0 : 1,
            accountMateOrderNumber: parseAccountMateOrderNumber(apiResult.accountMateOrderNumber),
            accountMateId: parseAccountMateId(resolvedAccountMateId ?? undefined),
        })
        .returning({ id: order.id });

    const orderId = insertedOrder.id;

    await db.insert(orderItem).values(
        cartData.cartItems.map((item) => {
            const unitPrice = item.quantity > 0 ? item.lineTotal / item.quantity : Number(item.product.price);
            return {
                orderId,
                itemNumber: trim(item.product.itemNumber),
                productId: item.productId,
                name: trim(item.product.name) || `Product ${item.productId}`,
                imagePath: item.product.productImages?.[0]?.vercelImage?.path ?? null,
                price: toMoney(unitPrice),
                promotionPrice: '0',
                quantity: item.quantity,
                lineTotal: toMoney(item.lineTotal),
                weight: toMoney(Number(item.product.weightInOunces ?? 0)),
                variableData: null,
                timeStamp: nowIso,
            };
        }),
    );

    const billingEmail = billingEmailAddress || billingForm.emailAddress;
    await db.insert(orderAddress).values([
        {
            orderId,
            type: 'S',
            firstName: trimOrNull(input.shipping.firstName),
            lastName: trim(input.shipping.lastName),
            companyName: trimOrNull(input.shipping.companyName),
            address1: trim(input.shipping.addressLine1),
            address2: trimOrNull(input.shipping.addressLine2),
            city: trim(input.shipping.city),
            state: trim(input.shipping.state),
            postalCode: trim(input.shipping.zipCode),
            country: trim(input.shipping.country) || 'United States',
            phoneNumber: trim(input.shipping.phoneNumber),
            emailAddress: trim(input.shipping.emailAddress),
        },
        {
            orderId,
            type: 'B',
            firstName: trimOrNull(billingForm.firstName),
            lastName: trim(billingForm.lastName),
            companyName: trimOrNull(billingForm.companyName),
            address1: trim(billingForm.addressLine1),
            address2: trimOrNull(billingForm.addressLine2),
            city: trim(billingForm.city),
            state: trim(billingForm.state),
            postalCode: trim(billingForm.zipCode),
            country: trim(billingForm.country) || 'United States',
            phoneNumber: trim(billingForm.phoneNumber),
            emailAddress: billingEmail,
        },
    ]);

    await clearCartAfterOrder(cartData.id);

    revalidatePath('/shop');
    revalidatePath('/cart');
    revalidatePath('/checkout');
    revalidatePath('/account');
    revalidatePath('/manage/orders');

    const accountMateStatus = trimOrNull(apiResult.accountMateOrderMessage);
    const accountMateSuccess = isAccountMateSuccessStatus(accountMateStatus);
    const successMessage = accountMateSuccess
        ? `Web order #${orderNumber} placed successfully.`
        : `Web order #${orderNumber} saved, but AccountMate returned: ${accountMateStatus ?? 'unknown status'}.`;

    await insertOrderLog({
        outcome: accountMateSuccess ? 'success' : 'failure',
        message: successMessage,
        stage: 'checkout',
        userId,
        accountId,
        cartId: cartData.id,
        orderId,
        orderNumber,
        accountMateId: resolvedAccountMateId,
        accountMateOrderNumber: apiResult.accountMateOrderNumber ?? null,
        accountMateTransactionId: apiResult.accountMateOrderTransactionId ?? null,
        accountMateStatus,
        error: accountMateSuccess ? null : accountMateStatus ?? 'Unknown AccountMate status',
    });

    void sendOrderConfirmationEmails({
        orderId,
        customerEmail: selectFirstEmailAddress(billingEmail),
        isNewCustomerOrder: !existingAccountMateId,
    });

    return { ok: true, orderId, orderNumber };
}
