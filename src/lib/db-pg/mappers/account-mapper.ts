/* eslint-disable @typescript-eslint/no-explicit-any */
'use server';

import { Account } from '../entities/account-entity';

export async function accountMapper(data: any) {
    const account: Account = {} as Account;
    account.id = data.id;
    account.accountMateId = data.accountMateId ?? '';
    account.isSkipTax = data.isSkipTax;
    account.isSkipShipping = data.isSkipShipping;
    account.isFreeGroundShipping = data.isFreeGroundShipping;
    account.terms = data.terms ?? '';
    account.isTerms = data.isTerms;
    account.name = data.name?.trim() ?? '';
    account.contactFirstName = data.contactFirstName?.trim() ?? '';
    account.contactLastName = data.contactLastName?.trim() ?? '';
    account.contactEmail = data.contactEmail?.trim() ?? '';
    account.contactPhone = data.contactPhone?.trim() ?? '';
    account.contactAddress1 = data.contactAddress1?.trim() ?? '';
    account.contactAddress2 = data.contactAddress2?.trim() ?? '';
    account.contactCity = data.contactCity?.trim() ?? '';
    account.contactState = data.contactState?.trim() ?? '';
    account.contactZipCode = data.contactZipCode?.trim() ?? '';

    return account;
}
