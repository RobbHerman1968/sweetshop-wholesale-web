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
        <div className="mx-auto flex h-full max-w-7xl flex-col gap-4 overflow-hidden">
            <div className="flex shrink-0 flex-nowrap items-center justify-between gap-4 overflow-x-auto">
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

            <div className="min-h-0 flex-1 overflow-hidden pb-2.5">
                {menus.length === 0 ? (
                    <div className="rounded-2xl border border-[#c49a78] bg-[#f8eddf] p-6 text-center text-xs text-[#6e4a34]">
                        <p>No menus found.</p>
                        <Link href="/manage/menus/new" className={cn(buttonVariants({ variant: 'sweet' }), 'mt-4 text-[11px]')}>
                            Add first menu
                        </Link>
                    </div>
                ) : (
                    <div className="h-full overflow-auto rounded-md border border-[#c49a78] bg-[#f8eddf]">
                        <table className="min-w-full border-collapse text-xs text-[#4a2518]">
                            <thead className="sticky top-0 z-10 bg-[#e3cbb0] text-[11px] uppercase tracking-[0.16em]">
                                <tr>
                                    <th className="whitespace-nowrap px-3 py-2 text-left">Name</th>
                                    <th className="whitespace-nowrap px-3 py-2 text-left">Description</th>
                                    <th className="whitespace-nowrap px-3 py-2 text-center">Lead Time</th>
                                    <th className="whitespace-nowrap px-3 py-2 text-center">Items</th>
                                    <th className="whitespace-nowrap px-3 py-2 text-right"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {menus.map((menu, idx) => {
                                    const isEven = idx % 2 === 0;

                                    return (
                                        <tr key={menu.id} className={isEven ? 'bg-[#fdf7ef]' : 'bg-[#f8eddf]'}>
                                            <td className="whitespace-nowrap px-3 py-2 align-middle text-[11px] font-semibold">{menu.name}</td>
                                            <td className="max-w-xs truncate whitespace-nowrap px-3 py-2 align-middle text-[11px] text-[#6e4a34]">
                                                {menu.description || '—'}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-2 align-middle text-center text-[11px] tabular-nums">
                                                {menu.shippingLeadTime} {menu.shippingLeadTime === 1 ? 'day' : 'days'}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-2 align-middle text-center text-[11px] tabular-nums">
                                                {menu.itemCount}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-2 align-middle text-right text-[11px]">
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
        </div>
    );
}
