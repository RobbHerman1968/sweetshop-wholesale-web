'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { RemoteImage } from '@/components/remote-image';
import { refreshShopCartCount } from '@/lib/shop-cart-count-client';
import {
    removeShopCartItem,
    updateShopCartItemQuantity,
} from '@/lib/shop-cart-actions';
import type { ShopCartView } from '@/lib/shop-cart-view';
import { toast } from '@/hooks/use-toast';
import { useShopCartStore } from '@/store/useShopCartStore';
import { cn } from '@/lib/utils';

function parsePositiveQuantity(value: string): number | null {
    const parsed = parseInt(value.trim(), 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return null;
    }
    return parsed;
}

function formatCurrency(value: number) {
    return `$${value.toFixed(2)}`;
}

type QuantityStepperProps = {
    id: string;
    value: string;
    disabled?: boolean;
    onChange: (value: string) => void;
    onCommit: (value: string) => void;
};

function QuantityStepper({ id, value, disabled, onChange, onCommit }: QuantityStepperProps) {
    const current = parsePositiveQuantity(value) ?? 1;

    const commitValue = (next: string) => {
        onChange(next);
        onCommit(next);
    };

    return (
        <div className="inline-flex h-8 w-30 overflow-hidden rounded-md border border-[#d1b79a] bg-white">
            <button
                type="button"
                aria-label="Decrease quantity"
                disabled={disabled || current <= 1}
                onClick={() => commitValue(String(Math.max(1, current - 1)))}
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
                onChange={(e) => {
                    const next = e.target.value;
                    if (next === '' || /^\d+$/.test(next)) {
                        onChange(next);
                    }
                }}
                onBlur={() => {
                    const parsed = parsePositiveQuantity(value);
                    const normalized = parsed != null ? String(parsed) : '1';
                    onChange(normalized);
                    onCommit(normalized);
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.currentTarget.blur();
                    }
                }}
                className="h-8 w-10 min-w-0 flex-1 rounded-none border-0 px-0 text-center text-sm tabular-nums shadow-none focus-visible:ring-0"
            />
            <button
                type="button"
                aria-label="Increase quantity"
                disabled={disabled}
                onClick={() => commitValue(String(current + 1))}
                className="inline-flex w-8 shrink-0 items-center justify-center border-l border-[#d1b79a] text-[#4a2518] transition-colors hover:bg-[#f6ebdd] disabled:cursor-not-allowed disabled:opacity-40"
            >
                <Plus className="size-3" strokeWidth={2.25} aria-hidden />
            </button>
        </div>
    );
}

type CartLineRowProps = {
    item: ShopCartView['items'][number];
    busy: boolean;
    onUpdated: (cart: ShopCartView, itemCount: number) => void;
};

function CartLineRow({ item, busy, onUpdated }: CartLineRowProps) {
    const [draftQuantity, setDraftQuantity] = useState<string | null>(null);
    const [rowBusy, setRowBusy] = useState(false);
    const quantity = draftQuantity ?? String(item.quantity);

    useEffect(() => {
        setDraftQuantity(null);
    }, [item.quantity, item.lineTotal]);

    const persistQuantity = useCallback(
        async (rawValue: string) => {
            const parsed = parsePositiveQuantity(rawValue);
            if (parsed == null) {
                toast({
                    variant: 'destructive',
                    title: 'Invalid quantity',
                    description: 'Quantity must be greater than zero.',
                });
                setDraftQuantity(null);
                return;
            }

            if (parsed === item.quantity) {
                setDraftQuantity(null);
                return;
            }

            setRowBusy(true);
            const result = await updateShopCartItemQuantity(item.id, parsed);
            setRowBusy(false);

            if (!result.ok) {
                setDraftQuantity(null);
                toast({
                    variant: 'destructive',
                    title: 'Could not update cart',
                    description: result.error,
                });
                return;
            }

            setDraftQuantity(null);
            useShopCartStore.getState().setItemCount(result.itemCount);
            onUpdated(result.cart, result.itemCount);
            toast({ title: 'Cart updated' });
        },
        [item.id, item.quantity, onUpdated],
    );

    const handleRemove = async () => {
        setRowBusy(true);
        const result = await removeShopCartItem(item.id);
        setRowBusy(false);

        if (!result.ok) {
            toast({
                variant: 'destructive',
                title: 'Could not remove item',
                description: result.error,
            });
            return;
        }

        useShopCartStore.getState().setItemCount(result.itemCount);
        void refreshShopCartCount();
        onUpdated(result.cart, result.itemCount);
        toast({ title: 'Item removed' });
    };

    const isDisabled = busy || rowBusy;

    return (
        <li className="border-b border-[#d1b79a]/40 py-3">
            <div className="flex items-start gap-3">
                <div className="relative aspect-square w-20 shrink-0 overflow-hidden rounded-md border border-[#b89572]/60 bg-white">
                    {item.imagePath ? (
                        <RemoteImage src={item.imagePath} alt={item.productName} sizes="80px" />
                    ) : (
                        <div className="flex h-full items-center justify-center text-[10px] font-medium uppercase tracking-wider text-[#8b6b4a]">
                            No image
                        </div>
                    )}
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                    <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-[#4a2518] sm:hidden">
                        {item.productName}
                    </h2>

                    <div className="hidden items-start gap-3 sm:flex">
                        <h2 className="min-w-0 flex-1 text-sm font-bold uppercase tracking-[0.12em] text-[#4a2518]">
                            {item.productName}
                        </h2>
                        <QuantityStepper
                            id={`cart-qty-${item.id}`}
                            value={quantity}
                            disabled={isDisabled}
                            onChange={setDraftQuantity}
                            onCommit={(value) => void persistQuantity(value)}
                        />
                        <button
                            type="button"
                            disabled={isDisabled}
                            aria-label={`Remove ${item.productName}`}
                            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-[#c49a78] px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7a2818] transition-colors hover:bg-[#fde8e0] disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={() => void handleRemove()}
                        >
                            <Trash2 className="size-3.5" aria-hidden />
                            Remove
                        </button>
                    </div>

                    <p className="text-[11px] text-[#6e4a34]">{item.itemNumber ? `Item #${item.itemNumber}` : '—'}</p>

                    <div className="flex items-center justify-between gap-3 sm:hidden">
                        <QuantityStepper
                            id={`cart-qty-mobile-${item.id}`}
                            value={quantity}
                            disabled={isDisabled}
                            onChange={setDraftQuantity}
                            onCommit={(value) => void persistQuantity(value)}
                        />
                        <button
                            type="button"
                            disabled={isDisabled}
                            aria-label={`Remove ${item.productName}`}
                            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-[#c49a78] px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7a2818] transition-colors hover:bg-[#fde8e0] disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={() => void handleRemove()}
                        >
                            <Trash2 className="size-3.5" aria-hidden />
                            Remove
                        </button>
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-3 border-t border-[#d1b79a]/40 pt-2">
                        <p className="text-sm font-semibold text-[#4a2518]">{formatCurrency(item.unitPrice)} each</p>
                        <p className="shrink-0 text-right text-sm font-semibold tabular-nums text-[#4a2518]">
                            Line total: {formatCurrency(item.lineTotal)}
                        </p>
                    </div>
                </div>
            </div>
        </li>
    );
}

type Props = {
    initialCart: ShopCartView;
    minimumOrderAmount?: number | null;
};

export function ShopCartContent({ initialCart, minimumOrderAmount = null }: Props) {
    const [cart, setCart] = useState(initialCart);

    useEffect(() => {
        setCart(initialCart);
        useShopCartStore.getState().setItemCount(initialCart.itemCount);
    }, [initialCart]);

    const handleCartUpdated = useCallback((nextCart: ShopCartView) => {
        setCart(nextCart);
        useShopCartStore.getState().setItemCount(nextCart.itemCount);
    }, []);

    const isBelowMinimumOrder =
        minimumOrderAmount != null && cart.items.length > 0 && cart.subTotal < minimumOrderAmount;

    return (
        <div className="space-y-6">
            <div className="rounded-lg border border-[#b89572] bg-[#fdf7ef] p-4 sm:p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Shopping for</p>
                <p className="mt-1 text-sm font-semibold text-[#4a2518]">{cart.accountDisplayName}</p>
                {cart.accountOwnerDisplayName ? (
                    <p className="mt-0.5 text-[11px] text-[#6e4a34]">{cart.accountOwnerDisplayName}</p>
                ) : null}
            </div>

            {cart.items.length === 0 ? (
                <div className="rounded-2xl border border-[#b89572] bg-[#f6ebdd] p-8 text-center">
                    <p className="text-sm text-[#5c4032]">Your cart is empty.</p>
                    <Link
                        href="/shop"
                        className="mt-4 inline-flex rounded-md bg-[#4a2518] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#fdf7ef] transition-colors hover:bg-[#3a1b11]"
                    >
                        Continue shopping
                    </Link>
                </div>
            ) : (
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
                    <section className="overflow-hidden rounded-lg border border-[#b89572] bg-[#fdf7ef] px-2 sm:px-3">
                        <ul>
                            {cart.items.map((item) => (
                                <CartLineRow
                                    key={item.id}
                                    item={item}
                                    busy={false}
                                    onUpdated={(nextCart) => handleCartUpdated(nextCart)}
                                />
                            ))}
                        </ul>
                    </section>

                    <aside className="rounded-lg border border-[#b89572] bg-[#fdf7ef] p-5">
                        <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6e4a34]">Order summary</h2>
                        <dl className="mt-4 space-y-2 text-sm text-[#4a2518]">
                            {cart.discounts > 0 ? (
                                <div className="flex items-center justify-between gap-3">
                                    <dt>Discounts</dt>
                                    <dd className="font-semibold tabular-nums">-{formatCurrency(cart.discounts)}</dd>
                                </div>
                            ) : null}
                            <div className="flex items-center justify-between gap-3">
                                <dt>Shipping</dt>
                                <dd className="font-semibold uppercase tracking-[0.12em] text-[#6e4a34]">TBD</dd>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <dt>Tax</dt>
                                <dd className="font-semibold uppercase tracking-[0.12em] text-[#6e4a34]">TBD</dd>
                            </div>
                            <div className="flex items-center justify-between gap-3 border-t border-[#d1b79a] pt-3 text-base">
                                <dt className="font-bold uppercase tracking-[0.12em]">Subtotal</dt>
                                <dd className="font-bold tabular-nums text-[#4a2518]">{formatCurrency(cart.subTotal)}</dd>
                            </div>
                        </dl>
                        {isBelowMinimumOrder ? (
                            <p className="mt-4 rounded-md border border-[#e57373] bg-[#fde8e0] px-3 py-2 text-center text-xs font-medium text-[#991b1b]">
                                Minimum order is {formatCurrency(minimumOrderAmount)}.
                            </p>
                        ) : null}
                        <Link
                            href="/shop"
                            className={cn(
                                'mt-5 inline-flex w-full items-center justify-center rounded-md border border-[#c49a78] px-4 py-2.5',
                                'text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6e4a34] transition-colors hover:bg-[#f3e0cf]',
                            )}
                        >
                            Continue shopping
                        </Link>
                        {isBelowMinimumOrder ? (
                            <button
                                type="button"
                                disabled
                                className={cn(
                                    'mt-3 inline-flex w-full cursor-not-allowed items-center justify-center rounded-md bg-[#4a2518] px-4 py-2.5',
                                    'text-[11px] font-semibold uppercase tracking-[0.18em] text-[#fdf7ef] opacity-50',
                                )}
                            >
                                Checkout
                            </button>
                        ) : (
                            <Link
                                href="/checkout"
                                className={cn(
                                    'mt-3 inline-flex w-full items-center justify-center rounded-md bg-[#4a2518] px-4 py-2.5',
                                    'text-[11px] font-semibold uppercase tracking-[0.18em] text-[#fdf7ef] transition-colors hover:bg-[#3a1b11]',
                                )}
                            >
                                Checkout
                            </Link>
                        )}
                    </aside>
                </div>
            )}
        </div>
    );
}
