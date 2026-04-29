'use server';

import { put } from '@vercel/blob';
import { db } from '@/lib/db-pg';
import { asc, eq, ilike, sql } from 'drizzle-orm';
import { productImage, productImageNew, vercelImage, xrefImage } from '@/lib/drizzle/schema';
import { VercelImage } from '@/lib/db-pg/server';

import { xrefImageMapper } from '../mappers/image-mapper';
import { XrefImage } from '../entities/xrefImage-entity';
import { vercelImageMapper } from '../mappers/image-mapper';

export async function getPaginatedImagesFromDB({ page = 1, limit = 100, name }: { page?: number; limit?: number; name?: string }) {
    const offset = (page - 1) * limit;
    const whereClause = name ? ilike(vercelImage.imageName, `%${name}%`) : undefined;

    const data = await db
        .select({ id: vercelImage.id, name: vercelImage.name, imageName: vercelImage.imageName, path: vercelImage.path })
        .from(vercelImage)
        .where(whereClause)
        .orderBy(asc(vercelImage.id))
        .limit(limit)
        .offset(offset);

    const [{ count: total }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(vercelImage)
        .where(whereClause);

    return {
        data,
        pagination: {
            total: Number(total),
            page,
            limit,
            totalPages: Math.ceil(Number(total) / limit) || 1,
        },
    };
}

export async function getImages(limit: number, offset: number, name: string) {
    const nameFilter = '%' + name + '%';

    const images = await db
        .select({ id: vercelImage.id, name: vercelImage.name, path: vercelImage.path, friendlyName: vercelImage.imageName })
        .from(vercelImage)
        .where(ilike(vercelImage.name, '%' + nameFilter + '%'))
        .orderBy((x) => x.name)
        .limit(limit)
        .offset(offset);

    const out: VercelImage[] = [];
    images?.map(async (p) => {
        out.push(await vercelImageMapper(p));
    });
    return out;
}

export async function insertVercelImage(name: string, path: string) {
    await db.insert(vercelImage).values({
        imageName: name.slice(0, 100),
        path: path,
    });
}

const VERCEL_IMAGE_NAME_MAX = 100;

/** Safe path segment for Vercel Blob URLs only — not used for `imageName` in the database. */
function sanitizeBlobName(name: string): string {
    return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, VERCEL_IMAGE_NAME_MAX) || 'image';
}

/** Exact library name: trim and cap at DB length (no character substitution). */
function exactImageNameForDb(raw: string): string {
    const t = (raw ?? '').trim();
    return t.slice(0, VERCEL_IMAGE_NAME_MAX) || 'image';
}

/**
 * All lowercased `imageName` keys that should match one pasted file (stem, basename, spaces vs underscores, sanitized variants).
 * Covers e.g. DB `my_photo` with paste `my photo.jpg`, DB `my photo` with paste `my_photo.jpg`, and rows that stored the full `*.jpg` name.
 */
function expandImageNameMatchKeys(stem: string, basename: string): string[] {
    const s = stem.trim();
    const b = basename.trim();
    const keys = new Set<string>();
    const add = (x: string) => {
        const t = x.trim();
        if (t) keys.add(t.toLowerCase());
    };
    add(s);
    add(b);
    add(sanitizeBlobName(s));
    add(sanitizeBlobName(b));
    if (s.includes('_')) add(s.replace(/_/g, ' '));
    if (/\s/.test(s)) add(s.replace(/\s+/g, '_'));
    return [...keys];
}

function rowsMatchingStemForApply(
    stem: string,
    basename: string,
    byLowerImageName: Map<string, { id: number; imageName: string }[]>,
): { id: number; imageName: string }[] {
    const byId = new Map<number, { id: number; imageName: string }>();
    for (const key of expandImageNameMatchKeys(stem, basename)) {
        for (const r of byLowerImageName.get(key) ?? []) {
            byId.set(r.id, r);
        }
    }
    return [...byId.values()];
}

/** True if the library already stores this imageName (case-insensitive; matches insert/update behavior). */
async function vercelImageNameTaken(imageName: string): Promise<boolean> {
    const key = imageName.toLowerCase();
    const [row] = await db
        .select({ id: vercelImage.id })
        .from(vercelImage)
        .where(sql`lower(${vercelImage.imageName}) = ${key}`)
        .limit(1);
    return row != null;
}

export type UploadImageResult = { success: true; url: string } | { success: false; error: string };

export async function uploadImageToVercelBlob(formData: FormData): Promise<UploadImageResult> {
    const file = formData.get('file') as File | null;
    if (!file || !(file instanceof File) || file.size === 0) {
        return { success: false, error: 'Please select an image file.' };
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        return { success: false, error: 'Invalid file type. Use JPEG, PNG, GIF, or WebP.' };
    }
    const customName = (formData.get('name') as string)?.trim();
    const baseName = customName || file.name || 'image';
    const nameForDb = exactImageNameForDb(baseName);
    if (await vercelImageNameTaken(nameForDb)) {
        return {
            success: false,
            error: `The library already has an image with this name ("${nameForDb}"). Rename it or pick a different file before uploading.`,
        };
    }
    const pathname = `images/${Date.now()}-${sanitizeBlobName(file.name || 'image')}`;

    try {
        const blob = await put(pathname, file, { access: 'public' });
        await insertVercelImage(nameForDb, blob.url);
        return { success: true, url: blob.url };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed.';
        return { success: false, error: message };
    }
}

export async function updateVercelImage(id: number, name: string, path: string) {
    await db
        .update(vercelImage)
        .set({
            name: name.toLowerCase(),
            path: path,
        })
        .where(eq(vercelImage.id, id));
}

function normalizedVercelImageNameFields(name: string) {
    const trimmed = (name ?? '').trim();
    const imageName = exactImageNameForDb(trimmed);
    return { name: trimmed || null, imageName } as const;
}

export async function updateVercelImageName(id: number, name: string) {
    const { name: n, imageName } = normalizedVercelImageNameFields(name);
    await db
        .update(vercelImage)
        .set({
            name: n,
            imageName,
        })
        .where(eq(vercelImage.id, id));
}

/** Same persistence as {@link updateVercelImageName}, applied sequentially (Neon HTTP has no transactions). */
export async function updateVercelImageNamesBulk(updates: { id: number; name: string }[]) {
    if (updates.length === 0) return;
    for (const { id, name } of updates) {
        const { name: n, imageName } = normalizedVercelImageNameFields(name);
        await db
            .update(vercelImage)
            .set({
                name: n,
                imageName,
            })
            .where(eq(vercelImage.id, id));
    }
}

function basenameFromLine(line: string): string {
    const t = line.trim();
    if (!t) return '';
    return t.replace(/^.*[/\\]/, '');
}

/** Stem used when uploading with “display name” = file name minus last extension (see add-image dialog). */
function stemForLibraryMatch(basename: string): string {
    const i = basename.lastIndexOf('.');
    if (i <= 0) return basename;
    return basename.slice(0, i);
}

export type ApplyFilenameListResult = {
    updated: { id: number; previousImageName: string; newImageName: string }[];
    unmatchedLines: string[];
    ambiguousLines: string[];
    duplicateStemInPaste: string[];
    conflicts: { line: string; message: string }[];
    skippedUnchanged: number;
};

const MIN_ID_FOR_FILENAME_LIST_APPLY = 2000;

/**
 * Paste one filename per line (paths OK). `imageName` is set to the exact basename (trimmed, max 100 chars), not URL-sanitized.
 * Only rows with id greater than {@link MIN_ID_FOR_FILENAME_LIST_APPLY} are matched or updated; older library rows are ignored for matching.
 * Rows match when stored `imageName` equals any of: exact stem, stem with spaces vs underscores swapped, sanitized stem/basename, or full basename (case-insensitive), so e.g. `my_photo`, `my_photo.jpg`, and `my photo.jpg` can match the same row.
 * Target names must not duplicate any row in the library (including older ids), case-insensitive.
 */
export async function applyVercelImageNamesFromFilenameList(text: string): Promise<ApplyFilenameListResult> {
    const rawLines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const duplicateStemInPaste: string[] = [];
    type StemEntry = { desiredFull: string; line: string };
    const stemKeyState = new Map<string, StemEntry | 'conflict'>();

    for (const line of rawLines) {
        const basename = basenameFromLine(line);
        if (!basename) continue;
        const stem = stemForLibraryMatch(basename);
        /** One bucket per logical stem so `my_photo.jpg` and `my photo.jpg` conflict as the same image. */
        const stemKey = sanitizeBlobName(stem.trim()).toLowerCase();
        const desiredFull = exactImageNameForDb(basename);
        const state = stemKeyState.get(stemKey);
        if (state === 'conflict') continue;
        if (!state) {
            stemKeyState.set(stemKey, { desiredFull, line });
            continue;
        }
        if (state.desiredFull !== desiredFull) {
            duplicateStemInPaste.push(state.line, line);
            stemKeyState.set(stemKey, 'conflict');
        }
    }

    const stemKeyToLine = new Map<string, { line: string; desiredFull: string }>();
    for (const [stemKey, state] of stemKeyState) {
        if (state !== 'conflict') stemKeyToLine.set(stemKey, { line: state.line, desiredFull: state.desiredFull });
    }

    const allRows = await db.select({ id: vercelImage.id, imageName: vercelImage.imageName }).from(vercelImage);
    const byLowerImageName = new Map<string, { id: number; imageName: string }[]>();
    for (const r of allRows) {
        const k = r.imageName.toLowerCase();
        let list = byLowerImageName.get(k);
        if (!list) {
            list = [];
            byLowerImageName.set(k, list);
        }
        list.push(r);
    }

    const unmatchedLines: string[] = [];
    const ambiguousLines: string[] = [];
    const conflicts: { line: string; message: string }[] = [];
    let skippedUnchanged = 0;
    const toApply: { id: number; newName: string; line: string; previousImageName: string }[] = [];

    for (const { line, desiredFull } of stemKeyToLine.values()) {
        const basename = basenameFromLine(line);
        const stem = stemForLibraryMatch(basename);
        const rows = rowsMatchingStemForApply(stem, basename, byLowerImageName).filter((r) => r.id > MIN_ID_FOR_FILENAME_LIST_APPLY);

        if (rows.length === 0) {
            unmatchedLines.push(line);
            continue;
        }
        if (rows.length > 1) {
            ambiguousLines.push(line);
            continue;
        }

        const row = rows[0]!;
        if (row.imageName === desiredFull) {
            skippedUnchanged += 1;
            continue;
        }

        const taken = byLowerImageName.get(desiredFull.toLowerCase()) ?? [];
        const other = taken.find((x) => x.id !== row.id);
        if (other) {
            conflicts.push({ line, message: `Another library image already uses the name "${desiredFull}".` });
            continue;
        }

        toApply.push({ id: row.id, newName: desiredFull, line, previousImageName: row.imageName });
    }

    const claimedNewLower = new Map<string, number>();
    const toApplyDeduped: typeof toApply = [];
    for (const t of toApply) {
        const k = t.newName.toLowerCase();
        const existingId = claimedNewLower.get(k);
        if (existingId !== undefined && existingId !== t.id) {
            conflicts.push({
                line: t.line,
                message: `More than one line in this paste maps to the same target name "${t.newName}".`,
            });
            continue;
        }
        claimedNewLower.set(k, t.id);
        toApplyDeduped.push(t);
    }

    const updated: ApplyFilenameListResult['updated'] = [];
    for (const { id, newName, previousImageName } of toApplyDeduped) {
        const { name: n, imageName } = normalizedVercelImageNameFields(newName);
        await db
            .update(vercelImage)
            .set({ name: n, imageName })
            .where(eq(vercelImage.id, id));
        updated.push({ id, previousImageName, newImageName: imageName });
    }

    return {
        updated,
        unmatchedLines,
        ambiguousLines,
        duplicateStemInPaste: [...new Set(duplicateStemInPaste)],
        conflicts,
        skippedUnchanged,
    };
}

export async function getAllVercelImages() {
    const data = await db.query.vercelImage.findMany({
        orderBy: asc(vercelImage.name),
    });

    const out: VercelImage[] = [];
    for (const image of data) {
        out.push(await vercelImageMapper(image));
    }
    return out;
}

export async function searchForImagesByKeyword(keyword: string) {
    const images = await db.query.vercelImage.findMany({
        where: (image) => ilike(image.name, `%${keyword}%`),
    });
    return images;
}

export async function getAllXrefImages() {
    const images = await db.query.xrefImage.findMany({
        orderBy: asc(xrefImage.imageName),
    });

    const out: XrefImage[] = [];
    for (const image of images) {
        out.push(await xrefImageMapper(image));
    }
    return out;
}

export async function insertProductImageNew(productId: number, vercelImageId: number) {
    await db.insert(productImage).values({
        productId: productId,
        vercelImageId: vercelImageId,
    });
}

export type DeleteImageResult = { success: true } | { success: false; error: string };

export async function deleteVercelImageIfUnused(vercelImageId: number): Promise<DeleteImageResult> {
    const [usedByProduct] = await db.select({ id: productImage.id }).from(productImage).where(eq(productImage.vercelImageId, vercelImageId)).limit(1);
    if (usedByProduct) {
        return { success: false, error: 'This image is used by a product and cannot be deleted.' };
    }

    const [usedByProductNew] = await db.select({ id: productImageNew.id }).from(productImageNew).where(eq(productImageNew.vercelImageId, vercelImageId)).limit(1);
    if (usedByProductNew) {
        return { success: false, error: 'This image is used by a product and cannot be deleted.' };
    }

    await db.delete(vercelImage).where(eq(vercelImage.id, vercelImageId));
    return { success: true };
}
