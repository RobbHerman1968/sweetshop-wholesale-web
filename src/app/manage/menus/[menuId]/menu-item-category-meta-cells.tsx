import type { ManageMenuItemCategoryStats, ManageMenuItemPageStats } from '@/lib/db-pg/actions/menu';

function LinkStatusBadge({ isActive }: { isActive: boolean }) {
    return isActive ? (
        <span className="rounded bg-emerald-500 px-1.5 py-0.5 text-[10px] uppercase text-white">Active</span>
    ) : (
        <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] uppercase text-white">Inactive</span>
    );
}

type MenuItemLinkMetaCellsProps = {
    categoryId: number | null;
    pageId: number | null;
    categoryStats: Record<number, ManageMenuItemCategoryStats>;
    pageStats: Record<number, ManageMenuItemPageStats>;
};

export function MenuItemLinkMetaCells({ categoryId, pageId, categoryStats, pageStats }: MenuItemLinkMetaCellsProps) {
    const category = categoryId != null && categoryId > 0 ? categoryStats[categoryId] : undefined;
    const page = pageId != null && pageId > 0 ? pageStats[pageId] : undefined;
    const linkStats = category ?? page;

    return (
        <>
            <td className="px-4 py-1.5 text-center">{linkStats ? <LinkStatusBadge isActive={linkStats.isActive} /> : '—'}</td>
            <td className="px-4 py-1.5 text-center tabular-nums">{category ? category.activeProductCount : '—'}</td>
        </>
    );
}

export const menuItemLinkMetaHeaders = (
    <>
        <th className="px-4 py-2 text-center">Link status</th>
        <th className="px-4 py-2 text-center">Active products</th>
    </>
);
