'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createCategoryFromForm, updateCategoryFromForm, type ShopCategory } from '@/lib/db-pg/actions/category';
import { slugifyPageNavName } from '@/lib/page-path';

type CategoryFormProps = {
    mode: 'create' | 'edit';
    category?: ShopCategory;
    backHref?: string;
};

export function CategoryForm({ mode, category, backHref = '/manage/categories' }: CategoryFormProps) {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [name, setName] = useState(category?.name ?? '');
    const [navName, setNavName] = useState(category?.navName ?? '');

    const title = mode === 'create' ? 'Add Category' : 'Edit Category';
    const submitLabel = mode === 'create' ? 'Create category' : 'Save changes';

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSaving(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const result = mode === 'create' ? await createCategoryFromForm(formData) : await updateCategoryFromForm(formData);

        if (!result.ok) {
            setError(result.error);
            setSaving(false);
            return;
        }

        setSaving(false);
        router.refresh();
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {mode === 'edit' && category ? <input type="hidden" name="id" value={category.id} readOnly /> : null}

            <header className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                    <h1 className="text-[14px] font-semibold uppercase tracking-[0.3em] text-[#6e4a34]">{title}</h1>
                    <p className="text-xs text-[#6e4a34]">
                        {mode === 'create' ? 'Create a new shop category.' : 'Update category name, URL slug, and visibility.'}
                    </p>
                </div>
                {mode === 'edit' && category ? (
                    <Link href={`/manage/categories/${category.id}/products`} className={buttonVariants({ variant: 'outline' })}>
                        All products
                    </Link>
                ) : null}
            </header>

            {error ? (
                <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
                    {error}
                </p>
            ) : null}

            <section className="space-y-4 rounded-2xl border border-[#c49a78] bg-[#f8eddf] p-4 sm:p-6">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Basic info</h2>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="category-name" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                            Category name
                        </Label>
                        <Input
                            id="category-name"
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
                        <Label htmlFor="category-navName" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                            URL slug
                        </Label>
                        <Input id="category-navName" name="navName" value={navName} readOnly className="w-full bg-[#f3e0cf]/50" required />
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="category-isActive"
                            name="isActive"
                            defaultChecked={category?.isActive ?? false}
                            className="h-4 w-4 rounded border-[#c49a78]"
                        />
                        <Label htmlFor="category-isActive" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                            Active
                        </Label>
                    </div>
                </div>
            </section>

            <div className="flex flex-wrap gap-3 border-t border-[#e3cbb0] pt-4">
                <Link href={backHref} className={buttonVariants({ variant: 'outline' })}>
                    Cancel
                </Link>
                <Button type="submit" disabled={saving}>
                    {saving ? 'Saving…' : submitLabel}
                </Button>
            </div>
        </form>
    );
}
