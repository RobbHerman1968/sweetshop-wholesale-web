'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { reloadOnSearchClear } from '@/lib/manage-search-clear';
import { cn } from '@/lib/utils';
import { describeMenuItemTarget } from '@/lib/menu-manage-utils';
import type { ManageMenu, ManageMenuItem, ManageMenuItemCategoryStats, ManageMenuItemPageStats } from '@/lib/db-pg/actions/menu';
import { MenuItemsSortableList } from './menu-items-sortable-list';
import { MenuItemLinkMetaCells, menuItemLinkMetaHeaders } from './menu-item-category-meta-cells';

type MenuItemsContentProps = {
    menu: ManageMenu;
    items: ManageMenuItem[];
    categoryNames: Record<number, string>;
    pageNames: Record<number, string>;
    categoryStats: Record<number, ManageMenuItemCategoryStats>;
    pageStats: Record<number, ManageMenuItemPageStats>;
    searchName: string;
    usage: string | null;
};

function buildQuery(name?: string) {
    const q = new URLSearchParams();
    if (name?.trim()) q.set('name', name.trim());
    return q.toString() ? `?${q.toString()}` : '';
}

export function MenuItemsContent({ menu, items, categoryNames, pageNames, categoryStats, pageStats, searchName, usage }: MenuItemsContentProps) {
    const router = useRouter();
    const categoryNameMap = new Map(Object.entries(categoryNames).map(([id, name]) => [Number(id), name]));
    const pageNameMap = new Map(Object.entries(pageNames).map(([id, name]) => [Number(id), name]));
    const isFiltering = searchName.trim().length > 0;

    const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const name = (form.elements.namedItem('name') as HTMLInputElement).value;
        router.push(`/manage/menus/${menu.id}${buildQuery(name)}`);
    };

    return (
        <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
            <header className="flex shrink-0 flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                    <h1 className="text-[14px] font-semibold uppercase tracking-[0.3em] text-[#6e4a34]">{menu.name}</h1>
                    {usage ? <p className="text-xs text-[#6e4a34]">{usage}</p> : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Link
                        href={`/manage/menus/${menu.id}/edit`}
                        className={cn(buttonVariants({ variant: 'outline' }), 'text-[11px]')}
                    >
                        Edit menu
                    </Link>
                    <Link href={`/manage/menus/${menu.id}/items/new`} className={cn(buttonVariants({ variant: 'sweet' }), 'text-[11px]')}>
                        Add menu item
                    </Link>
                </div>
            </header>

            <form onSubmit={handleSearch} className="flex shrink-0 flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Name</span>
                    <Input
                        name="name"
                        type="search"
                        placeholder="Search by name"
                        defaultValue={searchName}
                        className="w-48 min-w-0 sm:w-56"
                        onChange={(e) =>
                            reloadOnSearchClear(e, searchName, () => router.push(`/manage/menus/${menu.id}${buildQuery()}`))
                        }
                    />
                </label>
                <Button type="submit" variant="sweet" className="shrink-0">
                    Search
                </Button>
            </form>

            {isFiltering ? (
                <p className="shrink-0 rounded-md border border-[#c49a78] bg-[#f8eddf] px-3 py-2 text-xs text-[#6e4a34]">
                    Clear search to drag and reorder menu items.
                </p>
            ) : null}

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden pb-2.5">
                {items.length === 0 ? (
                    <div className="rounded-2xl border border-[#c49a78] bg-[#f8eddf] p-6 text-center text-xs text-[#6e4a34]">
                        <p>No menu items found.</p>
                        <Link href={`/manage/menus/${menu.id}/items/new`} className={cn(buttonVariants({ variant: 'sweet' }), 'mt-4 text-[11px]')}>
                            Add first menu item
                        </Link>
                    </div>
                ) : isFiltering ? (
                    <div className="min-h-0 flex-1 overflow-auto rounded-md border border-[#c49a78] bg-[#f8eddf]">
                        <table className="min-w-full text-left text-xs text-[#6e4a34]">
                            <thead className="sticky top-0 z-10 border-b border-[#c49a78] bg-[#e3cbb0] text-[10px] font-semibold uppercase tracking-[0.15em] text-[#4a2518]">
                                <tr>
                                    <th className="px-4 py-2">Name</th>
                                    <th className="px-4 py-2">Target</th>
                                    {menuItemLinkMetaHeaders}
                                    <th className="px-4 py-2 text-center">Order</th>
                                    <th className="px-4 py-2">Status</th>
                                    <th className="px-4 py-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item) => (
                                    <tr key={item.id} className="border-b border-[#e3cbb0]/80 last:border-b-0">
                                        <td className="px-4 py-1.5 font-semibold text-[#4a2518]">{item.name || '—'}</td>
                                        <td className="px-4 py-1.5">{describeMenuItemTarget(item, categoryNameMap, pageNameMap)}</td>
                                        <MenuItemLinkMetaCells
                                            categoryId={item.categoryId}
                                            pageId={item.pageId}
                                            categoryStats={categoryStats}
                                            pageStats={pageStats}
                                        />
                                        <td className="px-4 py-1.5 text-center tabular-nums">{item.displayOrder}</td>
                                        <td className="px-4 py-1.5">
                                            <div className="flex flex-wrap gap-1.5">
                                                {!item.isActive && (
                                                    <span className="rounded bg-[#6e4a34]/80 px-1.5 py-0.5 text-[10px] uppercase text-white">Hidden</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-1.5">
                                            <Link
                                                href={`/manage/menus/${menu.id}/items/${item.id}`}
                                                className={cn(buttonVariants({ variant: 'sweet' }), 'px-3 py-1 text-[10px] tracking-[0.15em]')}
                                            >
                                                Edit
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                        <MenuItemsSortableList
                            menu={menu}
                            items={items}
                            categoryNames={categoryNames}
                            pageNames={pageNames}
                            categoryStats={categoryStats}
                            pageStats={pageStats}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
