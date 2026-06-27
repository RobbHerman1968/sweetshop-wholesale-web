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
            <div>
                <h1 className="text-[14px] font-semibold uppercase tracking-[0.3em] text-[#6e4a34]">Manage Menus</h1>
                <p className="mt-2 text-xs text-[#6e4a34]">Edit navigation structure for the brand bar, shop sidebar, and page sidebar.</p>
            </div>

            <p className="text-xs text-[#6e4a34]">
                Showing {menus.length} {menus.length === 1 ? 'menu' : 'menus'}.
            </p>

            {menus.length === 0 ? (
                <p className="rounded-2xl border border-[#c49a78] bg-[#f8eddf] p-6 text-center text-xs text-[#6e4a34]">No menus found.</p>
            ) : (
                <div className="overflow-x-auto rounded-md border border-[#c49a78] bg-[#f8eddf]">
                    <table className="min-w-full border-collapse text-xs text-[#4a2518]">
                        <thead className="bg-[#e3cbb0] text-[11px] uppercase tracking-[0.16em]">
                            <tr>
                                <th className="px-3 py-2 text-left min-w-40">Name</th>
                                <th className="px-3 py-2 text-left min-w-48">Description</th>
                                <th className="px-3 py-2 text-right w-24">Items</th>
                                <th className="px-3 py-2 text-right w-36"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {menus.map((menu, idx) => {
                                const isEven = idx % 2 === 0;

                                return (
                                    <tr key={menu.id} className={isEven ? 'bg-[#fdf7ef]' : 'bg-[#f8eddf]'}>
                                        <td className="px-3 py-2 align-middle text-[11px] font-semibold">{menu.name}</td>
                                        <td className="px-3 py-2 align-middle text-[11px] text-[#6e4a34]">{menu.description || '—'}</td>
                                        <td className="px-3 py-2 align-middle text-right text-[11px] tabular-nums">{menu.itemCount}</td>
                                        <td className="px-3 py-2 align-middle text-right text-[11px]">
                                            <Link
                                                href={`/manage/menus/${menu.id}`}
                                                className={cn(buttonVariants({ variant: 'sweet' }), 'px-3 py-1 text-[10px] tracking-[0.15em]')}
                                            >
                                                Manage items
                                            </Link>
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
