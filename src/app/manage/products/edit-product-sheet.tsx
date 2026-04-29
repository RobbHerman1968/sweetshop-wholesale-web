'use client';

import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getProductById, updateProductFromForm } from '@/lib/db-pg/actions/product';
import type { Product } from '@/lib/db-pg/entities/product-entity';
import TiptapEditor from '@/components/ui/editor/tiptap-editor';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

type Props = {
    productId: number | null;
    onClose: () => void;
    onSaved?: () => void;
};

// ─── Rich text fields (TipTap): add/remove here and ensure updateProductFromForm reads the same names ───
const RICH_TEXT_FIELDS = [
    { name: 'description', label: 'Description' },
    { name: 'download', label: 'Download' },
    { name: 'ingredients', label: 'Ingredients' },
    { name: 'nutrition', label: 'Nutrition' },
] as const;

const EDITOR_MAX_HEIGHT = '240px';

export function EditProductSheet({ productId, onClose, onSaved }: Props) {
    const [productToEdit, setProductToEdit] = useState<Product | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!productId) return;
        let cancelled = false;
        getProductById(productId).then((p) => {
            if (!cancelled && p) setProductToEdit(p);
        });
        return () => {
            cancelled = true;
        };
    }, [productId]);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSaving(true);
        await updateProductFromForm(new FormData(e.currentTarget));
        setSaving(false);
        onClose();
        onSaved?.();
    }

    function handleOpenChange(open: boolean) {
        if (!open) onClose();
    }

    return (
        <Sheet open={productId != null} onOpenChange={handleOpenChange}>
            <SheetContent side="left" className="flex h-full w-full flex-col overflow-hidden sm:max-w-xl lg:max-w-4xl">
                {productToEdit ? (
                    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                        <input type="hidden" name="id" value={productToEdit.id} readOnly />
                        <SheetHeader className="shrink-0 pb-4">
                            <SheetTitle>Edit product</SheetTitle>
                            <SheetDescription>Update name, price, description, download, ingredients, and nutrition.</SheetDescription>
                        </SheetHeader>

                        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto py-2">
                            {/* ─── Basic info ─── */}
                            <section className="space-y-4">
                                <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Basic info</h3>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="edit-name" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                                            Name
                                        </Label>
                                        <Input id="edit-name" name="name" defaultValue={productToEdit.name ?? ''} className="w-full" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="edit-itemNumber" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                                            Item number
                                        </Label>
                                        <Input id="edit-itemNumber" name="itemNumber" defaultValue={productToEdit.itemNumber ?? ''} className="w-full" />
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="edit-price" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                                            Price
                                        </Label>
                                        <Input id="edit-price" name="price" type="number" step="0.01" min="0" defaultValue={productToEdit.price} className="w-32" />
                                    </div>
                                    <div className="flex items-center gap-2 pt-6">
                                        <input type="checkbox" id="edit-isActive" name="isActive" defaultChecked={productToEdit.isActive} className="h-4 w-4 rounded border-[#c49a78]" />
                                        <Label htmlFor="edit-isActive" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                                            Active
                                        </Label>
                                    </div>
                                </div>
                            </section>

                            {/* ─── Rich text (TipTap): horizontal tabs, one editor per tab ─── */}
                            <section className="flex min-h-0 flex-1 flex-col space-y-2">
                                <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Content</h3>
                                <Tabs defaultValue="description" className="flex min-h-0 flex-1 flex-col">
                                    <TabsList className="w-full shrink-0 justify-start rounded-md border border-[#c49a78] bg-[#f8eddf] p-1">
                                        {RICH_TEXT_FIELDS.map(({ name, label }) => (
                                            <TabsTrigger key={name} value={name} className="rounded px-3 py-2 data-[state=active]:bg-[#6e4a34] data-[state=active]:text-[#fdf7ef]">
                                                {label}
                                            </TabsTrigger>
                                        ))}
                                    </TabsList>
                                    <div className="min-h-0 flex-1 pt-2">
                                        {RICH_TEXT_FIELDS.map(({ name }) => {
                                            const value = productToEdit[name] ?? '';
                                            return (
                                                <TabsContent key={name} value={name} className="mt-0 h-full min-h-[280px] data-[state=inactive]:hidden">
                                                    <div className="h-full min-h-[260px]">
                                                        <TiptapEditor name={name} defaultValue={value} className="min-h-[200px]" maxHeight={EDITOR_MAX_HEIGHT} key={`${productToEdit.id}-${name}`} />
                                                    </div>
                                                </TabsContent>
                                            );
                                        })}
                                    </div>
                                </Tabs>
                            </section>
                        </div>

                        <SheetFooter className="shrink-0 border-t border-[#e3cbb0] pt-4">
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={saving}>
                                {saving ? 'Saving…' : 'Save'}
                            </Button>
                        </SheetFooter>
                    </form>
                ) : (
                    <>
                        <SheetHeader className="shrink-0 pb-4">
                            <SheetTitle>Edit product</SheetTitle>
                            <SheetDescription>Update name, price, description, download, ingredients, and nutrition.</SheetDescription>
                        </SheetHeader>
                        <p className="flex-1 py-8 text-center text-xs text-[#6e4a34]">Loading…</p>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}
