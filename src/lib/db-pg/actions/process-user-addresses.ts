'use server';

import { inArray, sql } from 'drizzle-orm';

import { db } from '@/lib/db-pg';
import { getAccountAddressesFromSweetshopOld } from '@/lib/db-sweetshop-old';
import { account, accountAddress } from '@/lib/drizzle/schema';
import { parseAccountMateId } from '@/lib/wholesale-api';

async function advanceAccountAddressIdSequence(): Promise<void> {
    const result = await db.execute<{ last_value?: unknown }>(sql`
        SELECT setval(
            pg_get_serial_sequence('"accountAddress"', 'id'),
            GREATEST(
                (SELECT COALESCE(MAX(id), 0) FROM "accountAddress"),
                (SELECT last_value FROM "userAddress_id_seq")
            )
        ) AS last_value
    `);

    console.log(
        `User address sync: advanced accountAddress id sequence to ${String(result.rows[0]?.last_value ?? 'unknown')}`,
    );
}

export type UserAddressSyncResult = {
    fetched: number;
    inserted: number;
    updated: number;
    skipped: number;
};

function trimOrNull(value: unknown): string | null {
    if (value == null) {
        return null;
    }
    const trimmed = String(value).trim();
    return trimmed || null;
}

function digitsOnlyOrNull(value: unknown): string | null {
    const trimmed = trimOrNull(value);
    if (!trimmed) {
        return null;
    }
    const digits = trimmed.replace(/\D/g, '');
    return digits || null;
}

function isBillingAddressName(name: string | null): boolean {
    return name?.trim().toLowerCase() === 'billing address';
}

function resolveLegacyAddressType(type: string | null, name: string | null): string | null {
    if (type) {
        return type;
    }
    if (isBillingAddressName(name)) {
        return 'B';
    }
    return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readLegacyAccountAddressId(row: any): number | null {
    const id = Number(row.Id ?? row.id);
    return Number.isFinite(id) && id > 0 ? id : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readLegacyAccountAddressAccountId(row: any): number | null {
    const accountId = Number(row.AccountId ?? row.accountId);
    return Number.isFinite(accountId) && accountId > 0 ? accountId : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readLegacyAccountAddressAccountMateId(row: any): string | null {
    return parseAccountMateId(row.AccountMateId ?? row.accountMateId ?? undefined);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapLegacyAccountAddressRow(row: any) {
    const companyName = trimOrNull(row.Company ?? row.company);
    const name = trimOrNull(row.AddressName ?? row.addressName);
    const type = resolveLegacyAddressType(trimOrNull(row.AddressType ?? row.addressType), name);

    return {
        id: readLegacyAccountAddressId(row)!,
        accountId: readLegacyAccountAddressAccountId(row)!,
        accountMateId: readLegacyAccountAddressAccountMateId(row),
        name,
        type,
        companyName,
        firstName: trimOrNull(row.FirstName ?? row.firstName),
        lastName: trimOrNull(row.LastName ?? row.lastName),
        addressLine1: trimOrNull(row.Address1 ?? row.address1),
        addressLine2: trimOrNull(row.Address2 ?? row.address2),
        city: trimOrNull(row.City ?? row.city),
        state: trimOrNull(row.State ?? row.state),
        postalCode: trimOrNull(row.ZipCode ?? row.zipCode),
        county: trimOrNull(row.Country ?? row.country),
        emailAddress: trimOrNull(row.EmailAddress ?? row.emailAddress),
        phoneNumber: digitsOnlyOrNull(row.PhoneNumber ?? row.phoneNumber),
    };
}

type LegacyUserAddressRow = ReturnType<typeof mapLegacyAccountAddressRow>;

async function fillAccountMateIdsFromAccounts(chunk: LegacyUserAddressRow[]) {
    const missingAccountIds = [
        ...new Set(chunk.filter((row) => !row.accountMateId).map((row) => row.accountId)),
    ];
    if (missingAccountIds.length === 0) {
        return;
    }

    const accounts = await db
        .select({ id: account.id, accountMateId: account.accountMateId })
        .from(account)
        .where(inArray(account.id, missingAccountIds));

    const byAccountId = new Map(
        accounts.map((row) => [row.id, parseAccountMateId(row.accountMateId ?? undefined)]),
    );

    for (const row of chunk) {
        if (!row.accountMateId) {
            row.accountMateId = byAccountId.get(row.accountId) ?? null;
        }
    }
}

async function upsertAccountAddressChunk(chunk: LegacyUserAddressRow[]) {
    if (chunk.length === 0) {
        return;
    }

    await fillAccountMateIdsFromAccounts(chunk);

    await db
        .insert(accountAddress)
        .values(chunk)
        .onConflictDoUpdate({
            target: accountAddress.id,
            set: {
                accountId: sql`excluded."accountId"`,
                accountMateId: sql`excluded."accountMateId"`,
                name: sql`excluded.name`,
                type: sql`excluded.type`,
                companyName: sql`excluded."companyName"`,
                firstName: sql`excluded."firstName"`,
                lastName: sql`excluded."lastName"`,
                addressLine1: sql`excluded."addressLine1"`,
                addressLine2: sql`excluded."addressLine2"`,
                city: sql`excluded.city`,
                state: sql`excluded.state`,
                postalCode: sql`excluded."postalCode"`,
                county: sql`excluded.county`,
                emailAddress: sql`excluded."emailAddress"`,
                phoneNumber: sql`excluded."phoneNumber"`,
            },
        });
}

export async function getMaxUserAddressId(): Promise<number> {
    const [result] = await db.select({ max: sql<number>`coalesce(max(${accountAddress.id}), 0)` }).from(accountAddress);
    return Number(result?.max ?? 0);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function syncLegacyUserAddressRows(rows: any[]): Promise<UserAddressSyncResult> {
    const existingRows = await db.select({ id: accountAddress.id }).from(accountAddress);
    const existingUserAddressIds = new Set(existingRows.map((row) => row.id));

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const pendingRows: LegacyUserAddressRow[] = [];
    const chunkSize = 500;

    console.log(`User address sync: starting ${rows.length} legacy AccountAddress rows`);

    async function flushChunk() {
        if (pendingRows.length === 0) {
            return;
        }

        const chunk = pendingRows.splice(0, pendingRows.length);
        await upsertAccountAddressChunk(chunk);
        console.log(
            `User address sync: upserted ${chunk.length} rows (${updated} updated, ${inserted} inserted, ${skipped} skipped so far)`,
        );
    }

    for (const row of rows) {
        const id = readLegacyAccountAddressId(row);
        const accountId = readLegacyAccountAddressAccountId(row);
        if (id == null || accountId == null) {
            skipped += 1;
            continue;
        }

        if (existingUserAddressIds.has(id)) {
            updated += 1;
        } else {
            inserted += 1;
            existingUserAddressIds.add(id);
        }

        pendingRows.push(mapLegacyAccountAddressRow(row));

        if (pendingRows.length >= chunkSize) {
            await flushChunk();
        }
    }

    await flushChunk();
    await advanceAccountAddressIdSequence();

    console.log(
        `User address sync: complete (${updated} updated, ${inserted} inserted, ${skipped} skipped, ${rows.length} fetched)`,
    );

    return {
        fetched: rows.length,
        inserted,
        updated,
        skipped,
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function processOldUserAddresses(rows: any[]): Promise<UserAddressSyncResult> {
    return syncLegacyUserAddressRows(rows);
}

export async function syncUserAddressesFromLegacy(): Promise<UserAddressSyncResult> {
    try {
        const rows = await getAccountAddressesFromSweetshopOld(0);
        console.log(`User address sync: fetched ${rows.length} legacy AccountAddress rows`);
        return syncLegacyUserAddressRows(rows);
    } catch (error) {
        console.error('Error syncing user addresses from legacy AccountAddress:', error);
        throw error instanceof Error ? error : new Error('Failed to sync user addresses from legacy AccountAddress');
    }
}
