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
import { EditProductOldImageTab } from './edit-product-old-image-tab';

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

    async function reloadProduct() {
        if (!productId) return null;

        const [product, categoryIds] = await Promise.all([
            getProductById(productId),
            getProductCategoryIds(productId),
        ]);

        if (product) setProductToEdit(product);
        setSelectedCategoryIds(categoryIds);
        onSaved?.();
        return product;
    }

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
            <SheetContent side="right" className="flex h-full w-full flex-col overflow-hidden sm:max-w-xl lg:max-w-4xl">
                {productToEdit ? (
                    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                        <input type="hidden" name="id" value={productToEdit.id} readOnly />
                        <SheetHeader className="shrink-0 pb-4">
                            <SheetTitle className="text-lg font-semibold text-[#4a2518]">Edit Product ({productToEdit.id})</SheetTitle>
                            <SheetDescription>Update name, price, categories, description, download, ingredients, and nutrition.</SheetDescription>
                        </SheetHeader>

                        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto py-2">
                            {/* ─── Basic info ─── */}
                            <section className="space-y-4">
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

                            {/* ─── Categories + rich text tabs ─── */}
                            <section className="flex min-h-0 flex-1 flex-col space-y-2">
                                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
                                    <TabsList className="h-auto w-full shrink-0 justify-start rounded-md border border-[#c49a78] bg-[#f8eddf] p-1.5">
                                        {RICH_TEXT_FIELDS.map(({ name, label }) => (
                                            <TabsTrigger key={name} value={name} className="rounded px-3 py-2.5 data-[state=active]:bg-[#6e4a34] data-[state=active]:text-[#fdf7ef]">
                                                {label}
                                            </TabsTrigger>
                                        ))}
                                        <TabsTrigger value="categories" className="rounded px-3 py-2.5 data-[state=active]:bg-[#6e4a34] data-[state=active]:text-[#fdf7ef]">
                                            Categories
                                        </TabsTrigger>
                                        <TabsTrigger value="old-product-image" className="rounded px-3 py-2.5 data-[state=active]:bg-[#6e4a34] data-[state=active]:text-[#fdf7ef]">
                                            Get old product image
                                        </TabsTrigger>
                                    </TabsList>
                                    <div className="min-h-0 flex-1 pt-2">
                                        <TabsContent value="categories" className="mt-0 data-[state=inactive]:hidden">
                                            <p className="mb-3 text-xs text-[#6e4a34]">Choose which shop categories include this product.</p>
                                            {categories.length === 0 ? (
                                                <p className="rounded-md border border-dashed border-[#c49a78] bg-[#f8eddf] px-3 py-2 text-xs text-[#6e4a34]">
                                                    No categories yet. Add categories under Manage Categories first.
                                                </p>
                                            ) : (
                                                <ul className="grid gap-2 sm:grid-cols-2">
                                                    {categories.map((category) => {
                                                        const inputId = `edit-category-${category.id}`;
                                                        const checked = selectedCategoryIds.includes(category.id);
                                                        return (
                                                            <li key={category.id}>
                                                                <label htmlFor={inputId} className="flex cursor-pointer items-center gap-2 rounded-md border border-[#c49a78] bg-[#f8eddf] px-3 py-2">
                                                                    <input
                                                                        type="checkbox"
                                                                        id={inputId}
                                                                        name="categoryIds"
                                                                        value={category.id}
                                                                        checked={checked}
                                                                        onChange={(e) => toggleCategory(category.id, e.target.checked)}
                                                                        className="h-4 w-4 shrink-0 rounded border-[#c49a78]"
                                                                    />
                                                                    <span className="flex min-w-0 flex-wrap items-center gap-2 text-[12px] font-semibold text-[#4a2518]">
                                                                        {category.name || 'Untitled'}
                                                                        {!category.isActive ? (
                                                                            <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-red-700">Inactive</span>
                                                                        ) : null}
                                                                    </span>
                                                                </label>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            )}
                                        </TabsContent>
                                        <TabsContent value="old-product-image" className="mt-0 data-[state=inactive]:hidden">
                                            <EditProductOldImageTab
                                                product={productToEdit}
                                                active={activeTab === 'old-product-image'}
                                                onReloadProduct={reloadProduct}
                                            />
                                        </TabsContent>
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
                            <SheetTitle className="text-lg font-semibold text-[#4a2518]">Edit Product ({productId})</SheetTitle>
                            <SheetDescription>Update name, price, categories, description, download, ingredients, and nutrition.</SheetDescription>
                        </SheetHeader>
                        <p className="flex-1 py-8 text-center text-xs text-[#6e4a34]">Loading…</p>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}
