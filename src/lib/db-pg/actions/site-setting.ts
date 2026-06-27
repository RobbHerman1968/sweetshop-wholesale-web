'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db-pg';
import { siteSetting } from '@/lib/drizzle/schema';
import { asc, eq } from 'drizzle-orm';

export type SiteSettingRow = {
    id: number;
    name: string;
    value: number;
};

type FormResult = { ok: true } | { ok: false; error: string };

function mapSiteSettingRow(row: {
    id: number;
    name: string | null;
    value: string | null;
}): SiteSettingRow {
    return {
        id: row.id,
        name: row.name?.trim() || '',
        value: Number(row.value ?? 0),
    };
}

function revalidateSiteSettingPaths() {
    revalidatePath('/manage/site-settings');
}

function parseSettingValue(value: FormDataEntryValue | null): number | null {
    const raw = String(value ?? '').trim();
    if (!raw) return null;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return null;
    return Math.round(parsed * 100) / 100;
}

export async function getSiteSettingsFromDB(): Promise<SiteSettingRow[]> {
    const rows = await db
        .select({
            id: siteSetting.id,
            name: siteSetting.name,
            value: siteSetting.value,
        })
        .from(siteSetting)
        .orderBy(asc(siteSetting.name));

    return rows.map(mapSiteSettingRow);
}

export async function getSiteSettingByIdForManage(id: number): Promise<SiteSettingRow | null> {
    if (!Number.isFinite(id) || id <= 0) return null;

    const [row] = await db
        .select({
            id: siteSetting.id,
            name: siteSetting.name,
            value: siteSetting.value,
        })
        .from(siteSetting)
        .where(eq(siteSetting.id, id))
        .limit(1);

    return row ? mapSiteSettingRow(row) : null;
}

export async function updateSiteSettingValueFromForm(formData: FormData): Promise<FormResult> {
    const id = Number(formData.get('id'));
    if (!Number.isFinite(id) || id <= 0) {
        return { ok: false, error: 'Invalid site setting.' };
    }

    const existing = await getSiteSettingByIdForManage(id);
    if (!existing) {
        return { ok: false, error: 'Site setting not found.' };
    }

    const value = parseSettingValue(formData.get('value'));
    if (value == null) {
        return { ok: false, error: 'Enter a valid numeric value.' };
    }

    await db
        .update(siteSetting)
        .set({
            value: value.toFixed(2),
        })
        .where(eq(siteSetting.id, id));

    revalidateSiteSettingPaths();
    return { ok: true };
}
