'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { RemoteImage } from '@/components/remote-image';
import {
    removeManageCartItem,
    updateManageCartItemQuantity,
} from '@/lib/manage-cart-actions';
import type { ShopCartView } from '@/lib/shop-cart-view';
import { toast } from '@/hooks/use-toast';

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
    cartId: number;
    item: ShopCartView['items'][number];
    busy: boolean;
    onUpdated: (cart: ShopCartView) => void;
};

function CartLineRow({ cartId, item, busy, onUpdated }: CartLineRowProps) {
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
            const result = await updateManageCartItemQuantity(cartId, item.id, parsed);
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
            onUpdated(result.cart);
            toast({ title: 'Cart updated' });
        },
        [cartId, item.id, item.quantity, onUpdated],
    );

    const handleRemove = async () => {
        setRowBusy(true);
        const result = await removeManageCartItem(cartId, item.id);
        setRowBusy(false);

        if (!result.ok) {
            toast({
                variant: 'destructive',
                title: 'Could not remove item',
                description: result.error,
            });
            return;
        }

        onUpdated(result.cart);
        if (result.cart.items.length > 0) {
            toast({ title: 'Item removed' });
        }
    };

    const isDisabled = busy || rowBusy;

    return (
        <tr className="border-b border-[#d1b79a]/40">
            <td className="px-3 py-3 align-middle">
                <div className="relative aspect-square w-16 overflow-hidden rounded-md border border-[#b89572]/60 bg-white">
                    {item.imagePath ? (
                        <RemoteImage src={item.imagePath} alt={item.productName} sizes="64px" />
                    ) : (
                        <div className="flex h-full items-center justify-center text-[9px] font-medium uppercase tracking-wider text-[#8b6b4a]">
                            No image
                        </div>
                    )}
                </div>
            </td>
            <td className="px-3 py-3 align-middle text-left">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#4a2518]">{item.productName}</p>
                <p className="mt-0.5 text-[10px] text-[#6e4a34]">{item.itemNumber ? `Item #${item.itemNumber}` : '—'}</p>
            </td>
            <td className="px-3 py-3 align-middle text-right text-[11px] tabular-nums">{formatCurrency(item.unitPrice)}</td>
            <td className="px-3 py-3 align-middle">
                <QuantityStepper
                    id={`manage-cart-qty-${item.id}`}
                    value={quantity}
                    disabled={isDisabled}
                    onChange={setDraftQuantity}
                    onCommit={(value) => void persistQuantity(value)}
                />
            </td>
            <td className="px-3 py-3 align-middle text-right text-[11px] font-semibold tabular-nums">{formatCurrency(item.lineTotal)}</td>
            <td className="px-3 py-3 align-middle text-right">
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
            </td>
        </tr>
    );
}

type ManageCartDetailContentProps = {
    cartId: number;
    initialCart: ShopCartView;
    backHref: string;
    minimumOrderAmount?: number | null;
};

export function ManageCartDetailContent({ cartId, initialCart, backHref, minimumOrderAmount = null }: ManageCartDetailContentProps) {
    const router = useRouter();
    const [cart, setCart] = useState(initialCart);

    useEffect(() => {
        setCart(initialCart);
    }, [initialCart]);

    const handleCartUpdated = useCallback(
        (nextCart: ShopCartView) => {
            if (nextCart.items.length === 0) {
                router.push(backHref);
                return;
            }
            setCart(nextCart);
        },
        [router, backHref],
    );

    const isBelowMinimumOrder =
        minimumOrderAmount != null && cart.items.length > 0 && cart.subTotal < minimumOrderAmount;

    return (
        <div className="mx-auto w-full max-w-7xl space-y-6">
            <div className="flex flex-wrap items-center gap-3">
                <Link href={backHref} className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34] underline-offset-4 hover:underline">
                    ← Back to active carts
                </Link>
            </div>

            <h1 className="text-[14px] font-semibold uppercase tracking-[0.3em] text-[#6e4a34]">Cart #{cartId}</h1>

            <div className="rounded-lg border border-[#c49a78] bg-[#f8eddf] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Account</p>
                <p className="mt-1 text-sm font-semibold text-[#4a2518]">{cart.accountDisplayName}</p>
                {cart.accountOwnerDisplayName ? (
                    <p className="mt-0.5 text-[11px] text-[#6e4a34]">{cart.accountOwnerDisplayName}</p>
                ) : null}
            </div>

            {cart.items.length === 0 ? (
                <p className="rounded-2xl border border-[#c49a78] bg-[#f8eddf] p-6 text-center text-xs text-[#6e4a34]">This cart is empty.</p>
            ) : (
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-start">
                    <div className="overflow-x-auto rounded-md border border-[#c49a78] bg-[#f8eddf]">
                        <table className="min-w-full border-collapse text-xs text-[#4a2518]">
                            <thead className="bg-[#e3cbb0] text-[11px] uppercase tracking-[0.16em]">
                                <tr>
                                    <th className="px-3 py-2 text-left w-20">Image</th>
                                    <th className="px-3 py-2 text-left min-w-40">Product</th>
                                    <th className="px-3 py-2 text-right w-24">Unit Price</th>
                                    <th className="px-3 py-2 text-left w-36">Quantity</th>
                                    <th className="px-3 py-2 text-right w-24">Line Total</th>
                                    <th className="px-3 py-2 text-right w-28"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {cart.items.map((item) => (
                                    <CartLineRow key={item.id} cartId={cartId} item={item} busy={false} onUpdated={handleCartUpdated} />
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <aside className="rounded-lg border border-[#c49a78] bg-[#f8eddf] p-5">
                        <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6e4a34]">Cart summary</h2>
                        <dl className="mt-4 space-y-2 text-sm text-[#4a2518]">
                            <div className="flex items-center justify-between gap-3">
                                <dt>Products</dt>
                                <dd className="font-semibold tabular-nums">{cart.itemCount}</dd>
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
                        {isBelowMinimumOrder ? (
                            <p className="mt-4 rounded-md border border-[#e57373] bg-[#fde8e0] px-3 py-2 text-center text-xs font-medium text-[#991b1b]">
                                Minimum order is {formatCurrency(minimumOrderAmount)}.
                            </p>
                        ) : null}
                    </aside>
                </div>
            )}
        </div>
    );
}
