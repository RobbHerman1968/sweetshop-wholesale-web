import type { ManageMenuItemCategoryStats } from '@/lib/db-pg/actions/menu';

type MenuItemCategoryMetaCellsProps = {
    categoryId: number | null;
    categoryStats: Record<number, ManageMenuItemCategoryStats>;
};

export function MenuItemCategoryMetaCells({ categoryId, categoryStats }: MenuItemCategoryMetaCellsProps) {
    const stats = categoryId != null && categoryId > 0 ? categoryStats[categoryId] : undefined;

    return (
        <>
            <td className="px-4 py-1.5 text-center">
                {stats ? (
                    stats.isActive ? (
                        <span className="rounded bg-emerald-500 px-1.5 py-0.5 text-[10px] uppercase text-white">Active</span>
                    ) : (
                        <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] uppercase text-white">Inactive</span>
                    )
                ) : (
                    '—'
                )}
            </td>
            <td className="px-4 py-1.5 text-center tabular-nums">{stats ? stats.activeProductCount : '—'}</td>
        </>
    );
}

export const menuItemCategoryMetaHeaders = (
    <>
        <th className="px-4 py-2 text-center">Category status</th>
        <th className="px-4 py-2 text-center">Active products</th>
    </>
);
