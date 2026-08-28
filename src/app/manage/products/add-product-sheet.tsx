'use client';

import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { createProductFromForm } from '@/lib/db-pg/actions/product';
import { getAllCategoriesForManage, type ShopCategory } from '@/lib/db-pg/actions/category';
import TiptapEditor from '@/components/ui/editor/tiptap-editor';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EditorImagePickerDialog } from '@/components/ui/editor/editor-image-picker-dialog';
import { RemoteImage } from '@/components/remote-image';
import type { ImagePickerItem } from '@/lib/db-pg/actions/image';
import { cn } from '@/lib/utils';
import { ProductCategoryChecklist } from './product-category-checklist';

type Props = {
    open: boolean;
    onClose: () => void;
    onCreated: (productId: number) => void;
};

const RICH_TEXT_FIELDS = [
    { name: 'description', label: 'Description' },
    { name: 'download', label: 'Download' },
    { name: 'ingredients', label: 'Ingredients' },
    { name: 'nutrition', label: 'Nutrition' },
] as const;

const EDITOR_MAX_HEIGHT = '240px';

export function AddProductSheet({ open, onClose, onCreated }: Props) {
    const [categories, setCategories] = useState<ShopCategory[]>([]);
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
    const [selectedImage, setSelectedImage] = useState<ImagePickerItem | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('description');
    const [formKey, setFormKey] = useState(0);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);

    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        setSelectedCategoryIds([]);
        setSelectedImage(null);
        setError(null);
        setActiveTab('description');
        setFormKey((current) => current + 1);
        getAllCategoriesForManage().then((allCategories) => {
            if (!cancelled) setCategories(allCategories);
        });
        return () => {
            cancelled = true;
        };
    }, [open]);

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
        setError(null);

        const formData = new FormData(e.currentTarget);
        formData.delete('categoryIds');
        for (const categoryId of selectedCategoryIds) {
            formData.append('categoryIds', String(categoryId));
        }
        if (selectedImage) {
            formData.set('vercelImageId', String(selectedImage.id));
        }

        const result = await createProductFromForm(formData);
        setSaving(false);

        if (!result.ok) {
            setError(result.error);
            toast({
                variant: 'destructive',
                title: 'Could not create product',
                description: result.error,
            });
            return;
        }

        toast({
            title: 'Product created',
            description: `Product #${result.id} was created.`,
        });
        onClose();
        onCreated(result.id);
    }

    function handleOpenChange(nextOpen: boolean) {
        if (!nextOpen) onClose();
    }

    const imagePath = selectedImage?.path?.trim() || null;
    const imageName = selectedImage?.name?.trim() || selectedImage?.imageName?.trim() || null;

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetContent side="right" className="flex h-full w-full flex-col overflow-hidden sm:!max-w-xl lg:!max-w-4xl">
                <form key={formKey} onSubmit={handleSubmit} className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
                    <SheetHeader className="shrink-0 pb-4">
                        <SheetTitle className="text-lg font-semibold text-[#4a2518]">Add Product</SheetTitle>
                        <SheetDescription>Set name, price, image, categories, description, download, ingredients, and nutrition.</SheetDescription>
                    </SheetHeader>

                    {error ? (
                        <p className="mb-4 shrink-0 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
                            {error}
                        </p>
                    ) : null}

                    <section className="shrink-0 space-y-4 pb-4">
                        <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Basic info</h3>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                            <div className="space-y-2">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Product image</p>
                                <button
                                    type="button"
                                    onClick={() => setDialogOpen(true)}
                                    className={cn(
                                        'group relative aspect-square w-full max-w-[200px] overflow-hidden rounded-xl border-2 border-[#c49a78] bg-white transition-colors hover:border-[#8b6342]',
                                        !imagePath && 'border-dashed bg-[#f8eddf]',
                                    )}
                                >
                                    {imagePath ? (
                                        <>
                                            <RemoteImage src={imagePath} alt={imageName || 'Product image'} sizes="200px" className="brightness-110" />
                                            <span className="absolute inset-x-0 bottom-0 bg-[#4a2518]/75 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#fdf7ef] opacity-0 transition-opacity group-hover:opacity-100">
                                                Change image
                                            </span>
                                        </>
                                    ) : (
                                        <span className="flex h-full flex-col items-center justify-center gap-1 px-3 text-center text-[11px] font-medium uppercase tracking-[0.12em] text-[#6e4a34]">
                                            <span>No image</span>
                                            <span className="text-[10px] normal-case tracking-normal text-[#8b6342]">Click to add</span>
                                        </span>
                                    )}
                                </button>
                            </div>

                            <div className="min-w-0 flex-1 space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="add-name" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                                            Name
                                        </Label>
                                        <Input id="add-name" name="name" className="w-full" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="add-itemNumber" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                                            Item number
                                        </Label>
                                        <Input id="add-itemNumber" name="itemNumber" className="w-full" required />
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="add-price" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                                            Price
                                        </Label>
                                        <Input id="add-price" name="price" type="number" step="0.01" min="0" defaultValue="0" className="w-32" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="add-pieces" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                                            Pieces
                                        </Label>
                                        <Input id="add-pieces" name="pieces" defaultValue="1" className="w-32" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="add-weightInOunces" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                                            Weight (oz)
                                        </Label>
                                        <Input id="add-weightInOunces" name="weightInOunces" type="number" step="0.01" min="0" defaultValue="0" className="w-32" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="add-shippingBoxFactor" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                                            Shipping box factor
                                        </Label>
                                        <Input id="add-shippingBoxFactor" name="shippingBoxFactor" type="number" step="0.001" min="0" defaultValue="1" className="w-32" />
                                    </div>
                                    <div className="flex items-center gap-2 pt-6">
                                        <input type="checkbox" id="add-isActive" name="isActive" defaultChecked className="h-4 w-4 rounded border-[#c49a78]" />
                                        <Label htmlFor="add-isActive" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
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
                                        idPrefix="add"
                                    />
                                </TabsContent>
                                {RICH_TEXT_FIELDS.map(({ name }) => (
                                    <TabsContent key={name} value={name} className="mt-0 data-[state=inactive]:hidden">
                                        <div className="min-h-[260px]">
                                            <TiptapEditor name={name} defaultValue="" className="min-h-[200px]" maxHeight={EDITOR_MAX_HEIGHT} />
                                        </div>
                                    </TabsContent>
                                ))}
                            </div>
                        </Tabs>
                    </section>

                    <SheetFooter className="shrink-0 border-t border-[#e3cbb0] pt-4">
                        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="sweet" disabled={saving}>
                            {saving ? 'Creating…' : 'Create product'}
                        </Button>
                    </SheetFooter>
                </form>

                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogContent className="max-w-md border-[#c49a78] bg-[#f8eddf] text-[#3f1d12]">
                        <DialogHeader>
                            <DialogTitle className="text-[#4a2518]">{imagePath ? 'Product image' : 'Add product image'}</DialogTitle>
                            <DialogDescription className="text-[#6e4a34]">
                                {imagePath ? 'Remove this image or choose a different one from the library.' : 'Choose an image from the library for this product.'}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-3">
                            {imagePath ? (
                                <>
                                    <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-[#c49a78] bg-white">
                                        <RemoteImage src={imagePath} alt={imageName || 'Product image'} sizes="(max-width: 448px) 100vw, 400px" />
                                    </div>
                                    {imageName ? (
                                        <p className="truncate text-sm font-medium text-[#4a2518]" title={imageName}>
                                            {imageName}
                                        </p>
                                    ) : null}
                                </>
                            ) : null}
                        </div>

                        <DialogFooter className="flex-col gap-2 pt-4 sm:flex-row sm:justify-end">
                            {imagePath ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="border-red-700 text-red-700 hover:bg-red-50"
                                    onClick={() => {
                                        setSelectedImage(null);
                                        setDialogOpen(false);
                                    }}
                                >
                                    Remove image
                                </Button>
                            ) : null}
                            <Button type="button" onClick={() => setPickerOpen(true)}>
                                {imagePath ? 'Replace image' : 'Choose image'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <EditorImagePickerDialog
                    open={pickerOpen}
                    onOpenChange={setPickerOpen}
                    mode={imagePath ? 'replace' : 'insert'}
                    onSelect={(selected) => {
                        setSelectedImage(selected);
                        setPickerOpen(false);
                        setDialogOpen(false);
                    }}
                />
            </SheetContent>
        </Sheet>
    );
}
