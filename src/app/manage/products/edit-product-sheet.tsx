'use client';

import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getProductById, getProductCategoryIds, updateProductFromForm } from '@/lib/db-pg/actions/product';
import { getAllCategoriesForManage, type ShopCategory } from '@/lib/db-pg/actions/category';
import type { Product } from '@/lib/db-pg/entities/product-entity';
import TiptapEditor from '@/components/ui/editor/tiptap-editor';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EditProductImageSection } from './edit-product-image-section';
import { ProductCategoryChecklist } from './product-category-checklist';

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
    const [categories, setCategories] = useState<ShopCategory[]>([]);
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('description');

    useEffect(() => {
        if (!productId) return;
        let cancelled = false;
        Promise.all([getProductById(productId), getProductCategoryIds(productId), getAllCategoriesForManage()]).then(([product, categoryIds, allCategories]) => {
            if (cancelled) return;
            if (product) setProductToEdit(product);
            setSelectedCategoryIds(categoryIds);
            setCategories(allCategories);
        });
        return () => {
            cancelled = true;
        };
    }, [productId]);

    useEffect(() => {
        if (!productId) return;
        setActiveTab('description');
    }, [productId]);

    function toggleCategory(categoryId: number, checked: boolean) {
        setSelectedCategoryIds((current) => {
            if (checked) {
                return current.includes(categoryId) ? current : [...current, categoryId];
            }
            return current.filter((id) => id !== categoryId);
        });
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSaving(true);
        const formData = new FormData(e.currentTarget);
        // Category checkboxes live inside an inactive tab panel, so they are omitted from FormData unless that tab is open.
        formData.delete('categoryIds');
        for (const categoryId of selectedCategoryIds) {
            formData.append('categoryIds', String(categoryId));
        }
        await updateProductFromForm(formData);
        setSaving(false);
        onClose();
        onSaved?.();
    }

    function handleOpenChange(open: boolean) {
        if (!open) onClose();
    }

    return (
        <Sheet open={productId != null} onOpenChange={handleOpenChange}>
            <SheetContent side="right" className="flex h-full w-full flex-col overflow-hidden sm:!max-w-xl lg:!max-w-4xl">
                {productToEdit ? (
                    <form onSubmit={handleSubmit} className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
                        <input type="hidden" name="id" value={productToEdit.id} readOnly />
                        <SheetHeader className="shrink-0 pb-4">
                            <SheetTitle className="text-lg font-semibold text-[#4a2518]">Edit Product ({productToEdit.id})</SheetTitle>
                            <SheetDescription>Update name, price, categories, description, download, ingredients, and nutrition.</SheetDescription>
                        </SheetHeader>

                        <section className="shrink-0 space-y-4 pb-4">
                            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Basic info</h3>
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                                <EditProductImageSection
                                    key={productToEdit.productImages?.[0]?.vercelImageId ?? `no-image-${productToEdit.id}`}
                                    product={productToEdit}
                                    onProductChange={setProductToEdit}
                                    onSaved={onSaved}
                                />
                                <div className="min-w-0 flex-1 space-y-4">
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
                                        <div className="space-y-2">
                                            <Label htmlFor="edit-pieces" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                                                Pieces
                                            </Label>
                                            <Input id="edit-pieces" name="pieces" defaultValue={productToEdit.pieces?.trim() || '1'} className="w-32" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="edit-weightInOunces" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                                                Weight (oz)
                                            </Label>
                                            <Input id="edit-weightInOunces" name="weightInOunces" type="number" step="0.01" min="0" defaultValue={productToEdit.weightInOunces} className="w-32" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="edit-shippingBoxFactor" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                                                Shipping box factor
                                            </Label>
                                            <Input id="edit-shippingBoxFactor" name="shippingBoxFactor" type="number" step="0.001" min="0" defaultValue={productToEdit.shippingBoxFactor} className="w-32" />
                                        </div>
                                        <div className="flex items-center gap-2 pt-6">
                                            <input type="checkbox" id="edit-isActive" name="isActive" defaultChecked={productToEdit.isActive} className="h-4 w-4 rounded border-[#c49a78]" />
                                            <Label htmlFor="edit-isActive" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                                                Active
                                            </Label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col overflow-hidden">
                                <TabsList className="h-auto w-full shrink-0 justify-start rounded-md border border-[#c49a78] bg-[#f8eddf] p-1.5">
                                    {RICH_TEXT_FIELDS.map(({ name, label }) => (
                                        <TabsTrigger key={name} value={name} className="rounded px-3 py-2.5 data-[state=active]:bg-[#6e4a34] data-[state=active]:text-[#fdf7ef]">
                                            {label}
                                        </TabsTrigger>
                                    ))}
                                    <TabsTrigger value="categories" className="rounded px-3 py-2.5 data-[state=active]:bg-[#6e4a34] data-[state=active]:text-[#fdf7ef]">
                                        Categories
                                    </TabsTrigger>
                                </TabsList>
                                <div className="min-h-0 flex-1 overflow-y-auto pt-2">
                                    <TabsContent value="categories" className="mt-0 data-[state=inactive]:hidden">
                                        <p className="mb-3 text-xs text-[#6e4a34]">Choose which shop categories include this product.</p>
                                        <ProductCategoryChecklist
                                            categories={categories}
                                            selectedCategoryIds={selectedCategoryIds}
                                            onToggle={toggleCategory}
                                            idPrefix="edit"
                                            includeFormFields
                                        />
                                    </TabsContent>
                                    {RICH_TEXT_FIELDS.map(({ name }) => {
                                        const value = productToEdit[name] ?? '';
                                        return (
                                            <TabsContent key={name} value={name} className="mt-0 data-[state=inactive]:hidden">
                                                <div className="min-h-[260px]">
                                                    <TiptapEditor name={name} defaultValue={value} className="min-h-[200px]" maxHeight={EDITOR_MAX_HEIGHT} key={`${productToEdit.id}-${name}`} />
                                                </div>
                                            </TabsContent>
                                        );
                                    })}
                                </div>
                            </Tabs>
                        </section>

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
                    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
                        <SheetHeader className="shrink-0 pb-4">
                            <SheetTitle className="text-lg font-semibold text-[#4a2518]">Edit Product ({productId})</SheetTitle>
                            <SheetDescription>Update name, price, categories, description, download, ingredients, and nutrition.</SheetDescription>
                        </SheetHeader>
                        <p className="flex-1 py-8 text-center text-xs text-[#6e4a34]">Loading…</p>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
