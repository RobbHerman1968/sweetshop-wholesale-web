'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RemoteImage } from '@/components/remote-image';
import { EditorImagePickerDialog } from '@/components/ui/editor/editor-image-picker-dialog';
import { getProductById, removeProductImageById, setProductPrimaryImage } from '@/lib/db-pg/actions/product';
import type { Product } from '@/lib/db-pg/entities/product-entity';
import type { ImagePickerItem } from '@/lib/db-pg/actions/image';
import { cn } from '@/lib/utils';

type Props = {
    product: Product;
    onProductChange: (product: Product) => void;
    onSaved?: () => void;
};

export function EditProductImageSection({ product, onProductChange, onSaved }: Props) {
    const primaryImage = product.productImages?.[0];
    const imagePath = primaryImage?.vercelImage?.path?.trim();
    const imageName = primaryImage?.vercelImage?.name?.trim() || primaryImage?.vercelImage?.imageName?.trim();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function reloadProduct() {
        const updated = await getProductById(product.id);
        if (updated) onProductChange(updated);
        onSaved?.();
    }

    async function handleRemove() {
        if (!primaryImage) return;
        setBusy(true);
        setError(null);
        try {
            await removeProductImageById(primaryImage.id);
            await reloadProduct();
            setDialogOpen(false);
        } catch {
            setError('Could not remove the image. Try again.');
        } finally {
            setBusy(false);
        }
    }

    async function handleReplace(selected: ImagePickerItem) {
        setBusy(true);
        setError(null);
        try {
            await setProductPrimaryImage(product.id, selected.id);
            await reloadProduct();
            setPickerOpen(false);
            setDialogOpen(false);
        } catch {
            setError('Could not update the image. Try again.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <>
            <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Product image</p>
                <button
                    type="button"
                    onClick={() => {
                        setError(null);
                        setDialogOpen(true);
                    }}
                    className={cn(
                        'group relative aspect-square w-full max-w-[200px] overflow-hidden rounded-xl border-2 border-[#c49a78] bg-white transition-colors hover:border-[#8b6342]',
                        !imagePath && 'border-dashed bg-[#f8eddf]',
                    )}
                >
                    {imagePath ? (
                        <>
                            <RemoteImage src={imagePath} alt={imageName || product.name || 'Product image'} sizes="200px" className="brightness-110" />
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
                                    <RemoteImage src={imagePath} alt={imageName || product.name || 'Product image'} sizes="(max-width: 448px) 100vw, 400px" />
                                </div>
                                {imageName ? (
                                    <p className="truncate text-sm font-medium text-[#4a2518]" title={imageName}>
                                        {imageName}
                                    </p>
                                ) : null}
                            </>
                        ) : null}

                        {error ? <p className="text-xs font-medium text-red-700">{error}</p> : null}
                    </div>

                    <DialogFooter className="flex-col gap-2 pt-4 sm:flex-row sm:justify-end">
                        {imagePath ? (
                            <Button type="button" variant="outline" disabled={busy} onClick={handleRemove} className="border-red-700 text-red-700 hover:bg-red-50">
                                Remove image
                            </Button>
                        ) : null}
                        <Button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                                setError(null);
                                setPickerOpen(true);
                            }}
                        >
                            {imagePath ? 'Replace image' : 'Choose image'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <EditorImagePickerDialog
                open={pickerOpen}
                onOpenChange={setPickerOpen}
                mode={imagePath ? 'replace' : 'insert'}
                onSelect={handleReplace}
            />
        </>
    );
}
