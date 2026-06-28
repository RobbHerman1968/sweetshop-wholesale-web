'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import TiptapEditor from '@/components/ui/editor/tiptap-editor';
import { createPageFromForm, updatePageFromForm, type SitePage } from '@/lib/db-pg/actions/page';
import { buildPagePath, slugifyPageNavName } from '@/lib/page-path';

type PageFormProps = {
    mode: 'create' | 'edit';
    page?: SitePage;
    backHref?: string;
};

export function PageForm({ mode, page, backHref = '/manage/pages' }: PageFormProps) {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [name, setName] = useState(page?.name ?? '');
    const [navName, setNavName] = useState(page?.navName ?? '');

    const title = mode === 'create' ? 'Add Page' : 'Edit Page';
    const submitLabel = mode === 'create' ? 'Create page' : 'Save changes';

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSaving(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        if (mode === 'create') {
            const result = await createPageFromForm(formData);
            if (!result.ok) {
                setError(result.error);
                setSaving(false);
            }
            return;
        }

        await updatePageFromForm(formData);
        setSaving(false);
        router.refresh();
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {mode === 'edit' && page ? <input type="hidden" name="id" value={page.id} readOnly /> : null}

            <header className="space-y-1">
                <h1 className="text-[14px] font-semibold uppercase tracking-[0.3em] text-[#6e4a34]">{title}</h1>
                <p className="text-xs text-[#6e4a34]">
                    {mode === 'create' ? 'Create a new content page.' : 'Update page title, URL slug, content, and visibility.'}
                </p>
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
                        <Label htmlFor="page-name" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                            Page name
                        </Label>
                        <Input
                            id="page-name"
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
                        <Label htmlFor="page-navName" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                            URL slug
                        </Label>
                        <Input id="page-navName" name="navName" value={navName} readOnly className="w-full bg-[#f3e0cf]/50" required />
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="page-isActive"
                            name="isActive"
                            defaultChecked={page?.isActive ?? false}
                            className="h-4 w-4 rounded border-[#c49a78]"
                        />
                        <Label htmlFor="page-isActive" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                            Active
                        </Label>
                    </div>
                    {mode === 'edit' && page?.isActive && navName ? (
                        <Link href={buildPagePath(page.id, navName)} target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#4a2518] underline-offset-4 hover:underline">
                            View live page
                        </Link>
                    ) : null}
                </div>
            </section>

            <section className="space-y-3">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Content</h2>
                <div className="min-h-[320px]">
                    <TiptapEditor
                        name="content"
                        defaultValue={page?.content ?? ''}
                        className="min-h-[280px]"
                        maxHeight="480px"
                        key={mode === 'edit' && page ? `page-content-${page.id}` : 'page-content-new'}
                    />
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
