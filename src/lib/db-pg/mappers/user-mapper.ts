/* eslint-disable @typescript-eslint/no-explicit-any */
'use server';

import { User, UserReset } from '../entities/user-entity';
import { accountMapper } from './account-mapper';

export async function userMapper(data: any) {
    const user: User = {} as User;
    user.id = data.id;
    user.userName = data.userName;
    user.firstName = data.firstName;
    user.lastName = data.lastName;
    user.passwordHash = data.passwordHash;
    user.isActive = data.isActive;
    user.isAdmin = data.isAdmin;
    user.accountMateId = data.accountMateId ?? null;
    user.accounts = [];

    if (data.accounts) {
        data.accounts.map(async (account: any) => {
            const res = await accountMapper(account);
            user.accounts.push(res);
        });
    }
    return user;
}

export async function userResetMapper(data: any) {
    const userReset: UserReset = {} as UserReset;
    userReset.id = data.id;
    userReset.userId = data.userId;
    userReset.resetValue = data.resetValue;
    userReset.validUntil = data.validUntil;

    return userReset;
}
