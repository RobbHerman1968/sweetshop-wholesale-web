import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
    getMenuByIdForManage,
    getMenuItemNameMaps,
    getMenuItemsForManage,
} from '@/lib/db-pg/actions/menu';
import { getMenuUsageDescription } from '@/lib/menu-manage-utils';
import { MenuItemsContent } from './menu-items-content';

type Props = {
    params: Promise<{ menuId: string }>;
    searchParams: Promise<{ name?: string }>;
};

export default async function ManageMenuItemsPage({ params, searchParams }: Props) {
    const { menuId: menuIdParam } = await params;
    const { name: searchName = '' } = await searchParams;
    const menuId = parseInt(menuIdParam, 10);
    const menu = Number.isFinite(menuId) ? await getMenuByIdForManage(menuId) : null;

    if (!menu) {
        notFound();
    }

    const trimmedName = searchName.trim();
    const items = await getMenuItemsForManage(menuId, trimmedName || undefined);
    const { categoryNames, pageNames, categoryStats, pageStats } = await getMenuItemNameMaps(items);
    const usage = getMenuUsageDescription(menu);

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-4 overflow-hidden">
                <Link
                    href="/manage/menus"
                    className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34] underline-offset-4 hover:underline"
                >
                    ← Back to menus
                </Link>
                <div className="min-h-0 flex-1">
                    <MenuItemsContent
                        menu={menu}
                        items={items}
                        categoryNames={Object.fromEntries(categoryNames)}
                        pageNames={Object.fromEntries(pageNames)}
                        categoryStats={Object.fromEntries(categoryStats)}
                        pageStats={Object.fromEntries(pageStats)}
                        searchName={trimmedName}
                        usage={usage}
                    />
                </div>
            </div>
        </div>
    );
}
