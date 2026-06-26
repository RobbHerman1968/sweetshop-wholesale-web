'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RemoteImage } from '@/components/remote-image';
import { refreshShopCartCount } from '@/lib/shop-cart-count-client';
import {
    removeShopCartItem,
    updateShopCartItemQuantity,
    type ShopCartView,
} from '@/lib/shop-cart-actions';
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
};

function QuantityStepper({ id, value, disabled, onChange }: QuantityStepperProps) {
    const current = parsePositiveQuantity(value) ?? 1;

    return (
        <div className="inline-flex h-8 w-30 overflow-hidden rounded-md border border-[#d1b79a] bg-white">
            <button
                type="button"
                aria-label="Decrease quantity"
                disabled={disabled || current <= 1}
                onClick={() => onChange(String(Math.max(1, current - 1)))}
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
                    onChange(parsed != null ? String(parsed) : '1');
                }}
                className="h-8 w-10 min-w-0 flex-1 rounded-none border-0 px-0 text-center text-sm tabular-nums shadow-none focus-visible:ring-0"
            />
            <button
                type="button"
                aria-label="Increase quantity"
                disabled={disabled}
                onClick={() => onChange(String(current + 1))}
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
    onError: (message: string) => void;
};

function CartLineRow({ item, busy, onUpdated, onError }: CartLineRowProps) {
    const [quantity, setQuantity] = useState(String(item.quantity));
    const [rowBusy, setRowBusy] = useState(false);

    const handleUpdate = async () => {
        const parsed = parsePositiveQuantity(quantity);
        if (parsed == null) {
            onError('Quantity must be greater than zero.');
            return;
        }

        setRowBusy(true);
        onError('');
        const result = await updateShopCartItemQuantity(item.id, parsed);
        setRowBusy(false);

        if (!result.ok) {
            onError(result.error);
            return;
        }

        setQuantity(String(result.cart.items.find((line) => line.id === item.id)?.quantity ?? parsed));
        useShopCartStore.getState().setItemCount(result.itemCount);
        onUpdated(result.cart, result.itemCount);
    };

    const handleRemove = async () => {
        setRowBusy(true);
        onError('');
        const result = await removeShopCartItem(item.id);
        setRowBusy(false);

        if (!result.ok) {
            onError(result.error);
            return;
        }

        useShopCartStore.getState().setItemCount(result.itemCount);
        void refreshShopCartCount();
        onUpdated(result.cart, result.itemCount);
    };

    const isDisabled = busy || rowBusy;

    return (
        <li className="grid gap-3 border-b border-[#d1b79a]/40 py-3 sm:grid-cols-[5rem_minmax(0,1fr)_auto] sm:items-center">
            <div className="relative aspect-square w-20 overflow-hidden rounded-md border border-[#b89572]/60 bg-white sm:w-full">
                {item.imagePath ? (
                    <RemoteImage src={item.imagePath} alt={item.productName} sizes="80px" />
                ) : (
                    <div className="flex h-full items-center justify-center text-[10px] font-medium uppercase tracking-wider text-[#8b6b4a]">
                        No image
                    </div>
                )}
            </div>

            <div className="min-w-0 space-y-1">
                <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-[#4a2518]">{item.productName}</h2>
                <p className="text-[11px] text-[#6e4a34]">{item.itemNumber ? `Item #${item.itemNumber}` : '—'}</p>
                <p className="text-sm font-semibold text-[#4a2518]">{formatCurrency(item.unitPrice)} each</p>
            </div>

            <div className="flex flex-col gap-3 sm:items-end">
                <QuantityStepper
                    id={`cart-qty-${item.id}`}
                    value={quantity}
                    disabled={isDisabled}
                    onChange={setQuantity}
                />
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <Button
                        type="button"
                        variant="primary"
                        disabled={isDisabled}
                        className="h-8 px-3 py-1.5 text-[10px] tracking-[0.14em]"
                        onClick={() => void handleUpdate()}
                    >
                        {rowBusy ? 'Updating…' : 'Update'}
                    </Button>
                    <button
                        type="button"
                        disabled={isDisabled}
                        aria-label={`Remove ${item.productName}`}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#c49a78] px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7a2818] transition-colors hover:bg-[#fde8e0] disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => void handleRemove()}
                    >
                        <Trash2 className="size-3.5" aria-hidden />
                        Remove
                    </button>
                </div>
                <p className="text-sm font-semibold tabular-nums text-[#4a2518] sm:text-right">
                    Line total: {formatCurrency(item.lineTotal)}
                </p>
            </div>
        </li>
    );
}

type Props = {
    initialCart: ShopCartView;
};

export function ShopCartContent({ initialCart }: Props) {
    const [cart, setCart] = useState(initialCart);
    const [error, setError] = useState<string | null>(null);

    const handleCartUpdated = useCallback((nextCart: ShopCartView) => {
        setCart(nextCart);
        setError(null);
    }, []);

    const handleError = useCallback((message: string) => {
        setError(message.trim() ? message : null);
    }, []);

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
                                    onError={handleError}
                                />
                            ))}
                        </ul>
                    </section>

                    <aside className="rounded-lg border border-[#b89572] bg-[#fdf7ef] p-5">
                        <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6e4a34]">Order summary</h2>
                        <dl className="mt-4 space-y-2 text-sm text-[#4a2518]">
                            <div className="flex items-center justify-between gap-3">
                                <dt>Subtotal</dt>
                                <dd className="font-semibold tabular-nums">{formatCurrency(cart.subTotal)}</dd>
                            </div>
                            {cart.discounts > 0 ? (
                                <div className="flex items-center justify-between gap-3">
                                    <dt>Discounts</dt>
                                    <dd className="font-semibold tabular-nums">-{formatCurrency(cart.discounts)}</dd>
                                </div>
                            ) : null}
                            <div className="flex items-center justify-between gap-3">
                                <dt>Shipping</dt>
                                <dd className="font-semibold tabular-nums">{formatCurrency(cart.shipping)}</dd>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <dt>Tax</dt>
                                <dd className="font-semibold tabular-nums">{formatCurrency(cart.tax)}</dd>
                            </div>
                            <div className="flex items-center justify-between gap-3 border-t border-[#d1b79a] pt-3 text-base">
                                <dt className="font-bold uppercase tracking-[0.12em]">Total</dt>
                                <dd className="font-bold tabular-nums text-[#4a2518]">{formatCurrency(cart.total)}</dd>
                            </div>
                        </dl>
                        <Link
                            href="/shop"
                            className={cn(
                                'mt-5 inline-flex w-full items-center justify-center rounded-md border border-[#c49a78] px-4 py-2.5',
                                'text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6e4a34] transition-colors hover:bg-[#f3e0cf]',
                            )}
                        >
                            Continue shopping
                        </Link>
                    </aside>
                </div>
            )}

            {error ? (
                <p className="text-center text-[11px] font-medium uppercase tracking-[0.16em] text-[#8b2e2e]" role="alert">
                    {error}
                </p>
            ) : null}
        </div>
    );
}
