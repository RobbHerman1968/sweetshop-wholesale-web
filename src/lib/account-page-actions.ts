'use server';

import * as argon2 from 'argon2';
import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db-pg';
import { getAuthenticatedUserId } from '@/lib/auth-session';
import { getUserAccounts } from '@/lib/db-pg/actions/account';
import { getPaginatedOrdersForAuthenticatedUser, type UserOrderListRow } from '@/lib/db-pg/actions/order';
import { user } from '@/lib/drizzle/schema';

const MIN_PASSWORD_LENGTH = 6;

function userNeedsProfileCompletion(firstName: string | null | undefined, lastName: string | null | undefined): boolean {
    return !firstName?.trim() || !lastName?.trim();
}

export type AccountPageProfile = {
    id: number;
    userName: string;
    firstName: string | null;
    lastName: string | null;
    accountMateId: string | null;
    needsProfileCompletion: boolean;
};

export type AccountPageData = {
    profile: AccountPageProfile;
    hasLinkedAccount: boolean;
    orders: UserOrderListRow[];
};

/** Account page data for the signed-in user only. */
export async function getAccountPageData(): Promise<AccountPageData | null> {
    const userId = await getAuthenticatedUserId();
    if (userId == null) {
        return null;
    }

    const [row] = await db
        .select({
            id: user.id,
            userName: user.userName,
            firstName: user.firstName,
            lastName: user.lastName,
            accountMateId: user.accountMateId,
        })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);

    if (!row || row.id !== userId) {
        return null;
    }

    const linkedAccounts = await getUserAccounts(userId);
    const hasLinkedAccount = linkedAccounts.length > 0;

    let orders: UserOrderListRow[] = [];
    if (hasLinkedAccount) {
        const result = await getPaginatedOrdersForAuthenticatedUser({ page: 1, limit: 50 });
        orders = result.data;
    }

    return {
        profile: {
            ...row,
            needsProfileCompletion: userNeedsProfileCompletion(row.firstName, row.lastName),
        },
        hasLinkedAccount,
        orders,
    };
}

export type UpdateAccountProfileResult = { ok: true } | { ok: false; error: string };

/** Update profile for the signed-in user only. */
export async function updateAccountProfileFromForm(formData: FormData): Promise<UpdateAccountProfileResult> {
    const userId = await getAuthenticatedUserId();
    if (userId == null) {
        return { ok: false, error: 'You must be signed in.' };
    }

    const firstName = String(formData.get('firstName') ?? '').trim();
    const lastName = String(formData.get('lastName') ?? '').trim();

    if (!firstName) {
        return { ok: false, error: 'First name is required.' };
    }
    if (!lastName) {
        return { ok: false, error: 'Last name is required.' };
    }

    const updated = await db
        .update(user)
        .set({ firstName, lastName })
        .where(and(eq(user.id, userId)))
        .returning({ id: user.id });

    if (updated.length === 0 || updated[0]?.id !== userId) {
        return { ok: false, error: 'Unable to update profile.' };
    }

    revalidatePath('/account');
    return { ok: true };
}

export type UpdateAccountPasswordResult = { ok: true } | { ok: false; error: string };

/** Change password for the signed-in user only. */
export async function updateAccountPasswordFromForm(formData: FormData): Promise<UpdateAccountPasswordResult> {
    const userId = await getAuthenticatedUserId();
    if (userId == null) {
        return { ok: false, error: 'You must be signed in.' };
    }

    const currentPassword = String(formData.get('currentPassword') ?? '');
    const newPassword = String(formData.get('newPassword') ?? '');
    const confirmPassword = String(formData.get('confirmPassword') ?? '');

    if (!currentPassword) {
        return { ok: false, error: 'Current password is required.' };
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
        return { ok: false, error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
    }
    if (newPassword !== confirmPassword) {
        return { ok: false, error: 'New password and confirmation do not match.' };
    }
    if (newPassword === currentPassword) {
        return { ok: false, error: 'New password must be different from your current password.' };
    }

    const [row] = await db
        .select({ id: user.id, passwordHash: user.passwordHash })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);

    if (!row || row.id !== userId) {
        return { ok: false, error: 'Unable to update password.' };
    }

    let currentValid = false;
    try {
        currentValid = await argon2.verify(row.passwordHash, currentPassword);
    } catch {
        currentValid = false;
    }
    if (!currentValid) {
        return { ok: false, error: 'Current password is incorrect.' };
    }

    const passwordHash = await argon2.hash(newPassword);
    const updated = await db
        .update(user)
        .set({ passwordHash })
        .where(and(eq(user.id, userId)))
        .returning({ id: user.id });

    if (updated.length === 0 || updated[0]?.id !== userId) {
        return { ok: false, error: 'Unable to update password.' };
    }

    return { ok: true };
}
