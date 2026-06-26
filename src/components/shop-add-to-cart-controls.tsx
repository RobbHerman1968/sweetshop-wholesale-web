'use client';

import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { addProductToShopCart } from '@/lib/shop-cart-actions';
import { useShopCartStore } from '@/store/useShopCartStore';
import { cn } from '@/lib/utils';

type Props = {
    productId: number;
    className?: string;
    /** Grid cards: centered "Qty". Product details: right-aligned "Quantity". */
    variant?: 'grid' | 'detail';
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
    const [feedback, setFeedback] = useState<string | null>(null);
    const [feedbackIsError, setFeedbackIsError] = useState(false);

    const stopCardActivation = (e: React.SyntheticEvent) => {
        e.stopPropagation();
    };

    const handleAdd = async () => {
        const parsed = parsePositiveQuantity(quantity);
        if (parsed == null) {
            setFeedback('Quantity must be greater than zero.');
            setFeedbackIsError(true);
            return;
        }

        setSubmitting(true);
        setFeedback(null);

        const result = await addProductToShopCart(productId, parsed);
        setSubmitting(false);

        if (result.ok) {
            useShopCartStore.getState().setItemCount(result.itemCount);
            setFeedback('Added to cart');
            setFeedbackIsError(false);
            setQuantity('1');
            return;
        }

        setFeedback(result.error);
        setFeedbackIsError(true);
    };

    const isDetail = variant === 'detail';
    const quantityLabel = isDetail ? 'Quantity' : 'Qty';

    return (
        <div
            data-shop-cart
            className={cn('mt-3 space-y-2', className)}
            onClick={stopCardActivation}
            onKeyDown={stopCardActivation}
        >
            <div className="flex w-full flex-col gap-2">
                <div className={cn('flex items-center gap-2', isDetail ? 'justify-end' : 'justify-center')}>
                    <label
                        htmlFor={`shop-qty-${productId}`}
                        className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8b6b4a]"
                    >
                        {quantityLabel}
                    </label>
                    <QuantityStepper
                        id={`shop-qty-${productId}`}
                        value={quantity}
                        disabled={submitting}
                        onChange={setQuantity}
                    />
                </div>
                <Button
                    type="button"
                    variant="primary"
                    disabled={submitting}
                    className="h-8 w-full px-2 py-1.5 text-[10px] tracking-[0.14em]"
                    onClick={() => void handleAdd()}
                >
                    {submitting ? 'Adding…' : 'Add to cart'}
                </Button>
            </div>
            {feedback ? (
                <p
                    className={cn(
                        'text-[10px] font-medium uppercase tracking-[0.16em]',
                        isDetail ? 'text-right' : 'text-center',
                        feedbackIsError ? 'text-[#8b2e2e]' : 'text-[#3d6b3d]',
                    )}
                    role={feedbackIsError ? 'alert' : 'status'}
                >
                    {feedback}
                </p>
            ) : null}
        </div>
    );
}
