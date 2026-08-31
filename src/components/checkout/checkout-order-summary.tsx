'use client';

import Link from 'next/link';
import { RemoteImage } from '@/components/remote-image';
import { formatCheckoutCurrency } from '@/lib/checkout-utils';
import type { ShopCartView } from '@/lib/shop-cart-view';

type CheckoutOrderSummaryProps = {
    cart: ShopCartView;
    shipping: number;
    tax: number;
    estimatedTotal: number;
};

export function CheckoutOrderSummary({ cart, shipping, tax, estimatedTotal }: CheckoutOrderSummaryProps) {
    return (
        <aside className="min-w-0 rounded-sm border border-[#4a2518] bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 border-b border-[#e8dfd4] pb-3">
                <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-[#4a2518]">Order Summary</h2>
                <Link href="/cart" className="text-xs font-bold uppercase tracking-[0.08em] text-[#4a2518] underline-offset-2 hover:underline">
                    Edit
                </Link>
            </div>

            <ul className="divide-y divide-[#e8dfd4]">
                {cart.items.map((item) => (
                    <li key={item.id} className="flex gap-3 py-4">
                        <div className="relative size-16 shrink-0 overflow-hidden rounded-sm border border-[#d1b79a] bg-[#f6ebdd]">
                            {item.imagePath ? (
                                <RemoteImage
                                    src={item.imagePath}
                                    alt=""
                                    fill
                                    className="object-cover"
                                    sizes="64px"
                                />
                            ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm leading-snug text-[#4a2518]">{item.productName}</p>
                            <div className="mt-2 flex items-center justify-between gap-3 text-sm text-[#4a2518]">
                                <span>Qty: {item.quantity}</span>
                                <span className="font-semibold tabular-nums">{formatCheckoutCurrency(item.lineTotal)}</span>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>

            <dl className="mt-2 space-y-2 border-t border-[#e8dfd4] pt-4 text-sm text-[#4a2518]">
                <div className="flex items-center justify-between gap-3">
                    <dt className="font-bold uppercase tracking-[0.06em]">Subtotal</dt>
                    <dd className="font-semibold tabular-nums">{formatCheckoutCurrency(cart.subTotal)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                    <dt className="font-bold uppercase tracking-[0.06em]">Shipping</dt>
                    <dd className="font-semibold tabular-nums">{formatCheckoutCurrency(shipping)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                    <dt className="font-bold uppercase tracking-[0.06em]">Tax</dt>
                    <dd className="font-semibold tabular-nums">{formatCheckoutCurrency(0)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-[#e8dfd4] pt-3">
                    <dt className="text-base font-bold uppercase tracking-[0.06em]">Estimated Total</dt>
                    <dd className="text-base font-bold tabular-nums">{formatCheckoutCurrency(estimatedTotal)}</dd>
                </div>
            </dl>
        </aside>
    );
}
