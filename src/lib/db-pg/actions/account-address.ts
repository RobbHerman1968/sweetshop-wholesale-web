'use server';

import { getServerSession } from 'next-auth';
import { and, asc, eq, or, sql } from 'drizzle-orm';
import { authOptions } from '@/auth';
import { db } from '@/lib/db-pg';
import { canAccessAccountForShop } from '@/lib/db-pg/actions/account';
import type { CheckoutAccountDefaults, CheckoutBillingForm, CheckoutSavedAddress, CheckoutShippingForm } from '@/lib/checkout-types';
import {
    findDefaultBillingAddress,
    findDefaultSavedAddress,
    getCheckoutBillingEmailAddress,
    normalizeAddressName,
    normalizePhoneDigits,
    resolveCheckoutSaveAddressId,
    selectFirstEmailAddress,
    shouldPersistCheckoutAddressToAccount,
    shouldPersistCheckoutBillingAddressToAccount,
} from '@/lib/checkout-utils';
import { saveCartCheckoutBilling, saveCartCheckoutShipping } from '@/lib/db-pg/actions/cart-address';
import { account, accountAddress } from '@/lib/drizzle/schema';
import { getEffectiveWholesaleAccountIdForShopCatalog } from '@/lib/wholesale-account-switcher-actions';
import { parseAccountMateId } from '@/lib/wholesale-api';
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

    const accountMateId = await getAccountMateIdForAccount(accountId);
    const rows = await db
        .select()
        .from(accountAddress)
        .where(accountAddressBelongsToAccount(accountId, accountMateId))
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

    const accountMateId = await getAccountMateIdForAccount(accountId);
    const rows = await db
        .select()
        .from(accountAddress)
        .where(and(accountAddressBelongsToAccount(accountId, accountMateId), eq(accountAddress.type, 'S')))
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
    | { ok: true; accountId: number; accountMateId: string | null };

function accountAddressBelongsToAccount(accountId: number, accountMateId: string | null) {
    if (!accountMateId) {
        return eq(accountAddress.accountId, accountId);
    }

    return or(
        sql`upper(trim(coalesce(${accountAddress.accountMateId}, ''))) = ${accountMateId}`,
        eq(accountAddress.accountId, accountId),
    );
}

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

    return { ok: true, accountId, accountMateId: await getAccountMateIdForAccount(accountId) };
}

export async function syncAccountAddressIdSequence(): Promise<void> {
    await db.execute(sql`
        SELECT setval(
            pg_get_serial_sequence('"accountAddress"', 'id'),
            GREATEST(
                (SELECT COALESCE(MAX(id), 0) FROM "accountAddress"),
                (SELECT last_value FROM "userAddress_id_seq")
            )
        )
    `);
}

async function getAccountMateIdForAccount(accountId: number): Promise<string | null> {
    const [row] = await db
        .select({ accountMateId: account.accountMateId })
        .from(account)
        .where(eq(account.id, accountId))
        .limit(1);

    return parseAccountMateId(row?.accountMateId ?? undefined);
}

async function addressNameExistsForAccountMateId(
    accountId: number,
    accountMateId: string | null,
    name: string,
    excludeId?: number | null,
): Promise<boolean> {
    const normalized = normalizeAddressName(name);
    if (!normalized) {
        return false;
    }

    const rows = await db
        .select({ id: accountAddress.id, name: accountAddress.name })
        .from(accountAddress)
        .where(accountAddressBelongsToAccount(accountId, accountMateId));

    return rows.some(
        (row) =>
            normalizeAddressName(row.name ?? '') === normalized && (excludeId == null || row.id !== excludeId),
    );
}

function mapShippingFormToAccountAddressRow(
    form: CheckoutShippingForm,
    accountId: number,
    accountMateId: string | null,
) {
    const emailAddress = selectFirstEmailAddress(form.emailAddress) || null;
    const phoneNumber = normalizePhoneDigits(form.phoneNumber) || null;

    return {
        accountId,
        accountMateId,
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

export async function saveCheckoutAccountAddress(
    form: CheckoutShippingForm,
    accountDefaults: CheckoutAccountDefaults,
    savedAddresses: CheckoutSavedAddress[],
): Promise<SaveCheckoutAccountAddressResult> {
    const context = await resolveCheckoutAccountContext();
    if (!context.ok) {
        return context;
    }

    const { accountId, accountMateId } = context;
    const values = mapShippingFormToAccountAddressRow(form, accountId, accountMateId);
    const billingEmailAddress = getCheckoutBillingEmailAddress(form, accountDefaults, savedAddresses);
    const saveAddressId = resolveCheckoutSaveAddressId(form);
    const existingDefault = findDefaultSavedAddress(savedAddresses);
    const selectedIsDefault =
        existingDefault != null &&
        (saveAddressId === existingDefault.id ||
            (form.selectedAddressId !== 'new' && form.selectedAddressId === existingDefault.id));

    if (!shouldPersistCheckoutAddressToAccount(form.addressName)) {
        await saveCartCheckoutShipping(accountId, form);
        const addressId = existingDefault?.id ?? (saveAddressId != null && saveAddressId > 0 ? saveAddressId : 0);
        return { ok: true, addressId, billingEmailAddress };
    }

    if (selectedIsDefault) {
        if (await addressNameExistsForAccountMateId(accountId, accountMateId, form.addressName)) {
            return { ok: false, error: 'An address with this name already exists.' };
        }

        await syncAccountAddressIdSequence();
        const [inserted] = await db.insert(accountAddress).values(values).returning({ id: accountAddress.id });
        if (!inserted) {
            return { ok: false, error: 'Unable to save address.' };
        }

        await saveCartCheckoutShipping(accountId, form);

        return { ok: true, addressId: inserted.id, billingEmailAddress };
    }

    if (saveAddressId == null) {
        if (await addressNameExistsForAccountMateId(accountId, accountMateId, form.addressName)) {
            return { ok: false, error: 'An address with this name already exists.' };
        }

        await syncAccountAddressIdSequence();
        const [inserted] = await db.insert(accountAddress).values(values).returning({ id: accountAddress.id });
        if (!inserted) {
            return { ok: false, error: 'Unable to save address.' };
        }

        await saveCartCheckoutShipping(accountId, form);

        return { ok: true, addressId: inserted.id, billingEmailAddress };
    }

    const [existing] = await db
        .select({ id: accountAddress.id })
        .from(accountAddress)
        .where(and(eq(accountAddress.id, saveAddressId), accountAddressBelongsToAccount(accountId, accountMateId)))
        .limit(1);

    if (!existing) {
        return { ok: false, error: 'Address not found for this account.' };
    }

    await db.update(accountAddress).set(values).where(eq(accountAddress.id, saveAddressId));
    await saveCartCheckoutShipping(accountId, form);

    return { ok: true, addressId: saveAddressId, billingEmailAddress };
}

function mapBillingFormToAccountAddressRow(form: CheckoutBillingForm, accountId: number, accountMateId: string | null) {
    const emailAddress = selectFirstEmailAddress(form.emailAddress) || null;
    const phoneNumber = normalizePhoneDigits(form.phoneNumber) || null;

    return {
        accountId,
        accountMateId,
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
    savedAddresses: CheckoutSavedAddress[] = [],
): Promise<SaveCheckoutAccountAddressResult> {
    const context = await resolveCheckoutAccountContext();
    if (!context.ok) {
        return context;
    }

    const { accountId, accountMateId } = context;
    const values = mapBillingFormToAccountAddressRow(form, accountId, accountMateId);
    const billingEmailAddress = selectFirstEmailAddress(form.emailAddress);
    const saveAddressId = resolveCheckoutSaveAddressId(form);
    const existingDefault = findDefaultBillingAddress(savedAddresses.filter((address) => address.isBillingAddress));
    const selectedIsDefault =
        existingDefault != null &&
        (saveAddressId === existingDefault.id ||
            (form.selectedAddressId !== 'new' && form.selectedAddressId === existingDefault.id));

    if (!shouldPersistCheckoutBillingAddressToAccount(form.addressName)) {
        await saveCartCheckoutBilling(accountId, form);
        const addressId = existingDefault?.id ?? (saveAddressId != null && saveAddressId > 0 ? saveAddressId : 0);
        return { ok: true, addressId, billingEmailAddress };
    }

    if (selectedIsDefault) {
        if (await addressNameExistsForAccountMateId(accountId, accountMateId, form.addressName)) {
            return { ok: false, error: 'An address with this name already exists.' };
        }

        await syncAccountAddressIdSequence();
        const [inserted] = await db.insert(accountAddress).values(values).returning({ id: accountAddress.id });
        if (!inserted) {
            return { ok: false, error: 'Unable to save billing address.' };
        }

        await saveCartCheckoutBilling(accountId, form);
        return { ok: true, addressId: inserted.id, billingEmailAddress };
    }

    if (saveAddressId == null) {
        if (await addressNameExistsForAccountMateId(accountId, accountMateId, form.addressName)) {
            return { ok: false, error: 'An address with this name already exists.' };
        }

        await syncAccountAddressIdSequence();
        const [inserted] = await db.insert(accountAddress).values(values).returning({ id: accountAddress.id });
        if (!inserted) {
            return { ok: false, error: 'Unable to save billing address.' };
        }

        await saveCartCheckoutBilling(accountId, form);
        return { ok: true, addressId: inserted.id, billingEmailAddress };
    }

    const [existing] = await db
        .select({ id: accountAddress.id })
        .from(accountAddress)
        .where(and(eq(accountAddress.id, saveAddressId), accountAddressBelongsToAccount(accountId, accountMateId)))
        .limit(1);

    if (!existing) {
        return { ok: false, error: 'Billing address not found for this account.' };
    }

    await db.update(accountAddress).set(values).where(eq(accountAddress.id, saveAddressId));
    await saveCartCheckoutBilling(accountId, form);

    return { ok: true, addressId: saveAddressId, billingEmailAddress };
}
