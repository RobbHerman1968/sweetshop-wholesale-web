'use server';

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db-pg';
import { getAuthenticatedUserId } from '@/lib/auth-session';
import { getUserAccounts } from '@/lib/db-pg/actions/account';
import { getPaginatedOrdersForAuthenticatedUser, type UserOrderListRow } from '@/lib/db-pg/actions/order';
import { user } from '@/lib/drizzle/schema';

function userNeedsProfileCompletion(firstName: string | null | undefined, lastName: string | null | undefined): boolean {
    return !firstName?.trim() || !lastName?.trim();
}

export type AccountPageProfile = {
    id: number;
    userName: string;
    firstName: string | null;
    lastName: string | null;
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
