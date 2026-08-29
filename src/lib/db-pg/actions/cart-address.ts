'use server';

import { and, eq, sql } from 'drizzle-orm';
import type { CheckoutBillingForm, CheckoutShippingForm } from '@/lib/checkout-types';
import { toAccountMateShipVia } from '@/lib/checkout-utils';
import { db } from '@/lib/db-pg';
import { cart, cartAddress } from '@/lib/drizzle/schema';

function trim(value: string | null | undefined): string {
    return value?.trim() ?? '';
}

function trimOrNull(value: string | null | undefined): string | null {
    const trimmed = trim(value);
    return trimmed || null;
}

function toExpectedDeliveryTimestamp(value: string): string | null {
    const trimmed = value.trim();
    return trimmed ? `${trimmed}T12:00:00.000Z` : null;
}

type CartAddressValues = {
    type: 'S' | 'B';
    firstName: string | null;
    lastName: string | null;
    companyName: string | null;
    address1: string | null;
    address2: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    country: string | null;
    phoneNumber: string | null;
    emailAddress: string | null;
};

function mapFormToCartAddressValues(type: 'S' | 'B', form: CheckoutBillingForm | CheckoutShippingForm): CartAddressValues {
    return {
        type,
        firstName: trimOrNull(form.firstName),
        lastName: trimOrNull(form.lastName),
        companyName: trimOrNull(form.companyName),
        address1: trimOrNull(form.addressLine1),
        address2: trimOrNull(form.addressLine2),
        city: trimOrNull(form.city),
        state: trimOrNull(form.state),
        postalCode: trimOrNull(form.zipCode),
        country: trimOrNull(form.country) || 'United States',
        phoneNumber: trimOrNull(form.phoneNumber),
        emailAddress: trimOrNull(form.emailAddress),
    };
}

async function getCartIdForAccount(accountId: number): Promise<number | null> {
    if (!Number.isFinite(accountId) || accountId <= 0) {
        return null;
    }

    const [row] = await db.select({ id: cart.id }).from(cart).where(eq(cart.accountId, accountId)).limit(1);
    return row?.id ?? null;
}

async function upsertCartAddress(cartId: number, values: CartAddressValues) {
    const [existing] = await db
        .select({ id: cartAddress.id })
        .from(cartAddress)
        .where(and(eq(cartAddress.cartId, cartId), eq(cartAddress.type, values.type)))
        .limit(1);

    if (existing) {
        await db.update(cartAddress).set(values).where(eq(cartAddress.id, existing.id));
        return;
    }

    await db.insert(cartAddress).values({ cartId, ...values });
}

export async function saveCartCheckoutShipping(accountId: number, form: CheckoutShippingForm): Promise<void> {
    const cartId = await getCartIdForAccount(accountId);
    if (cartId == null) {
        return;
    }

    await db
        .update(cart)
        .set({
            shippingMethod: form.shippingMethod ? toAccountMateShipVia(form.shippingMethod) : null,
            expectedDeliveryDate: toExpectedDeliveryTimestamp(form.expectedDeliveryDate),
            comment: trimOrNull(form.comment),
            modifiedDate: sql`now()`,
        })
        .where(eq(cart.id, cartId));

    await upsertCartAddress(cartId, mapFormToCartAddressValues('S', form));

    if (form.isBillingAddress) {
        await upsertCartAddress(cartId, mapFormToCartAddressValues('B', form));
    }
}

export async function saveCartCheckoutBilling(accountId: number, form: CheckoutBillingForm): Promise<void> {
    const cartId = await getCartIdForAccount(accountId);
    if (cartId == null) {
        return;
    }

    await upsertCartAddress(cartId, mapFormToCartAddressValues('B', form));
    await db.update(cart).set({ modifiedDate: sql`now()` }).where(eq(cart.id, cartId));
}

export async function clearCartCheckoutDetails(cartId: number): Promise<void> {
    if (!Number.isFinite(cartId) || cartId <= 0) {
        return;
    }

    await db.delete(cartAddress).where(eq(cartAddress.cartId, cartId));
    await db
        .update(cart)
        .set({
            shippingMethod: null,
            expectedDeliveryDate: null,
            comment: null,
            modifiedDate: sql`now()`,
        })
        .where(eq(cart.id, cartId));
}
