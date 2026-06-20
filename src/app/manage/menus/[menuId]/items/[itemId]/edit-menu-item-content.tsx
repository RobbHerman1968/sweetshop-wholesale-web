'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateMenuItemFromForm } from '@/lib/db-pg/actions/menu-manage';
import type { ManageMenuItem, MenuEditLookup } from '@/lib/db-pg/actions/menu';
import { getMenuItemLinkType } from '@/lib/menu-item-tree';

type ParentOption = {
    id: number;
    name: string;
    parentMenuItemId: number;
};

type Props = {
    item: ManageMenuItem;
    parentOptions: ParentOption[];
    categories: MenuEditLookup[];
    pages: MenuEditLookup[];
};

function formatParentLabel(option: ParentOption, parentOptions: ParentOption[]): string {
    const parts = [option.name || `Item ${option.id}`];
    let currentParentId = option.parentMenuItemId;

    while (currentParentId > 0) {
        const parent = parentOptions.find((row) => row.id === currentParentId);
        if (!parent) break;
        parts.unshift(parent.name || `Item ${parent.id}`);
        currentParentId = parent.parentMenuItemId;
    }

    return parts.join(' › ');
}

export function EditMenuItemContent({ item, parentOptions, categories, pages }: Props) {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [linkType, setLinkType] = useState<'section' | 'category' | 'page' | 'external'>(getMenuItemLinkType(item));

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            await updateMenuItemFromForm(new FormData(e.currentTarget));
            router.push(`/manage/menus/${item.menuId}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save menu item.');
            setSaving(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <input type="hidden" name="id" value={item.id} readOnly />
            <input type="hidden" name="linkType" value={linkType} readOnly />

            <header className="space-y-1">
                <h1 className="text-[14px] font-semibold uppercase tracking-[0.3em] text-[#6e4a34]">Edit Menu Item</h1>
                <p className="text-xs text-[#6e4a34]">Update label, link target, order, parent, and visibility.</p>
            </header>

            {error ? <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800">{error}</p> : null}

            <section className="space-y-4 rounded-2xl border border-[#c49a78] bg-[#f8eddf] p-4 sm:p-6">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Basic info</h2>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="edit-menu-item-name" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                            Label
                        </Label>
                        <Input id="edit-menu-item-name" name="name" defaultValue={item.name} className="w-full" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-menu-item-displayOrder" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                            Display order
                        </Label>
                        <Input id="edit-menu-item-displayOrder" name="displayOrder" type="number" defaultValue={item.displayOrder} className="w-full" />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="edit-menu-item-parent" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                        Parent item
                    </Label>
                    <select
                        id="edit-menu-item-parent"
                        name="parentMenuItemId"
                        defaultValue={item.parentMenuItemId}
                        className="flex h-9 w-full rounded-md border border-[#b89572] bg-[#fdf7ef] px-3 py-2 text-[12px] text-[#5c4032] shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#c49a78] focus-visible:ring-offset-1"
                    >
                        <option value={0}>Top level</option>
                        {parentOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                                {formatParentLabel(option, parentOptions)}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-wrap items-center gap-6">
                    <input type="hidden" name="isActive" value="false" />
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="edit-menu-item-isActive"
                            name="isActive"
                            value="true"
                            defaultChecked={item.isActive}
                            className="h-4 w-4 rounded border-[#c49a78]"
                        />
                        <Label htmlFor="edit-menu-item-isActive" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                            Active
                        </Label>
                    </div>
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
                        <Label htmlFor="edit-menu-item-categoryId" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                            Category
                        </Label>
                        <select
                            id="edit-menu-item-categoryId"
                            name="categoryId"
                            defaultValue={item.categoryId ?? ''}
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
                        <Label htmlFor="edit-menu-item-pageId" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                            Page
                        </Label>
                        <select
                            id="edit-menu-item-pageId"
                            name="pageId"
                            defaultValue={item.pageId ?? ''}
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
                        <Label htmlFor="edit-menu-item-externalUrl" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                            External URL
                        </Label>
                        <Input id="edit-menu-item-externalUrl" name="externalUrl" type="text" defaultValue={item.externalUrl ?? ''} className="w-full" placeholder="https://…" />
                    </div>
                ) : null}
            </section>

            <div className="flex flex-wrap gap-3 border-t border-[#e3cbb0] pt-4">
                <Link href={`/manage/menus/${item.menuId}`} className={buttonVariants({ variant: 'outline' })}>
                    Cancel
                </Link>
                <Button type="submit" disabled={saving}>
                    {saving ? 'Saving…' : 'Save changes'}
                </Button>
            </div>
        </form>
    );
}
