'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createMenuItemFromForm } from '@/lib/db-pg/actions/menu-manage';
import type { ManageMenu, MenuEditLookup } from '@/lib/db-pg/actions/menu';

type Props = {
    menu: ManageMenu;
    categories: MenuEditLookup[];
    pages: MenuEditLookup[];
};

export function AddMenuItemContent({ menu, categories, pages }: Props) {
    const [saving, setSaving] = useState(false);
    const [linkType, setLinkType] = useState<'section' | 'category' | 'page' | 'external'>('section');

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSaving(true);
        await createMenuItemFromForm(new FormData(e.currentTarget));
        setSaving(false);
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <input type="hidden" name="menuId" value={menu.id} readOnly />
            <input type="hidden" name="linkType" value={linkType} readOnly />

            <header className="space-y-1">
                <h1 className="text-[14px] font-semibold uppercase tracking-[0.3em] text-[#6e4a34]">Add Menu Item</h1>
                <p className="text-xs text-[#6e4a34]">Creates a new top-level item at the bottom of {menu.name}.</p>
            </header>

            <section className="space-y-4 rounded-2xl border border-[#c49a78] bg-[#f8eddf] p-4 sm:p-6">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Basic info</h2>

                <div className="space-y-2">
                    <Label htmlFor="add-menu-item-name" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                        Label
                    </Label>
                    <Input id="add-menu-item-name" name="name" className="w-full" required />
                </div>

                <div className="flex items-center gap-2">
                    <input type="hidden" name="isActive" value="false" />
                    <input type="checkbox" id="add-menu-item-isActive" name="isActive" value="true" defaultChecked className="h-4 w-4 rounded border-[#c49a78]" />
                    <Label htmlFor="add-menu-item-isActive" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                        Active
                    </Label>
                </div>
            </section>

            <section className="space-y-4 rounded-2xl border border-[#c49a78] bg-[#f8eddf] p-4 sm:p-6">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Link target</h2>

                <div className="flex flex-wrap gap-4">
                    {(
                        [
                            ['section', 'Section header'],
                            ['category', 'Shop category'],
                            ['page', 'CMS page'],
                            ['external', 'External URL'],
                        ] as const
                    ).map(([value, label]) => (
                        <label key={value} className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#6e4a34]">
                            <input
                                type="radio"
                                name="linkTypeUi"
                                value={value}
                                checked={linkType === value}
                                onChange={() => setLinkType(value)}
                                className="h-4 w-4 border-[#c49a78]"
                            />
                            {label}
                        </label>
                    ))}
                </div>

                {linkType === 'category' ? (
                    <div className="space-y-2">
                        <Label htmlFor="add-menu-item-categoryId" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                            Category
                        </Label>
                        <select
                            id="add-menu-item-categoryId"
                            name="categoryId"
                            className="flex h-9 w-full rounded-md border border-[#b89572] bg-[#fdf7ef] px-3 py-2 text-[12px] text-[#5c4032] shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#c49a78] focus-visible:ring-offset-1"
                        >
                            <option value="">Select a category</option>
                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                    </div>
                ) : null}

                {linkType === 'page' ? (
                    <div className="space-y-2">
                        <Label htmlFor="add-menu-item-pageId" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                            Page
                        </Label>
                        <select
                            id="add-menu-item-pageId"
                            name="pageId"
                            className="flex h-9 w-full rounded-md border border-[#b89572] bg-[#fdf7ef] px-3 py-2 text-[12px] text-[#5c4032] shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#c49a78] focus-visible:ring-offset-1"
                        >
                            <option value="">Select a page</option>
                            {pages.map((page) => (
                                <option key={page.id} value={page.id}>
                                    {page.name}
                                </option>
                            ))}
                        </select>
                    </div>
                ) : null}

                {linkType === 'external' ? (
                    <div className="space-y-2">
                        <Label htmlFor="add-menu-item-externalUrl" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                            External URL
                        </Label>
                        <Input id="add-menu-item-externalUrl" name="externalUrl" type="text" className="w-full" placeholder="https://…" />
                    </div>
                ) : null}
            </section>

            <div className="flex flex-wrap gap-3 border-t border-[#e3cbb0] pt-4">
                <Link href={`/manage/menus/${menu.id}`} className={buttonVariants({ variant: 'outline' })}>
                    Cancel
                </Link>
                <Button type="submit" disabled={saving}>
                    {saving ? 'Adding…' : 'Add menu item'}
                </Button>
            </div>
        </form>
    );
}
