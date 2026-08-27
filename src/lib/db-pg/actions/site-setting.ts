'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db-pg';
import { siteSetting } from '@/lib/drizzle/schema';
import { asc, eq } from 'drizzle-orm';
import {
    parseEmailList,
    normalizeEmailFromInput,
    normalizeEmailListInput,
    normalizeSingleEmailInput,
} from '@/lib/site-setting-email-list';
import {
    siteSettingKind,
    NOTIFY_ACCOUNTMATE_FAILURE_SETTING_ID,
    SEND_EMAIL_FROM_SETTING_ID,
    DEVELOPER_EMAIL_SETTING_ID,
    SALES_ORDER_EMAIL_SETTING_ID,
    APPLY_NOW_EMAIL_SETTING_ID,
    type SiteSettingKind,
} from '@/lib/site-setting-constants';

export type SiteSettingRow = {
    id: number;
    name: string;
    value: number;
    textValue: string | null;
    kind: SiteSettingKind;
};

type FormResult = { ok: true } | { ok: false; error: string };

type SiteSettingDbRow = {
    id: number;
    name: string | null;
    value: string | null;
    textValue: string | null;
};

const TEXT_VALUE_MIGRATION_HINT =
    'Apply src/lib/drizzle/0013_site_setting_text_value.sql to add the textValue column.';

function isMissingTextValueColumnError(err: unknown): boolean {
    const messages: string[] = [];
    if (err instanceof Error) {
        messages.push(err.message);
    }
    if (err && typeof err === 'object' && 'cause' in err) {
        const cause = (err as { cause?: unknown }).cause;
        if (cause instanceof Error) {
            messages.push(cause.message);
        } else if (cause != null) {
            messages.push(String(cause));
        }
    }

    return messages.some((message) => message.includes('"textValue"') && message.includes('does not exist'));
}

function mapSiteSettingRow(row: SiteSettingDbRow): SiteSettingRow {
    return {
        id: row.id,
        name: row.name?.trim() || '',
        value: Number(row.value ?? 0),
        textValue: row.textValue?.trim() || null,
        kind: siteSettingKind(row.id),
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

async function selectSiteSettingsRows(): Promise<SiteSettingDbRow[]> {
    try {
        return await db
            .select({
                id: siteSetting.id,
                name: siteSetting.name,
                value: siteSetting.value,
                textValue: siteSetting.textValue,
            })
            .from(siteSetting)
            .orderBy(asc(siteSetting.id));
    } catch (err) {
        if (!isMissingTextValueColumnError(err)) {
            throw err;
        }

        const rows = await db
            .select({
                id: siteSetting.id,
                name: siteSetting.name,
                value: siteSetting.value,
            })
            .from(siteSetting)
            .orderBy(asc(siteSetting.id));

        return rows.map((row) => ({ ...row, textValue: null }));
    }
}

async function selectSiteSettingRowById(id: number): Promise<SiteSettingDbRow | null> {
    try {
        const [row] = await db
            .select({
                id: siteSetting.id,
                name: siteSetting.name,
                value: siteSetting.value,
                textValue: siteSetting.textValue,
            })
            .from(siteSetting)
            .where(eq(siteSetting.id, id))
            .limit(1);

        return row ?? null;
    } catch (err) {
        if (!isMissingTextValueColumnError(err)) {
            throw err;
        }

        const [row] = await db
            .select({
                id: siteSetting.id,
                name: siteSetting.name,
                value: siteSetting.value,
            })
            .from(siteSetting)
            .where(eq(siteSetting.id, id))
            .limit(1);

        return row ? { ...row, textValue: null } : null;
    }
}

export async function getSiteSettingsFromDB(): Promise<SiteSettingRow[]> {
    const rows = await selectSiteSettingsRows();
    return rows.map(mapSiteSettingRow);
}

export async function getSiteSettingByIdForManage(id: number): Promise<SiteSettingRow | null> {
    if (!Number.isFinite(id) || id <= 0) return null;

    const row = await selectSiteSettingRowById(id);
    return row ? mapSiteSettingRow(row) : null;
}

export async function getNotifyAccountMateFailureEmails(): Promise<string[]> {
    const setting = await getSiteSettingByIdForManage(NOTIFY_ACCOUNTMATE_FAILURE_SETTING_ID);
    return parseEmailList(setting?.textValue);
}

export async function getSendEmailFromAddress(): Promise<string | null> {
    const setting = await getSiteSettingByIdForManage(SEND_EMAIL_FROM_SETTING_ID);
    const email = setting?.textValue?.trim();
    return email || null;
}

export async function getDeveloperEmailAddress(): Promise<string | null> {
    const setting = await getSiteSettingByIdForManage(DEVELOPER_EMAIL_SETTING_ID);
    const email = setting?.textValue?.trim();
    return email || null;
}

export async function getCopyOrderEmailAddress(): Promise<string | null> {
    return getSalesOrderEmailAddress();
}

export async function getSalesOrderEmailAddress(): Promise<string | null> {
    const setting = await getSiteSettingByIdForManage(SALES_ORDER_EMAIL_SETTING_ID);
    const email = setting?.textValue?.trim();
    return email || null;
}

export async function getApplyNowEmailAddress(): Promise<string | null> {
    const setting = await getSiteSettingByIdForManage(APPLY_NOW_EMAIL_SETTING_ID);
    const email = setting?.textValue?.trim();
    return email || null;
}

async function updateSiteSettingTextValue(id: number, textValue: string | null): Promise<FormResult> {
    try {
        await db
            .update(siteSetting)
            .set({
                textValue,
            })
            .where(eq(siteSetting.id, id));
    } catch (err) {
        if (isMissingTextValueColumnError(err)) {
            return { ok: false, error: TEXT_VALUE_MIGRATION_HINT };
        }
        throw err;
    }

    revalidateSiteSettingPaths();
    return { ok: true };
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

    if (existing.kind === 'emailList') {
        const normalized = normalizeEmailListInput(String(formData.get('textValue') ?? ''));
        if (!normalized.ok) {
            return normalized;
        }

        return updateSiteSettingTextValue(id, normalized.value || null);
    }

    if (existing.kind === 'email') {
        const raw = String(formData.get('textValue') ?? '');
        const normalized =
            id === SEND_EMAIL_FROM_SETTING_ID ? normalizeEmailFromInput(raw) : normalizeSingleEmailInput(raw);
        if (!normalized.ok) {
            return normalized;
        }

        return updateSiteSettingTextValue(id, normalized.value || null);
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
