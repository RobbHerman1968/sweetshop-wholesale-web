'use client';

import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getMenuUsageDescription } from '@/lib/menu-manage-utils';
import type { ManageMenu } from '@/lib/db-pg/actions/menu';

type MenusContentProps = {
    menus: ManageMenu[];
};

export function MenusContent({ menus }: MenusContentProps) {
    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <h1 className="text-[14px] font-semibold uppercase tracking-[0.3em] text-[#6e4a34]">Manage Menus</h1>
            <p className="text-xs text-[#6e4a34]">Edit navigation structure for the brand bar, shop sidebar, and page sidebar.</p>

            {menus.length === 0 ? (
                <p className="rounded-2xl border border-[#c49a78] bg-[#f8eddf] p-6 text-center text-xs text-[#6e4a34]">No menus found.</p>
            ) : (
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {menus.map((menu) => {
                        const usage = getMenuUsageDescription(menu.id);

                        return (
                            <li key={menu.id}>
                                <article className="rounded-2xl border border-[#c49a78] bg-[#f8eddf] p-4 transition-colors">
                                    <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-[#4a2518]">{menu.name}</p>
                                    {usage ? <p className="mt-1 text-[11px] text-[#6e4a34]">{usage}</p> : null}
                                    <p className="mt-2 text-[11px] text-[#6e4a34]">
                                        {menu.itemCount} menu {menu.itemCount === 1 ? 'item' : 'items'}
                                    </p>
                                    <div className="mt-3">
                                        <Link href={`/manage/menus/${menu.id}`} className={cn(buttonVariants({ variant: 'sweet' }), 'text-[11px]')}>
                                            Manage items
                                        </Link>
                                    </div>
                                </article>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
