'use client';

import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ManageMenu } from '@/lib/db-pg/actions/menu';

type MenusContentProps = {
    menus: ManageMenu[];
};

export function MenusContent({ menus }: MenusContentProps) {
    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex flex-nowrap items-center justify-between gap-4 overflow-x-auto">
                <div className="flex min-w-0 flex-nowrap items-baseline gap-3">
                    <h1 className="shrink-0 text-[14px] font-semibold uppercase tracking-[0.3em] text-[#6e4a34]">Manage Menus</h1>
                    <p className="truncate text-xs text-[#6e4a34]">
                        Edit navigation structure for the brand bar, shop sidebar, and page sidebar.
                    </p>
                    <span className="shrink-0 whitespace-nowrap text-xs text-[#6e4a34]">
                        · Showing {menus.length} {menus.length === 1 ? 'menu' : 'menus'}
                    </span>
                </div>
                <Link href="/manage/menus/new" className={cn(buttonVariants({ variant: 'sweet' }), 'shrink-0 text-[11px]')}>
                    Add menu
                </Link>
            </div>

            {menus.length === 0 ? (
                <div className="rounded-2xl border border-[#c49a78] bg-[#f8eddf] p-6 text-center text-xs text-[#6e4a34]">
                    <p>No menus found.</p>
                    <Link href="/manage/menus/new" className={cn(buttonVariants({ variant: 'sweet' }), 'mt-4 text-[11px]')}>
                        Add first menu
                    </Link>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-md border border-[#c49a78] bg-[#f8eddf]">
                    <table className="min-w-full border-collapse text-xs text-[#4a2518]">
                        <thead className="bg-[#e3cbb0] text-[11px] uppercase tracking-[0.16em]">
                            <tr>
                                <th className="px-3 py-2 text-left whitespace-nowrap">Name</th>
                                <th className="px-3 py-2 text-left whitespace-nowrap">Description</th>
                                <th className="px-3 py-2 text-right whitespace-nowrap">Items</th>
                                <th className="px-3 py-2 text-right whitespace-nowrap"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {menus.map((menu, idx) => {
                                const isEven = idx % 2 === 0;

                                return (
                                    <tr key={menu.id} className={isEven ? 'bg-[#fdf7ef]' : 'bg-[#f8eddf]'}>
                                        <td className="px-3 py-2 align-middle whitespace-nowrap text-[11px] font-semibold">{menu.name}</td>
                                        <td className="max-w-xs truncate px-3 py-2 align-middle whitespace-nowrap text-[11px] text-[#6e4a34]">
                                            {menu.description || '—'}
                                        </td>
                                        <td className="px-3 py-2 align-middle whitespace-nowrap text-right text-[11px] tabular-nums">
                                            {menu.itemCount}
                                        </td>
                                        <td className="px-3 py-2 align-middle whitespace-nowrap text-right text-[11px]">
                                            <div className="flex flex-nowrap items-center justify-end gap-2">
                                                <Link
                                                    href={`/manage/menus/${menu.id}/edit`}
                                                    className={cn(buttonVariants({ variant: 'outline' }), 'px-3 py-1 text-[10px] tracking-[0.15em]')}
                                                >
                                                    Edit
                                                </Link>
                                                <Link
                                                    href={`/manage/menus/${menu.id}`}
                                                    className={cn(buttonVariants({ variant: 'sweet' }), 'px-3 py-1 text-[10px] tracking-[0.15em]')}
                                                >
                                                    Manage items
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
