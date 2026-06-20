import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMenuByIdForManage, getMenuEditLookups, getMenuItemByIdForManage, getMenuItemsForManage } from '@/lib/db-pg/actions/menu';
import { EditMenuItemContent } from './edit-menu-item-content';

type Props = {
    params: Promise<{ menuId: string; itemId: string }>;
};

export default async function ManageEditMenuItemPage({ params }: Props) {
    const { menuId: menuIdParam, itemId: itemIdParam } = await params;
    const menuId = parseInt(menuIdParam, 10);
    const itemId = parseInt(itemIdParam, 10);

    const [menu, item, allItems, lookups] = await Promise.all([
        Number.isFinite(menuId) ? getMenuByIdForManage(menuId) : null,
        Number.isFinite(itemId) ? getMenuItemByIdForManage(itemId) : null,
        Number.isFinite(menuId) ? getMenuItemsForManage(menuId) : [],
        getMenuEditLookups(),
    ]);

    if (!menu || !item || item.menuId !== menu.id) {
        notFound();
    }

    const parentOptions = allItems
        .filter((row) => row.id !== item.id)
        .map((row) => ({ id: row.id, name: row.name, parentMenuItemId: row.parentMenuItemId }));

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <div className="flex flex-wrap items-center gap-3">
                <Link
                    href={`/manage/menus/${menu.id}`}
                    className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34] underline-offset-4 hover:underline"
                >
                    ← Back to {menu.name}
                </Link>
            </div>
            <EditMenuItemContent item={item} parentOptions={parentOptions} categories={lookups.categories} pages={lookups.pages} />
        </div>
    );
}
