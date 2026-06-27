'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db-pg';
import { stateShippingTaxRate } from '@/lib/drizzle/schema';
import { lookupUsStateName, normalizeStateAbbr } from '@/lib/us-state-names';
import { asc, eq, ilike, sql } from 'drizzle-orm';

export type StateShippingTaxRateRow = {
    id: number;
    stateAbbr: string;
    stateName: string;
    shippingRate: number;
    taxRate: number;
};

type FormResult = { ok: true } | { ok: false; error: string };

function mapStateShippingTaxRateRow(row: {
    id: number;
    stateAbbr: string | null;
    stateName: string | null;
    shippingRate: string | null;
    taxRate: string | null;
}): StateShippingTaxRateRow {
    return {
        id: row.id,
        stateAbbr: row.stateAbbr?.trim() || '',
        stateName: row.stateName?.trim() || '',
        shippingRate: Number(row.shippingRate ?? 0),
        taxRate: Number(row.taxRate ?? 0),
    };
}

function revalidateStateRatePaths(id?: number) {
    revalidatePath('/manage/state-shipping-tax-rates');
    if (id != null) {
        revalidatePath(`/manage/state-shipping-tax-rates/${id}`);
    }
}

function parseShippingRate(value: FormDataEntryValue | null): number | null {
    const raw = String(value ?? '').trim();
    if (!raw) return null;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) return null;
    return Math.round(parsed * 100) / 100;
}

function parseTaxRatePercent(value: FormDataEntryValue | null): number | null {
    const raw = String(value ?? '').trim();
    if (!raw) return null;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) return null;
    return Math.round((parsed / 100) * 10000) / 10000;
}

function parseStateShippingTaxRateForm(formData: FormData) {
    const stateAbbr = normalizeStateAbbr(String(formData.get('stateAbbr') ?? ''));
    let stateName = String(formData.get('stateName') ?? '').trim();
    const shippingRate = parseShippingRate(formData.get('shippingRate'));
    const taxRate = parseTaxRatePercent(formData.get('taxRatePercent'));

    if (!/^[A-Z]{2}$/.test(stateAbbr)) {
        return { ok: false as const, error: 'State abbreviation must be exactly 2 letters.' };
    }

    if (!stateName) {
        stateName = lookupUsStateName(stateAbbr) ?? '';
    }

    if (!stateName) {
        return { ok: false as const, error: 'State name is required.' };
    }

    if (shippingRate == null) {
        return { ok: false as const, error: 'Enter a valid shipping rate of zero or greater.' };
    }

    if (taxRate == null) {
        return { ok: false as const, error: 'Enter a valid tax rate percentage of zero or greater.' };
    }

    return {
        ok: true as const,
        values: {
            stateAbbr,
            stateName,
            shippingRate,
            taxRate,
        },
    };
}

async function findDuplicateStateAbbr(stateAbbr: string, excludeId?: number) {
    const [row] = await db
        .select({ id: stateShippingTaxRate.id })
        .from(stateShippingTaxRate)
        .where(
            excludeId != null
                ? sql`upper(trim(${stateShippingTaxRate.stateAbbr})) = ${stateAbbr} and ${stateShippingTaxRate.id} <> ${excludeId}`
                : sql`upper(trim(${stateShippingTaxRate.stateAbbr})) = ${stateAbbr}`,
        )
        .limit(1);

    return row ?? null;
}

export async function getStateShippingTaxRatesFromDB(options?: {
    stateAbbr?: string;
}): Promise<StateShippingTaxRateRow[]> {
    const stateAbbr = options?.stateAbbr?.trim();

    const rows = await db
        .select({
            id: stateShippingTaxRate.id,
            stateAbbr: stateShippingTaxRate.stateAbbr,
            stateName: stateShippingTaxRate.stateName,
            shippingRate: stateShippingTaxRate.shippingRate,
            taxRate: stateShippingTaxRate.taxRate,
        })
        .from(stateShippingTaxRate)
        .where(stateAbbr ? ilike(stateShippingTaxRate.stateAbbr, `%${stateAbbr}%`) : undefined)
        .orderBy(asc(stateShippingTaxRate.stateAbbr));

    return rows.map(mapStateShippingTaxRateRow);
}

export async function getStateShippingTaxRateByIdForManage(id: number): Promise<StateShippingTaxRateRow | null> {
    if (!Number.isFinite(id) || id <= 0) return null;

    const [row] = await db
        .select({
            id: stateShippingTaxRate.id,
            stateAbbr: stateShippingTaxRate.stateAbbr,
            stateName: stateShippingTaxRate.stateName,
            shippingRate: stateShippingTaxRate.shippingRate,
            taxRate: stateShippingTaxRate.taxRate,
        })
        .from(stateShippingTaxRate)
        .where(eq(stateShippingTaxRate.id, id))
        .limit(1);

    return row ? mapStateShippingTaxRateRow(row) : null;
}

export async function createStateShippingTaxRateFromForm(formData: FormData): Promise<FormResult> {
    const parsed = parseStateShippingTaxRateForm(formData);
    if (!parsed.ok) return parsed;

    const duplicate = await findDuplicateStateAbbr(parsed.values.stateAbbr);
    if (duplicate) {
        return { ok: false, error: 'A rate for that state abbreviation already exists.' };
    }

    const [created] = await db
        .insert(stateShippingTaxRate)
        .values({
            stateAbbr: parsed.values.stateAbbr,
            stateName: parsed.values.stateName,
            shippingRate: parsed.values.shippingRate.toFixed(2),
            taxRate: parsed.values.taxRate.toFixed(4),
        })
        .returning({ id: stateShippingTaxRate.id });

    revalidateStateRatePaths(created.id);
    redirect(`/manage/state-shipping-tax-rates/${created.id}`);
}

export async function updateStateShippingTaxRateFromForm(formData: FormData): Promise<FormResult> {
    const id = Number(formData.get('id'));
    if (!Number.isFinite(id) || id <= 0) {
        return { ok: false, error: 'Invalid state rate.' };
    }

    const existing = await getStateShippingTaxRateByIdForManage(id);
    if (!existing) {
        return { ok: false, error: 'State rate not found.' };
    }

    const parsed = parseStateShippingTaxRateForm(formData);
    if (!parsed.ok) return parsed;

    const duplicate = await findDuplicateStateAbbr(parsed.values.stateAbbr, id);
    if (duplicate) {
        return { ok: false, error: 'A rate for that state abbreviation already exists.' };
    }

    await db
        .update(stateShippingTaxRate)
        .set({
            stateAbbr: parsed.values.stateAbbr,
            stateName: parsed.values.stateName,
            shippingRate: parsed.values.shippingRate.toFixed(2),
            taxRate: parsed.values.taxRate.toFixed(4),
        })
        .where(eq(stateShippingTaxRate.id, id));

    revalidateStateRatePaths(id);
    return { ok: true };
}
