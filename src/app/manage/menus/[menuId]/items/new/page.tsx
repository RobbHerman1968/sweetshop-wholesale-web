import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMenuByIdForManage, getMenuEditLookups } from '@/lib/db-pg/actions/menu';
import { AddMenuItemContent } from './add-menu-item-content';

type Props = {
    params: Promise<{ menuId: string }>;
};

export default async function ManageNewMenuItemPage({ params }: Props) {
    const { menuId: menuIdParam } = await params;
    const menuId = parseInt(menuIdParam, 10);
    const menu = Number.isFinite(menuId) ? await getMenuByIdForManage(menuId) : null;

    if (!menu) {
        notFound();
    }

    const lookups = await getMenuEditLookups();

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
            <AddMenuItemContent menu={menu} categories={lookups.categories} pages={lookups.pages} />
        </div>
    );
}
