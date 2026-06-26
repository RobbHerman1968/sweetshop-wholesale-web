'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import TiptapEditor from '@/components/ui/editor/tiptap-editor';
import { updatePageFromForm } from '@/lib/db-pg/actions/page';
import type { SitePage } from '@/lib/db-pg/actions/page';
import { buildPagePath, slugifyPageNavName } from '@/lib/page-path';

type Props = {
    page: SitePage;
};

export function EditPageContent({ page }: Props) {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [name, setName] = useState(page.name);
    const [navName, setNavName] = useState(page.navName);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSaving(true);
        await updatePageFromForm(new FormData(e.currentTarget));
        setSaving(false);
        router.refresh();
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <input type="hidden" name="id" value={page.id} readOnly />

            <header className="space-y-1">
                <h1 className="text-[14px] font-semibold uppercase tracking-[0.3em] text-[#6e4a34]">Edit Page</h1>
                <p className="text-xs text-[#6e4a34]">Update page title, URL slug, content, and visibility.</p>
            </header>

            <section className="space-y-4 rounded-2xl border border-[#c49a78] bg-[#f8eddf] p-4 sm:p-6">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Basic info</h2>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="edit-page-name" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                            Page name
                        </Label>
                        <Input
                            id="edit-page-name"
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
                        <Label htmlFor="edit-page-navName" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                            URL slug
                        </Label>
                        <Input id="edit-page-navName" name="navName" value={navName} readOnly className="w-full bg-[#f3e0cf]/50" required />
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="edit-page-isActive" name="isActive" defaultChecked={page.isActive} className="h-4 w-4 rounded border-[#c49a78]" />
                        <Label htmlFor="edit-page-isActive" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                            Active
                        </Label>
                    </div>
                    {page.isActive && navName ? (
                        <Link href={buildPagePath(page.id, navName)} target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#4a2518] underline-offset-4 hover:underline">
                            View live page
                        </Link>
                    ) : null}
                </div>
            </section>

            <section className="space-y-3">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Content</h2>
                <div className="min-h-[320px]">
                    <TiptapEditor name="content" defaultValue={page.content} className="min-h-[280px]" maxHeight="480px" key={`page-content-${page.id}`} />
                </div>
            </section>

            <div className="flex flex-wrap gap-3 border-t border-[#e3cbb0] pt-4">
                <Link href="/manage/pages" className={buttonVariants({ variant: 'outline' })}>
                    Cancel
                </Link>
                <Button type="submit" disabled={saving}>
                    {saving ? 'Saving…' : 'Save changes'}
                </Button>
            </div>
        </form>
    );
}
