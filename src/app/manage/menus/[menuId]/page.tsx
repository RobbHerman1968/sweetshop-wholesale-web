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
        <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex flex-wrap items-center gap-3">
                <Link href="/manage/menus" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34] underline-offset-4 hover:underline">
                    ← Back to menus
                </Link>
            </div>
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
    );
}
