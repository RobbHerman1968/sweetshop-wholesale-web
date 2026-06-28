import Link from 'next/link';
import moment from 'moment-timezone';
import { RemoteImage } from '@/components/remote-image';
import type { ManageOrderDetail } from '@/lib/db-pg/actions/order';
import { cn } from '@/lib/utils';

type CustomerOrderDetailContentProps = {
    detail: ManageOrderDetail;
};

function formatMoney(value: string | number | null | undefined): string {
    return `$${Number(value ?? 0).toFixed(2)}`;
}

function formatOrderDateCentral(orderDate: string | null): string {
    if (!orderDate) return '—';
    return moment.utc(orderDate).local().format('MM/DD/YYYY hh:mm A');
}

function formatExpectedDeliveryDateCentral(expectedDeliveryDate: string | null): string {
    if (!expectedDeliveryDate) return '—';
    return moment.utc(expectedDeliveryDate).local().format('MM/DD/YYYY');
}

function formatAddressLabel(type: string): string {
    const normalized = type.trim().toLowerCase();
    if (normalized === 's' || normalized.includes('ship')) return 'Shipping';
    if (normalized === 'b' || normalized.includes('bill')) return 'Billing';
    return type.trim() || 'Address';
}

function addressSortOrder(type: string): number {
    const normalized = type.trim().toLowerCase();
    if (normalized === 's' || normalized.includes('ship')) return 0;
    if (normalized === 'b' || normalized.includes('bill')) return 1;
    return 2;
}

function resolveOrderItemImageSrc(imagePath: string | null): string | null {
    const trimmed = imagePath?.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    if (trimmed.startsWith('/')) return `https://www.sweetshopusa.com${trimmed}`;
    return null;
}

function AddressBlock({ address }: { address: ManageOrderDetail['addresses'][number] }) {
    const name = [address.firstName, address.lastName].filter(Boolean).join(' ').trim() || address.lastName;

    return (
        <div className="space-y-1 text-xs text-[#4a2518]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6e4a34]">{formatAddressLabel(address.type)}</p>
            <p className="font-semibold">{name}</p>
            {address.companyName ? <p>{address.companyName}</p> : null}
            <p>{address.address1}</p>
            {address.address2 ? <p>{address.address2}</p> : null}
            <p>
                {address.city}, {address.state} {address.postalCode}
            </p>
            <p>{address.country}</p>
            {address.phoneNumber ? <p>{address.phoneNumber}</p> : null}
            {address.emailAddress ? <p>{address.emailAddress}</p> : null}
        </div>
    );
}

export function CustomerOrderDetailContent({ detail }: CustomerOrderDetailContentProps) {
    const { order, items, addresses } = detail;
    const sortedAddresses = [...addresses].sort((a, b) => addressSortOrder(a.type) - addressSortOrder(b.type));
    const orderLabel = order.orderNumber ?? order.id;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
                <Link href="/account" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34] underline-offset-4 hover:underline">
                    ← Back to account
                </Link>
            </div>

            <header className="space-y-2">
                <h1 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#4a2518]">Order #{orderLabel}</h1>
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-[#6e4a34]">
                    <p>
                        <span className="font-semibold uppercase tracking-[0.12em]">Date:</span> {formatOrderDateCentral(order.orderDate)}
                    </p>
                    {order.accountMateOrderNumber != null ? (
                        <p>
                            <span className="font-semibold uppercase tracking-[0.12em]">AM Order #:</span> {order.accountMateOrderNumber}
                        </p>
                    ) : null}
                    <p>
                        <span className="font-semibold uppercase tracking-[0.12em]">Ship Code:</span> {order.shippingCode || '—'}
                    </p>
                </div>
            </header>

            <section className="max-w-md space-y-3 rounded-lg border border-[#d4c4b0] bg-[#fdf7ef] p-4 sm:p-6">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Totals</h2>
                <dl className="space-y-2 text-xs text-[#4a2518]">
                    <div className="flex items-center justify-between gap-4">
                        <dt>Subtotal</dt>
                        <dd className="font-mono tabular-nums">{formatMoney(order.subTotal)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <dt>Shipping</dt>
                        <dd className="font-mono tabular-nums">{formatMoney(order.shipping)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <dt>Tax</dt>
                        <dd className="font-mono tabular-nums">{formatMoney(order.tax)}</dd>
                    </div>
                    {order.promotionDiscount != null && Number(order.promotionDiscount) !== 0 ? (
                        <div className="flex items-center justify-between gap-4">
                            <dt>Promotion{order.promotionCode != null ? ` (${order.promotionCode})` : ''}</dt>
                            <dd className="font-mono tabular-nums">-{formatMoney(order.promotionDiscount)}</dd>
                        </div>
                    ) : null}
                    <div className="flex items-center justify-between gap-4 border-t border-[#c49a78] pt-2 text-sm font-semibold">
                        <dt>Total</dt>
                        <dd className="font-mono tabular-nums">{formatMoney(order.total)}</dd>
                    </div>
                </dl>
            </section>

            {sortedAddresses.length > 0 ? (
                <section className="grid gap-4 rounded-lg border border-[#d4c4b0] bg-[#fdf7ef] p-4 sm:grid-cols-2 sm:p-6">
                    {sortedAddresses.map((address) => (
                        <AddressBlock key={address.id} address={address} />
                    ))}
                </section>
            ) : null}

            <section className="space-y-3">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Line Items ({items.length})</h2>
                {items.length === 0 ? (
                    <p className="rounded-lg border border-[#d4c4b0] bg-[#fdf7ef] p-6 text-center text-xs text-[#6e4a34]">No line items found.</p>
                ) : (
                    <>
                        <div className="rounded-md border border-[#c49a78] bg-[#f8eddf] sm:hidden">
                            <ul className="divide-y divide-[#c49a78]">
                                {items.map((item, idx) => {
                                    const imageSrc = resolveOrderItemImageSrc(item.imagePath);
                                    const isEven = idx % 2 === 0;
                                    const unitPrice = Number(item.promotionPrice) > 0 ? item.promotionPrice : item.price;

                                    return (
                                        <li
                                            key={item.id}
                                            className={cn('flex gap-3 p-3', isEven ? 'bg-[#fdf7ef]' : 'bg-[#f8eddf]')}
                                        >
                                            {imageSrc ? (
                                                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded border border-[#c49a78] bg-white">
                                                    <RemoteImage src={imageSrc} alt={item.name} sizes="64px" />
                                                </div>
                                            ) : (
                                                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded border border-[#c49a78] bg-[#fdf7ef] text-[10px] text-[#7c5b44]">
                                                    —
                                                </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <p className="font-sans text-[11px] font-semibold leading-snug text-[#4a2518]">{item.name}</p>
                                                {item.variableData ? (
                                                    <p className="mt-1 font-sans text-[10px] text-[#6e4a34]">{item.variableData}</p>
                                                ) : null}
                                                <p className="mt-1 font-mono text-[10px] text-[#6e4a34]">Item # {item.itemNumber}</p>
                                                <div className="mt-2 flex items-center justify-between gap-3 font-mono text-[11px] text-[#4a2518]">
                                                    <span>
                                                        Qty {item.quantity}
                                                        <span className="mx-1 text-[#6e4a34]">·</span>
                                                        {formatMoney(unitPrice)}
                                                    </span>
                                                    <span className="font-semibold tabular-nums">{formatMoney(item.lineTotal)}</span>
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>

                        <div className="hidden overflow-x-auto rounded-md border border-[#c49a78] bg-[#f8eddf] sm:block">
                            <table className="min-w-full border-collapse text-xs text-[#4a2518]">
                            <thead className="bg-[#e3cbb0] text-[11px] uppercase tracking-[0.16em]">
                                <tr>
                                    <th className="px-3 py-2 text-left w-16"></th>
                                    <th className="px-3 py-2 text-left">Item</th>
                                    <th className="px-3 py-2 text-center w-28">Item #</th>
                                    <th className="px-3 py-2 text-center w-20">Qty</th>
                                    <th className="px-3 py-2 text-right w-24">Price</th>
                                    <th className="px-3 py-2 text-right w-24">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, idx) => {
                                    const imageSrc = resolveOrderItemImageSrc(item.imagePath);
                                    const isEven = idx % 2 === 0;
                                    const unitPrice = Number(item.promotionPrice) > 0 ? item.promotionPrice : item.price;

                                    return (
                                        <tr key={item.id} className={isEven ? 'bg-[#fdf7ef] font-mono' : 'bg-[#f8eddf] font-mono'}>
                                            <td className="px-3 py-2 align-middle">
                                                {imageSrc ? (
                                                    <div className="relative h-12 w-12 overflow-hidden rounded border border-[#c49a78] bg-white">
                                                        <RemoteImage src={imageSrc} alt={item.name} sizes="48px" />
                                                    </div>
                                                ) : (
                                                    <div className="flex h-12 w-12 items-center justify-center rounded border border-[#c49a78] bg-[#fdf7ef] text-[10px] text-[#7c5b44]">—</div>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 align-middle">
                                                <p className="font-sans text-[11px] font-semibold text-[#4a2518]">{item.name}</p>
                                                {item.variableData ? <p className="mt-1 font-sans text-[10px] text-[#6e4a34]">{item.variableData}</p> : null}
                                            </td>
                                            <td className="px-3 py-2 align-middle text-center text-[11px]">{item.itemNumber}</td>
                                            <td className="px-3 py-2 align-middle text-center text-[11px]">{item.quantity}</td>
                                            <td className="px-3 py-2 align-middle text-right text-[11px]">{formatMoney(unitPrice)}</td>
                                            <td className="px-3 py-2 align-middle text-right text-[11px] font-semibold">{formatMoney(item.lineTotal)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            </table>
                        </div>
                    </>
                )}
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 rounded-lg border border-[#d4c4b0] bg-[#fdf7ef] p-4 sm:p-6">
                    <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Payment</h2>
                    <dl className="space-y-1 text-xs text-[#4a2518]">
                        <div className="flex justify-between gap-4">
                            <dt>Card type</dt>
                            <dd>{order.ccType?.trim() || '—'}</dd>
                        </div>
                        <div className="flex justify-between gap-4">
                            <dt>Last four</dt>
                            <dd className="font-mono">{order.ccLastFour?.trim() ? `•••• ${order.ccLastFour.trim()}` : '—'}</dd>
                        </div>
                        <div className="flex justify-between gap-4">
                            <dt>Expiration</dt>
                            <dd className="font-mono">{order.ccExp?.trim() || '—'}</dd>
                        </div>
                    </dl>
                </div>

                <div className="space-y-2 rounded-lg border border-[#d4c4b0] bg-[#fdf7ef] p-4 sm:p-6">
                    <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Fulfillment</h2>
                    <dl className="space-y-1 text-xs text-[#4a2518]">
                        <div className="flex justify-between gap-4">
                            <dt>Expected delivery</dt>
                            <dd>{formatExpectedDeliveryDateCentral(order.expectedDeliveryDate)}</dd>
                        </div>
                    </dl>
                </div>
            </section>

            {order.comment?.trim() ? (
                <section className="rounded-lg border border-[#d4c4b0] bg-[#fdf7ef] p-4 sm:p-6">
                    <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Comment</h2>
                    <p className="whitespace-pre-wrap text-xs text-[#4a2518]">{order.comment.trim()}</p>
                </section>
            ) : null}
        </div>
    );
}
