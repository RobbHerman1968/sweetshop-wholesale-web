'use client';

import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { addProductToShopCart } from '@/lib/shop-cart-actions';
import { useShopCartStore } from '@/store/useShopCartStore';
import { cn } from '@/lib/utils';

type Props = {
    productId: number;
    className?: string;
    /** Grid cards: centered "Qty". Product details: right-aligned "Quantity". Sheet: qty + button in one row. */
    variant?: 'grid' | 'detail' | 'sheet';
};

function parsePositiveQuantity(value: string): number | null {
    const parsed = parseInt(value.trim(), 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return null;
    }
    return parsed;
}

type QuantityStepperProps = {
    id: string;
    value: string;
    disabled?: boolean;
    onChange: (value: string) => void;
};

function QuantityStepper({ id, value, disabled, onChange }: QuantityStepperProps) {
    const current = parsePositiveQuantity(value) ?? 1;

    const decrement = () => {
        onChange(String(Math.max(1, current - 1)));
    };

    const increment = () => {
        onChange(String(current + 1));
    };

    const handleInputChange = (next: string) => {
        if (next === '') {
            onChange('');
            return;
        }
        if (/^\d+$/.test(next)) {
            onChange(next);
        }
    };

    const handleBlur = () => {
        const parsed = parsePositiveQuantity(value);
        onChange(parsed != null ? String(parsed) : '1');
    };

    return (
        <div className="inline-flex h-8 w-30 overflow-hidden rounded-md border border-[#d1b79a] bg-white">
            <button
                type="button"
                aria-label="Decrease quantity"
                disabled={disabled || current <= 1}
                onClick={decrement}
                className="inline-flex w-8 shrink-0 items-center justify-center border-r border-[#d1b79a] text-[#4a2518] transition-colors hover:bg-[#f6ebdd] disabled:cursor-not-allowed disabled:opacity-40"
            >
                <Minus className="size-3" strokeWidth={2.25} aria-hidden />
            </button>
            <Input
                id={id}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={value}
                disabled={disabled}
                onChange={(e) => handleInputChange(e.target.value)}
                onBlur={handleBlur}
                className="h-8 w-10 min-w-0 flex-1 rounded-none border-0 px-0 text-center text-sm tabular-nums shadow-none focus-visible:ring-0"
            />
            <button
                type="button"
                aria-label="Increase quantity"
                disabled={disabled}
                onClick={increment}
                className="inline-flex w-8 shrink-0 items-center justify-center border-l border-[#d1b79a] text-[#4a2518] transition-colors hover:bg-[#f6ebdd] disabled:cursor-not-allowed disabled:opacity-40"
            >
                <Plus className="size-3" strokeWidth={2.25} aria-hidden />
            </button>
        </div>
    );
}

export function ShopAddToCartControls({ productId, className, variant = 'grid' }: Props) {
    const [quantity, setQuantity] = useState('1');
    const [submitting, setSubmitting] = useState(false);

    const stopCardActivation = (e: React.SyntheticEvent) => {
        e.stopPropagation();
    };

    const handleAdd = async () => {
        const parsed = parsePositiveQuantity(quantity);
        if (parsed == null) {
            toast({
                variant: 'destructive',
                title: 'Invalid quantity',
                description: 'Quantity must be greater than zero.',
            });
            return;
        }

        setSubmitting(true);

        const result = await addProductToShopCart(productId, parsed);
        setSubmitting(false);

        if (result.ok) {
            useShopCartStore.getState().setItemCount(result.itemCount);
            toast({
                title: 'Added to cart',
            });
            setQuantity('1');
            return;
        }

        toast({
            variant: 'destructive',
            title: 'Could not add to cart',
            description: result.error,
        });
    };

    const isDetail = variant === 'detail';
    const isSheet = variant === 'sheet';
    const isGrid = variant === 'grid';
    const quantityLabel = isDetail ? 'Quantity' : 'Qty';

    return (
        <div
            data-shop-cart
            className={cn(isSheet ? 'mt-0' : isGrid ? 'mt-2 sm:mt-3' : 'mt-3 space-y-2', className)}
            onClick={stopCardActivation}
            onKeyDown={stopCardActivation}
        >
            <div
                className={cn(
                    'flex w-full gap-2',
                    isSheet || isGrid ? 'flex-row items-center' : 'flex-col',
                    isGrid && 'sm:flex-col',
                )}
            >
                <div
                    className={cn(
                        'flex items-center gap-2',
                        isSheet || isGrid ? 'shrink-0' : isDetail ? 'justify-end' : 'justify-center',
                        isGrid && 'sm:justify-center',
                    )}
                >
                    <label
                        htmlFor={`shop-qty-${variant}-${productId}`}
                        className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8b6b4a]"
                    >
                        {quantityLabel}
                    </label>
                    <QuantityStepper
                        id={`shop-qty-${variant}-${productId}`}
                        value={quantity}
                        disabled={submitting}
                        onChange={setQuantity}
                    />
                </div>
                <Button
                    type="button"
                    variant="primary"
                    disabled={submitting}
                    className={cn(
                        'h-8 px-2 py-1.5 text-[10px] tracking-[0.14em]',
                        isSheet || isGrid ? 'min-w-0 flex-1' : 'w-full',
                        isGrid && 'sm:w-full',
                    )}
                    onClick={() => void handleAdd()}
                >
                    {submitting ? 'Adding…' : 'Add to cart'}
                </Button>
            </div>
        </div>
    );
}
