'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { acceptLegacyProductImage } from '@/lib/db-pg/actions/image';
import { getProductOldImageForEditTab } from '@/lib/db-pg/actions/product';
import type { Product } from '@/lib/db-pg/entities/product-entity';

type Props = {
    product: Product;
    active: boolean;
    onReloadProduct: () => Promise<Product | null | undefined>;
};

export function EditProductOldImageTab({ product, active, onReloadProduct }: Props) {
    const [legacyImageUrl, setLegacyImageUrl] = useState<string | null>(null);
    const [legacyImageName, setLegacyImageName] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadedProductId, setLoadedProductId] = useState<number | null>(null);
    const [accepting, setAccepting] = useState(false);
    const [acceptMessage, setAcceptMessage] = useState<string | null>(null);
    const [acceptError, setAcceptError] = useState<string | null>(null);

    useEffect(() => {
        if (!active) return;

        let cancelled = false;
        setLoading(true);
        setError(null);
        setAcceptMessage(null);
        setAcceptError(null);
        setLegacyImageUrl(null);
        setLegacyImageName(null);

        getProductOldImageForEditTab(product.id)
            .then((result) => {
                if (cancelled) return;
                setLegacyImageUrl(result.imageUrl);
                setLegacyImageName(result.imageName);
                setError(result.error ?? (result.imageUrl ? null : 'No legacy product image found.'));
                setLoadedProductId(product.id);
            })
            .catch(() => {
                if (!cancelled) setError('Could not load productOldImage for this product.');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [active, product.id]);

    async function handleAccept() {
        if (!legacyImageUrl || !legacyImageName) return;

        setAccepting(true);
        setAcceptMessage(null);
        setAcceptError(null);

        try {
            const result = await acceptLegacyProductImage(product.id, legacyImageUrl, legacyImageName);
            if (!result.success) {
                setAcceptError(result.error);
                return;
            }

            setAcceptMessage(
                result.reusedExisting
                    ? 'Linked this product to the existing image in your library.'
                    : 'Downloaded legacy image, uploaded to Vercel, and updated this product.',
            );

            await onReloadProduct();
        } catch {
            setAcceptError('Could not accept legacy image. Try again.');
        } finally {
            setAccepting(false);
        }
    }

    return (
        <div className="space-y-4">
            <p className="text-xs text-[#6e4a34]">
                Loads the default active row from productOldImage and displays it via the legacy dynimage URL at 800×800.
            </p>

            <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Legacy dynimage (800×800)</p>
                {loading ? (
                    <p className="text-xs text-[#6e4a34]">Loading productOldImage…</p>
                ) : error ? (
                    <p className="text-xs font-medium text-red-700">{error}</p>
                ) : legacyImageUrl ? (
                    <div className="max-w-sm space-y-3">
                        <div className="overflow-hidden rounded-lg border border-[#c49a78] bg-white p-2">
                            <img
                                src={legacyImageUrl}
                                alt={legacyImageName || product.name || 'Legacy product image'}
                                className="mx-auto max-h-80 w-full object-contain"
                            />
                        </div>
                        {legacyImageName ? (
                            <p className="truncate text-[11px] text-[#6e4a34]" title={legacyImageName}>
                                {legacyImageName}
                            </p>
                        ) : null}
                        {loadedProductId === product.id ? (
                            <p className="text-[10px] text-[#8b6342]">Loaded from productOldImage for product {product.id}.</p>
                        ) : null}
                        <Button type="button" variant="sweet" disabled={accepting || !legacyImageName} onClick={handleAccept}>
                            {accepting ? 'Accepting…' : 'Accept'}
                        </Button>
                        {acceptMessage ? <p className="text-xs text-[#4a2518]">{acceptMessage}</p> : null}
                        {acceptError ? <p className="text-xs font-medium text-red-700">{acceptError}</p> : null}
                    </div>
                ) : (
                    <p className="rounded-md border border-dashed border-[#c49a78] bg-[#f8eddf] px-3 py-2 text-xs text-[#6e4a34]">
                        Open this tab to load the productOldImage preview.
                    </p>
                )}
            </div>
        </div>
    );
}
