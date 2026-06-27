'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db-pg';
import { menu, menuItem } from '@/lib/drizzle/schema';
import { and, eq, sql } from 'drizzle-orm';
import { getMenuByIdForManage, getMenuItemByIdForManage, getMenuItemsForManage } from '@/lib/db-pg/actions/menu';
import { getNextMenuItemPlacement } from '@/lib/menu-item-reorder';
import type { MenuItemReorderUpdate } from '@/lib/menu-item-reorder';

type FormResult = { ok: true } | { ok: false; error: string };

async function syncMenuItemIdSequence() {
    await db.execute(sql`
        SELECT setval(
            pg_get_serial_sequence('"menuItem"', 'id'),
            (SELECT COALESCE(MAX(id), 0) FROM "menuItem")
        )
    `);
}

async function syncMenuIdSequence() {
    await db.execute(sql`
        SELECT setval(
            pg_get_serial_sequence('"menu"', 'id'),
            (SELECT COALESCE(MAX(id), 0) FROM "menu")
        )
    `);
}

export async function createMenuFromForm(formData: FormData): Promise<FormResult> {
    const name = (formData.get('name') as string)?.trim();
    if (!name) {
        return { ok: false, error: 'Menu name is required.' };
    }

    const description = (formData.get('description') as string)?.trim() || null;
    const isShopping = parseIsShopping(formData);

    try {
        await syncMenuIdSequence();

        const [created] = await db
            .insert(menu)
            .values({
                name,
                description,
                isShopping,
            })
            .returning({ id: menu.id });

        revalidatePath('/manage/menus');
        if (isShopping) {
            revalidatePath('/shop', 'layout');
        }
        redirect(`/manage/menus/${created.id}`);
    } catch (err) {
        if (typeof err === 'object' && err != null && 'digest' in err) {
            const digest = String((err as { digest?: string }).digest ?? '');
            if (digest.startsWith('NEXT_REDIRECT')) {
                throw err;
            }
        }
        console.error('[createMenuFromForm]', err);
        return {
            ok: false,
            error: err instanceof Error ? err.message : 'Failed to create menu.',
        };
    }
}

export async function updateMenuFromForm(formData: FormData): Promise<FormResult> {
    const menuId = Number(formData.get('menuId'));
    if (!Number.isFinite(menuId) || menuId <= 0) {
        return { ok: false, error: 'Invalid menu.' };
    }

    const name = (formData.get('name') as string)?.trim();
    if (!name) {
        return { ok: false, error: 'Menu name is required.' };
    }

    const description = (formData.get('description') as string)?.trim() || null;
    const isShopping = parseIsShopping(formData);

    try {
        const updated = await db
            .update(menu)
            .set({
                name,
                description,
                isShopping,
            })
            .where(eq(menu.id, menuId))
            .returning({ id: menu.id });

        if (updated.length === 0) {
            return { ok: false, error: 'Menu not found.' };
        }

        revalidatePath('/manage/menus');
        revalidatePath(`/manage/menus/${menuId}`);
        revalidatePath(`/manage/menus/${menuId}/edit`);
        if (isShopping) {
            revalidatePath('/shop', 'layout');
        }
        redirect(`/manage/menus/${menuId}`);
    } catch (err) {
        if (typeof err === 'object' && err != null && 'digest' in err) {
            const digest = String((err as { digest?: string }).digest ?? '');
            if (digest.startsWith('NEXT_REDIRECT')) {
                throw err;
            }
        }
        console.error('[updateMenuFromForm]', err);
        return {
            ok: false,
            error: err instanceof Error ? err.message : 'Failed to update menu.',
        };
    }
}

function parseOptionalId(value: FormDataEntryValue | null): number | null {
    if (value == null || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseIsActive(formData: FormData): boolean {
    const values = formData.getAll('isActive');
    return values.includes('true') || values.includes('on');
}

function parseIsShopping(formData: FormData): boolean {
    const values = formData.getAll('isShopping');
    return values.includes('true') || values.includes('on');
}

function parseMenuItemLinkFields(formData: FormData, linkType: string) {
    let categoryId: number | null = null;
    let pageId: number | null = null;
    let externalUrl: string | null = null;

    if (linkType === 'category') {
        categoryId = parseOptionalId(formData.get('categoryId'));
    } else if (linkType === 'page') {
        pageId = parseOptionalId(formData.get('pageId'));
    } else if (linkType === 'external') {
        externalUrl = (formData.get('externalUrl') as string)?.trim() || null;
    }

    return { categoryId, pageId, externalUrl };
}

export async function createMenuItemFromForm(formData: FormData): Promise<FormResult> {
    const menuId = Number(formData.get('menuId'));
    if (!Number.isFinite(menuId) || menuId <= 0) {
        return { ok: false, error: 'Invalid menu.' };
    }

    const menu = await getMenuByIdForManage(menuId);
    if (!menu) {
        return { ok: false, error: 'Menu not found.' };
    }

    const name = (formData.get('name') as string)?.trim();
    if (!name) {
        return { ok: false, error: 'Menu item label is required.' };
    }

    const existingItems = await getMenuItemsForManage(menuId);
    const placement = getNextMenuItemPlacement(existingItems, menu.isShopping);
    const isActive = parseIsActive(formData);
    const linkType = (formData.get('linkType') as string)?.trim() || 'section';
    const { categoryId, pageId, externalUrl } = parseMenuItemLinkFields(formData, linkType);

    if (linkType === 'category' && categoryId == null) {
        return { ok: false, error: 'Select a category for this menu item.' };
    }

    if (linkType === 'page' && pageId == null) {
        return { ok: false, error: 'Select a page for this menu item.' };
    }

    if (linkType === 'external' && !externalUrl) {
        return { ok: false, error: 'Enter an external URL for this menu item.' };
    }

    try {
        await syncMenuItemIdSequence();

        await db.insert(menuItem).values({
            menuId,
            name,
            parentMenuItemId: placement.parentMenuItemId,
            displayOrder: placement.displayOrder,
            isActive,
            categoryId,
            pageId,
            externalUrl,
        });
    } catch (err) {
        console.error('[createMenuItemFromForm]', err);
        return {
            ok: false,
            error: err instanceof Error ? err.message : 'Failed to create menu item.',
        };
    }

    revalidatePath('/manage/menus');
    revalidatePath(`/manage/menus/${menuId}`);
    revalidatePath('/shop');
    revalidatePath('/page');

    redirect(`/manage/menus/${menuId}`);
}

export async function updateMenuItemFromForm(formData: FormData) {
    const id = Number(formData.get('id'));
    if (!id) return;

    const existing = await getMenuItemByIdForManage(id);
    if (!existing) return;

    const name = (formData.get('name') as string)?.trim() ?? existing.name;
    const displayOrder = Number(formData.get('displayOrder')) || 0;
    const parentMenuItemId = Number(formData.get('parentMenuItemId')) || 0;
    const isActive = parseIsActive(formData);
    const linkType = (formData.get('linkType') as string)?.trim() || 'section';
    const { categoryId, pageId, externalUrl } = parseMenuItemLinkFields(formData, linkType);

    const siblingItems = await getMenuItemsForManage(existing.menuId);
    const willHaveTopLevel = siblingItems.some(
        (item) => (item.id === id ? parentMenuItemId : item.parentMenuItemId) === 0,
    );

    if (!willHaveTopLevel) {
        throw new Error('At least one top-level menu item is required.');
    }

    await db
        .update(menuItem)
        .set({
            name,
            displayOrder,
            parentMenuItemId,
            isActive,
            categoryId,
            pageId,
            externalUrl,
        })
        .where(eq(menuItem.id, id));

    revalidatePath('/manage/menus');
    revalidatePath(`/manage/menus/${existing.menuId}`);
    revalidatePath(`/manage/menus/${existing.menuId}/items/${id}`);
    revalidatePath('/shop');
    revalidatePath('/page');
}

export async function reorderMenuItems(menuId: number, updates: MenuItemReorderUpdate[]) {
    if (!Number.isFinite(menuId) || menuId <= 0 || updates.length === 0) return;

    const existingItems = await getMenuItemsForManage(menuId);
    const existingIds = new Set(existingItems.map((item) => item.id));
    const updateIds = new Set(updates.map((update) => update.id));

    if (updateIds.size !== existingIds.size || updates.some((update) => !existingIds.has(update.id))) {
        throw new Error('Menu reorder payload is out of sync with the current menu.');
    }

    const topLevelUpdates = updates.filter((update) => update.parentMenuItemId === 0);

    if (topLevelUpdates.length === 0 && updates.length > 0) {
        throw new Error('At least one top-level menu item is required.');
    }

    for (const update of updates) {
        if (update.parentMenuItemId !== 0 && !existingIds.has(update.parentMenuItemId)) {
            throw new Error('Invalid parent menu item in reorder payload.');
        }
    }

    for (const update of updates) {
        await db
            .update(menuItem)
            .set({
                parentMenuItemId: update.parentMenuItemId,
                displayOrder: update.displayOrder,
            })
            .where(and(eq(menuItem.id, update.id), eq(menuItem.menuId, menuId)));
    }

    revalidatePath('/manage/menus');
    revalidatePath(`/manage/menus/${menuId}`);
    revalidatePath('/shop');
    revalidatePath('/page');
}
