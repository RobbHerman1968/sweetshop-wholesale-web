'use server';

import * as argon2 from 'argon2';
import { ensureAccountExistsForAccountMateId, getUserAccounts } from '@/lib/db-pg/actions/account';
import { userMapper } from '../mappers/user-mapper';
import { User } from '../entities/user-entity';
import { db } from '@/lib/db-pg';
import { user } from '@/lib/drizzle/schema';
import { and, asc, eq, ilike, ne, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { parseAccountMateId } from '@/lib/wholesale-api';

export type ManageUser = {
    id: number;
    userName: string;
    firstName: string | null;
    lastName: string | null;
    accountMateId: string | null;
    isActive: boolean;
    isAdmin: boolean;
};

function trimOrNull(value: FormDataEntryValue | null): string | null {
    if (value == null) {
        return null;
    }
    const trimmed = String(value).trim();
    return trimmed || null;
}

function parseCheckbox(formData: FormData, name: string): boolean {
    const value = formData.get(name);
    return value === 'on' || value === 'true';
}

export async function getUserByUserName(userName: string) {
    const returnUser = await db.query.user.findFirst({
        where: eq(user.userName, userName),
    });
    return await userMapper(returnUser);
}

export async function getUserByUID(uid: number) {
    const returnUser = await db.query.user.findFirst({
        where: eq(user.id, uid),
    });
    return await userMapper(returnUser);
}

export async function getUserByIdForManage(userId: number): Promise<ManageUser | null> {
    if (!Number.isFinite(userId) || userId <= 0) {
        return null;
    }

    const [row] = await db
        .select({
            id: user.id,
            userName: user.userName,
            firstName: user.firstName,
            lastName: user.lastName,
            accountMateId: user.accountMateId,
            isActive: user.isActive,
            isAdmin: user.isAdmin,
        })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);

    return row ?? null;
}

export async function updateUserFromForm(formData: FormData) {
    const id = Number(formData.get('id'));
    if (!id) {
        return;
    }

    const existing = await getUserByIdForManage(id);
    if (!existing) {
        return;
    }

    const userName = trimOrNull(formData.get('userName'))?.toLowerCase() ?? existing.userName;
    const firstName = trimOrNull(formData.get('firstName'));
    const lastName = trimOrNull(formData.get('lastName'));
    const accountMateIdRaw = trimOrNull(formData.get('accountMateId'));
    const accountMateId = accountMateIdRaw ? parseAccountMateId(accountMateIdRaw) : null;
    const isAdmin = parseCheckbox(formData, 'isAdmin');
    const isActive = parseCheckbox(formData, 'isActive');
    const newPassword = trimOrNull(formData.get('newPassword'));

    if (userName !== existing.userName) {
        const [conflict] = await db
            .select({ id: user.id })
            .from(user)
            .where(and(eq(user.userName, userName), ne(user.id, id)))
            .limit(1);
        if (conflict) {
            return;
        }
    }

    const update: {
        userName: string;
        firstName: string | null;
        lastName: string | null;
        accountMateId: string | null;
        isAdmin: boolean;
        isActive: boolean;
        passwordHash?: string;
    } = {
        userName,
        firstName,
        lastName,
        accountMateId,
        isAdmin,
        isActive,
    };

    if (newPassword) {
        update.passwordHash = await argon2.hash(newPassword);
    }

    await db.update(user).set(update).where(eq(user.id, id));

    revalidatePath('/manage/users');
    revalidatePath(`/manage/users/${id}`);
}

export type CreateUserFormResult = { ok: true; id: number } | { ok: false; error: string };

export async function createUserFromForm(formData: FormData): Promise<CreateUserFormResult> {
    const userName = trimOrNull(formData.get('userName'))?.toLowerCase();
    const firstName = trimOrNull(formData.get('firstName'));
    const lastName = trimOrNull(formData.get('lastName'));
    const rawAccountMateId = trimOrNull(formData.get('accountMateId'));
    const password = trimOrNull(formData.get('password'));
    const isAdmin = parseCheckbox(formData, 'isAdmin');
    const isActive = parseCheckbox(formData, 'isActive');

    if (!userName) {
        return { ok: false, error: 'Email is required.' };
    }
    if (!firstName) {
        return { ok: false, error: 'First name is required.' };
    }
    if (!lastName) {
        return { ok: false, error: 'Last name is required.' };
    }
    if (!password || password.length < 6) {
        return { ok: false, error: 'Password must be at least 6 characters.' };
    }

    const accountMateId = rawAccountMateId ? parseAccountMateId(rawAccountMateId) : null;
    if (rawAccountMateId && !accountMateId) {
        return { ok: false, error: 'Invalid AccountMate ID.' };
    }

    const [conflict] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.userName, userName))
        .limit(1);
    if (conflict) {
        return { ok: false, error: 'That email is already in use.' };
    }

    // Resolve/create the account before inserting the user so a missing AccountMate
    // customer never leaves a dangling login.
    if (accountMateId) {
        const accountResult = await ensureAccountExistsForAccountMateId(accountMateId, {
            contactEmail: userName,
        });
        if (!accountResult.ok) {
            return { ok: false, error: accountResult.error };
        }
    }

    const [{ maxId }] = await db.select({ maxId: sql<number>`coalesce(max(${user.id}), 0)` }).from(user);
    const nextId = Number(maxId) + 1;
    const passwordHash = await argon2.hash(password);

    await db.insert(user).values({
        id: nextId,
        userName,
        passwordHash,
        firstName,
        lastName,
        accountMateId,
        isAdmin,
        isActive,
    });

    revalidatePath('/manage/users');
    redirect(`/manage/users/${nextId}`);
}

export async function getUserWithAccountsById(userId: number) {
    const returnUser = await db.query.user.findFirst({
        where: eq(user.id, userId),
    });
    if (!returnUser) {
        return await userMapper(returnUser);
    }

    const mapped = await userMapper(returnUser);
    mapped.accounts = await getUserAccounts(userId);
    return mapped;
}

export async function getPaginatedUsersFromDB({
    page = 1,
    limit = 50,
    userName,
    lastName,
    accountMateId,
}: {
    page?: number;
    limit?: number;
    userName?: string;
    lastName?: string;
    accountMateId?: string;
}) {
    const offset = (page - 1) * limit;

    const conditions = [];
    if (userName) {
        conditions.push(ilike(user.userName, `%${userName}%`));
    }
    if (lastName) {
        conditions.push(ilike(user.lastName, `%${lastName}%`));
    }
    if (accountMateId) {
        conditions.push(ilike(user.accountMateId, `%${accountMateId}%`));
    }

    const whereClause = conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : and(...conditions);

    const data = await db
        .select({
            id: user.id,
            userName: user.userName,
            firstName: user.firstName,
            lastName: user.lastName,
            accountMateId: user.accountMateId,
            isActive: user.isActive,
            isAdmin: user.isAdmin,
        })
        .from(user)
        .where(whereClause)
        .orderBy(asc(user.userName))
        .limit(limit)
        .offset(offset);

    const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(user)
        .where(whereClause);

    return {
        data,
        pagination: {
            total: Number(count),
            page,
            limit,
            totalPages: Math.max(1, Math.ceil(Number(count) / limit)),
        },
    };
}

export async function getUsers(limit: number, offset: number, name: string) {
    const filter = '%' + name + '%';

    const users = await db
        .select({ id: user.id, userName: user.userName, firstName: user.firstName, lastName: user.lastName })
        .from(user)
        .where(ilike(user.userName, '%' + filter + '%'))
        .orderBy((x) => x.userName)
        .limit(limit)
        .offset(offset);

    console.log(users);
    const out: User[] = [];
    users?.map(async (p) => {
        out.push(await userMapper(p));
    });
    return out;
}

export async function getUsersBySearch(emailAddress: string | undefined, lastName: string | undefined) {
    const emailAddressFilter = '%' + emailAddress + '%';
    const lastNameFilter = '%' + lastName + '%';

    console.log(lastName?.length);
    let users = [];
    if (lastName?.length === 0) {
        users = await db
            .select({ id: user.id, userName: user.userName, firstName: user.firstName, lastName: user.lastName })
            .from(user)
            .where(ilike(user.userName, '%' + emailAddressFilter + '%'))
            .orderBy((x) => x.userName);
    } else {
        users = await db
            .select({ id: user.id, userName: user.userName, firstName: user.firstName, lastName: user.lastName })
            .from(user)
            .where(and(ilike(user.userName, '%' + emailAddressFilter + '%'), ilike(user.lastName, '%' + lastNameFilter + '%')))

            .orderBy((x) => x.userName);
    }

    const out: User[] = [];
    users?.map(async (p) => {
        out.push(await userMapper(p));
    });
    return out;
}

export async function createUser(id: number, userName: string, passwordHash: string, isAdmin: boolean, isActive: boolean) {
    return await db.insert(user).values({ id: id, userName: userName, passwordHash: passwordHash, isAdmin: isAdmin, isActive: isActive });
}

export async function updateUserNameAccount(id: number, firstName: string, lastName: string) {
    return await db.update(user).set({ firstName: firstName, lastName: lastName }).where(eq(user.id, id));
}

export async function updateUserEmailAccount(id: number, userName: string) {
    return await db.update(user).set({ userName: userName }).where(eq(user.id, id));
}

export async function updateUserPasswordAccount(id: number, passwordHash: string) {
    return await db.update(user).set({ passwordHash: passwordHash }).where(eq(user.id, id));
}

export async function updateUserAccountFromAdmin(id: number, userName: string, firstName: string, lastName: string, isAdmin: boolean, isActive: boolean) {
    return await db
        .update(user)
        .set({
            userName: userName,
            firstName: firstName,
            lastName: lastName,
            isAdmin: isAdmin,
            isActive: isActive,
        })
        .where(eq(user.id, id));
}

export const getAllUsers = async () => {
    const users = await db.select().from(user);

    const out: User[] = [];
    users?.map(async (r) => {
        out.push(await userMapper(r));
    });
    return out;
};
