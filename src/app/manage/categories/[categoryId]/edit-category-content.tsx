'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateCategoryFromForm } from '@/lib/db-pg/actions/category';
import type { ShopCategory } from '@/lib/db-pg/actions/category';
import { slugifyPageNavName } from '@/lib/page-path';
import { buildShopCategoryPath } from '@/lib/shop-category-path';

type Props = {
    category: ShopCategory;
};

export function EditCategoryContent({ category }: Props) {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [name, setName] = useState(category.name);
    const [navName, setNavName] = useState(category.navName);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSaving(true);
        await updateCategoryFromForm(new FormData(e.currentTarget));
        setSaving(false);
        router.refresh();
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <input type="hidden" name="id" value={category.id} readOnly />

            <header className="space-y-1">
                <h1 className="text-[14px] font-semibold uppercase tracking-[0.3em] text-[#6e4a34]">Edit Category</h1>
                <p className="text-xs text-[#6e4a34]">Update category name, URL slug, and visibility.</p>
            </header>

            <section className="space-y-4 rounded-2xl border border-[#c49a78] bg-[#f8eddf] p-4 sm:p-6">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Basic info</h2>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="edit-category-name" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                            Category name
                        </Label>
                        <Input
                            id="edit-category-name"
                            name="name"
                            value={name}
                            onChange={(e) => {
                                const nextName = e.target.value;
                                setName(nextName);
                                setNavName(slugifyPageNavName(nextName));
                            }}
                            className="w-full"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-category-navName" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                            URL slug
                        </Label>
                        <Input id="edit-category-navName" name="navName" value={navName} readOnly className="w-full bg-[#f3e0cf]/50" required />
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="edit-category-isActive" name="isActive" defaultChecked={category.isActive} className="h-4 w-4 rounded border-[#c49a78]" />
                        <Label htmlFor="edit-category-isActive" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                            Active
                        </Label>
                    </div>
                    {category.isActive && navName ? (
                        <Link
                            href={buildShopCategoryPath(category.id, navName)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#4a2518] underline-offset-4 hover:underline"
                        >
                            View live category
                        </Link>
                    ) : null}
                </div>
            </section>

            <div className="flex flex-wrap gap-3 border-t border-[#e3cbb0] pt-4">
                <Link href="/manage/categories" className={buttonVariants({ variant: 'outline' })}>
                    Cancel
                </Link>
                <Button type="submit" disabled={saving}>
                    {saving ? 'Saving…' : 'Save changes'}
                </Button>
            </div>
        </form>
    );
}
