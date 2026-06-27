'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createMenuFromForm, updateMenuFromForm } from '@/lib/db-pg/actions/menu-manage';
import type { ManageMenu } from '@/lib/db-pg/actions/menu';

type MenuFormProps = {
    mode?: 'create' | 'edit';
    menu?: ManageMenu;
    backHref?: string;
};

export function MenuForm({ mode = 'create', menu, backHref = '/manage/menus' }: MenuFormProps) {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const isEdit = mode === 'edit';

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSaving(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const result = isEdit ? await updateMenuFromForm(formData) : await createMenuFromForm(formData);

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
            {isEdit && menu ? <input type="hidden" name="menuId" value={menu.id} /> : null}

            <header className="space-y-1">
                <h1 className="text-[14px] font-semibold uppercase tracking-[0.3em] text-[#6e4a34]">
                    {isEdit ? 'Edit Menu' : 'Add Menu'}
                </h1>
                <p className="text-xs text-[#6e4a34]">
                    {isEdit
                        ? 'Update menu details and whether it is used as a shopping sidebar menu.'
                        : 'Create a new navigation menu, then add items to build its structure.'}
                </p>
            </header>

            {error ? (
                <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
                    {error}
                </p>
            ) : null}

            <section className="space-y-4 rounded-2xl border border-[#c49a78] bg-[#f8eddf] p-4 sm:p-6">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Basic info</h2>

                <div className="space-y-2">
                    <Label htmlFor="menu-name" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                        Menu name
                    </Label>
                    <Input id="menu-name" name="name" className="w-full" required defaultValue={menu?.name ?? ''} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="menu-description" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                        Description
                    </Label>
                    <Input
                        id="menu-description"
                        name="description"
                        className="w-full"
                        placeholder="Optional"
                        defaultValue={menu?.description ?? ''}
                    />
                </div>

                <div className="flex items-center gap-2 pt-1">
                    <input
                        type="checkbox"
                        id="menu-isShopping"
                        name="isShopping"
                        value="true"
                        defaultChecked={menu?.isShopping ?? false}
                        className="h-4 w-4 rounded border-[#c49a78]"
                    />
                    <Label htmlFor="menu-isShopping" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                        Shopping menu
                    </Label>
                </div>
                <p className="text-[11px] text-[#6e4a34]">
                    Shopping menus appear in the shop sidebar and can be assigned to wholesale accounts.
                </p>
            </section>

            <div className="flex flex-wrap items-center gap-3">
                <Link href={backHref} className={buttonVariants({ variant: 'outline' })}>
                    Cancel
                </Link>
                <Button type="submit" variant="sweet" disabled={saving}>
                    {saving ? (isEdit ? 'Saving…' : 'Creating…') : isEdit ? 'Save menu' : 'Create menu'}
                </Button>
            </div>
        </form>
    );
}
