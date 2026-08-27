'use server';

import { getServerSession } from 'next-auth';
import { and, asc, eq } from 'drizzle-orm';
import { authOptions } from '@/auth';
import { db } from '@/lib/db-pg';
import { canAccessAccountForShop } from '@/lib/db-pg/actions/account';
import type { CheckoutAccountDefaults, CheckoutBillingForm, CheckoutSavedAddress, CheckoutShippingForm } from '@/lib/checkout-types';
import {
    getCheckoutBillingEmailAddress,
    normalizePhoneDigits,
    resolveCheckoutSaveAddressId,
    selectFirstEmailAddress,
} from '@/lib/checkout-utils';
import { account, accountAddress } from '@/lib/drizzle/schema';
import { getEffectiveWholesaleAccountIdForShopCatalog } from '@/lib/wholesale-account-switcher-actions';
import { parseUserId } from '@/lib/user-id';

function trim(value: string | null | undefined): string {
    return value?.trim() ?? '';
}

function isBillingAddressRow(type: string | null | undefined, name: string | null | undefined): boolean {
    const normalizedType = trim(type).toUpperCase();
    if (normalizedType === 'B') return true;
    return trim(name).toLowerCase() === 'billing address';
}

function mapAccountAddressRow(row: typeof accountAddress.$inferSelect): CheckoutSavedAddress {
    const name = trim(row.name);
    const type = trim(row.type);

    return {
        id: row.id,
        name: name || 'Saved address',
        companyName: trim(row.companyName),
        firstName: trim(row.firstName),
        lastName: trim(row.lastName),
        addressLine1: trim(row.addressLine1),
        addressLine2: trim(row.addressLine2),
        city: trim(row.city),
        state: trim(row.state),
        postalCode: trim(row.postalCode),
        country: 'United States',
        emailAddress: selectFirstEmailAddress(row.emailAddress),
        phoneNumber: trim(row.phoneNumber),
        isBillingAddress: isBillingAddressRow(type, name),
    };
}

export async function getAccountAddressesForCheckout(accountId: number): Promise<CheckoutSavedAddress[]> {
    if (!Number.isFinite(accountId) || accountId <= 0) {
        return [];
    }

    const rows = await db
        .select()
        .from(accountAddress)
        .where(eq(accountAddress.accountId, accountId))
        .orderBy(asc(accountAddress.name), asc(accountAddress.id));

    return rows
        .map(mapAccountAddressRow)
        .filter((address) => !address.isBillingAddress || address.addressLine1);
}

/** Legacy Account.GetShippingAddresses: type "S" only, ordered by name / last / first. */
export async function getAccountShippingAddressesForCheckout(accountId: number): Promise<CheckoutSavedAddress[]> {
    if (!Number.isFinite(accountId) || accountId <= 0) {
        return [];
    }

    const rows = await db
        .select()
        .from(accountAddress)
        .where(and(eq(accountAddress.accountId, accountId), eq(accountAddress.type, 'S')))
        .orderBy(
            asc(accountAddress.name),
            asc(accountAddress.lastName),
            asc(accountAddress.firstName),
            asc(accountAddress.id),
        );

    return rows.map(mapAccountAddressRow);
}

export type SaveCheckoutAccountAddressResult =
    | { ok: true; addressId: number; billingEmailAddress: string }
    | { ok: false; error: string };

type CheckoutContext =
    | { ok: false; error: string }
    | { ok: true; accountId: number };

async function resolveCheckoutAccountContext(): Promise<CheckoutContext> {
    const session = await getServerSession(authOptions);
    const userId = parseUserId(session?.user?.id);
    if (userId == null) {
        return { ok: false, error: 'Sign in to save your address.' };
    }

    const isAdmin = session?.user?.isAdmin ?? false;
    const accountId = await getEffectiveWholesaleAccountIdForShopCatalog(userId, isAdmin);
    if (accountId == null) {
        return { ok: false, error: 'Select a wholesale account to continue checkout.' };
    }

    const canAccess = await canAccessAccountForShop(userId, accountId, isAdmin);
    if (!canAccess) {
        return { ok: false, error: 'You cannot access this account.' };
    }

    return { ok: true, accountId };
}

function mapShippingFormToAccountAddressRow(form: CheckoutShippingForm, accountId: number) {
    const emailAddress = selectFirstEmailAddress(form.emailAddress) || null;
    const phoneNumber = normalizePhoneDigits(form.phoneNumber) || null;

    return {
        accountId,
        name: trim(form.addressName) || null,
        type: 'S',
        companyName: trim(form.companyName) || null,
        firstName: trim(form.firstName) || null,
        lastName: trim(form.lastName) || null,
        addressLine1: trim(form.addressLine1) || null,
        addressLine2: trim(form.addressLine2) || null,
        city: trim(form.city) || null,
        state: trim(form.state) || null,
        postalCode: trim(form.zipCode) || null,
        county: trim(form.country) || null,
        emailAddress,
        phoneNumber,
    };
}

function mapShippingFormToBillingAccountAddressRow(form: CheckoutShippingForm, accountId: number) {
    const emailAddress = selectFirstEmailAddress(form.emailAddress) || null;
    const phoneNumber = normalizePhoneDigits(form.phoneNumber) || null;

    return {
        accountId,
        name: 'Billing Address',
        type: 'B',
        companyName: trim(form.companyName) || null,
        firstName: trim(form.firstName) || null,
        lastName: trim(form.lastName) || null,
        addressLine1: trim(form.addressLine1) || null,
        addressLine2: trim(form.addressLine2) || null,
        city: trim(form.city) || null,
        state: trim(form.state) || null,
        postalCode: trim(form.zipCode) || null,
        county: trim(form.country) || null,
        emailAddress,
        phoneNumber,
    };
}

async function upsertBillingAddressFromShipping(
    form: CheckoutShippingForm,
    accountId: number,
    savedAddresses: CheckoutSavedAddress[],
): Promise<void> {
    if (!form.isBillingAddress) {
        return;
    }

    const billingValues = mapShippingFormToBillingAccountAddressRow(form, accountId);
    const existingBilling = savedAddresses.find((address) => address.isBillingAddress);

    if (existingBilling) {
        await db
            .update(accountAddress)
            .set(billingValues)
            .where(and(eq(accountAddress.id, existingBilling.id), eq(accountAddress.accountId, accountId)));
        return;
    }

    await db.insert(accountAddress).values(billingValues);
}

export async function saveCheckoutAccountAddress(
    form: CheckoutShippingForm,
    accountDefaults: CheckoutAccountDefaults,
    savedAddresses: CheckoutSavedAddress[],
): Promise<SaveCheckoutAccountAddressResult> {
    const context = await resolveCheckoutAccountContext();
    if (!context.ok) {
        return context;
    }

    const { accountId } = context;
    const values = mapShippingFormToAccountAddressRow(form, accountId);
    const billingEmailAddress = getCheckoutBillingEmailAddress(form, accountDefaults, savedAddresses);

    if (form.isBillingAddress && billingEmailAddress) {
        await db
            .update(account)
            .set({ contactEmail: billingEmailAddress.toLowerCase() })
            .where(eq(account.id, accountId));
    }

    const saveAddressId = resolveCheckoutSaveAddressId(form);

    if (saveAddressId == null) {
        const [inserted] = await db.insert(accountAddress).values(values).returning({ id: accountAddress.id });
        if (!inserted) {
            return { ok: false, error: 'Unable to save address.' };
        }

        await upsertBillingAddressFromShipping(form, accountId, savedAddresses);

        return { ok: true, addressId: inserted.id, billingEmailAddress };
    }

    const [existing] = await db
        .select({ id: accountAddress.id })
        .from(accountAddress)
        .where(and(eq(accountAddress.id, saveAddressId), eq(accountAddress.accountId, accountId)))
        .limit(1);

    if (!existing) {
        return { ok: false, error: 'Address not found for this account.' };
    }

    await db.update(accountAddress).set(values).where(eq(accountAddress.id, saveAddressId));

    await upsertBillingAddressFromShipping(form, accountId, savedAddresses);

    return { ok: true, addressId: saveAddressId, billingEmailAddress };
}

function mapBillingFormToAccountAddressRow(form: CheckoutBillingForm, accountId: number) {
    const emailAddress = selectFirstEmailAddress(form.emailAddress) || null;
    const phoneNumber = normalizePhoneDigits(form.phoneNumber) || null;

    return {
        accountId,
        name: trim(form.addressName) || 'Billing Address',
        type: 'B',
        companyName: trim(form.companyName) || null,
        firstName: trim(form.firstName) || null,
        lastName: trim(form.lastName) || null,
        addressLine1: trim(form.addressLine1) || null,
        addressLine2: trim(form.addressLine2) || null,
        city: trim(form.city) || null,
        state: trim(form.state) || null,
        postalCode: trim(form.zipCode) || null,
        county: trim(form.country) || null,
        emailAddress,
        phoneNumber,
    };
}

export async function saveCheckoutBillingAddress(
    form: CheckoutBillingForm,
): Promise<SaveCheckoutAccountAddressResult> {
    const context = await resolveCheckoutAccountContext();
    if (!context.ok) {
        return context;
    }

    const { accountId } = context;
    const values = mapBillingFormToAccountAddressRow(form, accountId);
    const billingEmailAddress = selectFirstEmailAddress(form.emailAddress);

    if (billingEmailAddress) {
        await db
            .update(account)
            .set({ contactEmail: billingEmailAddress.toLowerCase() })
            .where(eq(account.id, accountId));
    }

    const saveAddressId = resolveCheckoutSaveAddressId(form);

    if (saveAddressId == null) {
        const [inserted] = await db.insert(accountAddress).values(values).returning({ id: accountAddress.id });
        if (!inserted) {
            return { ok: false, error: 'Unable to save billing address.' };
        }

        return { ok: true, addressId: inserted.id, billingEmailAddress };
    }

    const [existing] = await db
        .select({ id: accountAddress.id })
        .from(accountAddress)
        .where(and(eq(accountAddress.id, saveAddressId), eq(accountAddress.accountId, accountId)))
        .limit(1);

    if (!existing) {
        return { ok: false, error: 'Billing address not found for this account.' };
    }

    await db.update(accountAddress).set(values).where(eq(accountAddress.id, saveAddressId));

    return { ok: true, addressId: saveAddressId, billingEmailAddress };
}
