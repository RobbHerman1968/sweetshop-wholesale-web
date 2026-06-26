'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';

import { cleanHtmlEntitySymbols } from '@/lib/clean-html-entities';
import { db } from '@/lib/db-pg';
import { product } from '@/lib/drizzle/schema';

export type CleanProductNamesResult = {
    scanned: number;
    updated: number;
    unchanged: number;
};

export async function cleanProductNamesInDatabase(): Promise<CleanProductNamesResult> {
    try {
        const rows = await db.select({ id: product.id, name: product.name }).from(product);

        let updated = 0;
        let unchanged = 0;

        for (const row of rows) {
            if (row.name == null) {
                unchanged += 1;
                continue;
            }

            const cleanedName = cleanHtmlEntitySymbols(row.name);
            if (cleanedName === row.name) {
                unchanged += 1;
                continue;
            }

            await db.update(product).set({ name: cleanedName }).where(eq(product.id, row.id));
            updated += 1;
        }

        revalidatePath('/manage/products');
        revalidatePath('/shop');

        console.log(`Product name cleanup: ${updated} updated, ${unchanged} unchanged, ${rows.length} scanned`);

        return {
            scanned: rows.length,
            updated,
            unchanged,
        };
    } catch (error) {
        console.error('Error cleaning product names:', error);
        throw error instanceof Error ? error : new Error('Failed to clean product names');
    }
}
