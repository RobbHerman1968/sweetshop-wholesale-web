import Link from 'next/link';
import moment from 'moment-timezone';
import { RemoteImage } from '@/components/remote-image';
import type { ManageOrderDetail } from '@/lib/db-pg/actions/order';
import { OrderEmailActions } from './order-email-actions';

type OrderDetailContentProps = {
    detail: ManageOrderDetail;
    backHref: string;
    sendEmailFrom: string | null;
    developerEmail: string | null;
    salesEmail: string | null;
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
    // Legacy order snapshots often store bare filenames — not valid next/image srcs.
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

export function OrderDetailContent({ detail, backHref, sendEmailFrom, developerEmail, salesEmail }: OrderDetailContentProps) {
    const { order, items, addresses, user, account } = detail;
    const sortedAddresses = [...addresses].sort((a, b) => addressSortOrder(a.type) - addressSortOrder(b.type));
    const orderLabel = order.orderNumber ?? order.id;
    const customerName =
        account?.name?.trim() ||
        [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
        user?.userName?.trim() ||
        (account ? `Account #${account.id}` : `User #${order.userId}`);
    const accountMateId = account?.accountMateId?.trim() || user?.accountMateId?.trim() || null;
    const billingEmail =
        sortedAddresses.find((address) => {
            const type = address.type.trim().toLowerCase();
            return type === 'b' || type.includes('bill');
        })?.emailAddress?.trim() || null;
    const shippingEmail =
        sortedAddresses.find((address) => {
            const type = address.type.trim().toLowerCase();
            return type === 's' || type.includes('ship');
        })?.emailAddress?.trim() || null;
    const customerEmail = billingEmail || shippingEmail || user?.userName?.trim() || null;

    return (
        <div className="mx-auto w-full max-w-7xl space-y-6">
            <div className="flex flex-wrap items-center gap-3">
                <Link href={backHref} className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34] underline-offset-4 hover:underline">
                    ← Back to orders
                </Link>
            </div>

            <header className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="text-[14px] font-semibold uppercase tracking-[0.3em] text-[#6e4a34]">Order #{orderLabel}</h1>
                    <OrderEmailActions
                        orderId={order.id}
                        sendEmailFrom={sendEmailFrom}
                        developerEmail={developerEmail}
                        salesEmail={salesEmail}
                        customerEmail={customerEmail}
                        actions={['customer', 'sales']}
                    />
                </div>
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
                    {order.isNewCustomerOrder ? (
                        <p className="font-semibold uppercase tracking-[0.12em] text-[#4a2518]">New customer order</p>
                    ) : null}
                </div>
            </header>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                <section className="space-y-4 rounded-2xl border border-[#c49a78] bg-[#f8eddf] p-4 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Customer</h2>
                        {account ? (
                            <Link
                                href={`/manage/accounts/${account.id}`}
                                className="inline-flex items-center rounded-md border border-[#c49a78] bg-white/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#5c4032] transition-colors hover:bg-[#f3e0cf] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a78] focus-visible:ring-offset-2"
                            >
                                Manage account
                            </Link>
                        ) : null}
                    </div>
                    <div className="space-y-1 text-xs text-[#4a2518]">
                        <p className="font-semibold">{customerName}</p>
                        {accountMateId ? <p>AccountMate ID: {accountMateId}</p> : null}
                        {user?.userName ? <p>{user.userName}</p> : null}
                        {account ? <p className="text-[#6e4a34]">Account ID: {account.id}</p> : null}
                    </div>
                </section>

                <section className="space-y-3 rounded-2xl border border-[#c49a78] bg-[#f8eddf] p-4 sm:p-6">
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
            </div>

            {sortedAddresses.length > 0 ? (
                <section className="grid gap-4 rounded-2xl border border-[#c49a78] bg-[#f8eddf] p-4 sm:grid-cols-2 sm:p-6">
                    {sortedAddresses.map((address) => (
                        <AddressBlock key={address.id} address={address} />
                    ))}
                </section>
            ) : null}

            <section className="space-y-3">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Line Items ({items.length})</h2>
                {items.length === 0 ? (
                    <p className="rounded-2xl border border-[#c49a78] bg-[#f8eddf] p-6 text-center text-xs text-[#6e4a34]">No line items found.</p>
                ) : (
                    <div className="overflow-x-auto rounded-md border border-[#c49a78] bg-[#f8eddf]">
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
                )}
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 rounded-2xl border border-[#c49a78] bg-[#f8eddf] p-4 sm:p-6">
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

                <div className="space-y-2 rounded-2xl border border-[#c49a78] bg-[#f8eddf] p-4 sm:p-6">
                    <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Fulfillment</h2>
                    <dl className="space-y-1 text-xs text-[#4a2518]">
                        <div className="flex justify-between gap-4">
                            <dt>Expected delivery</dt>
                            <dd>{formatExpectedDeliveryDateCentral(order.expectedDeliveryDate)}</dd>
                        </div>
                        <div className="flex justify-between gap-4">
                            <dt>AM return status</dt>
                            <dd>{order.accountMateReturnStatus?.trim() || '—'}</dd>
                        </div>
                        <div className="flex justify-between gap-4">
                            <dt>AM transaction ID</dt>
                            <dd className="font-mono break-all text-right">{order.accountMateTransactionId?.trim() || '—'}</dd>
                        </div>
                    </dl>
                </div>
            </section>

            {order.comment?.trim() ? (
                <section className="rounded-2xl border border-[#c49a78] bg-[#f8eddf] p-4 sm:p-6">
                    <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Comment</h2>
                    <p className="whitespace-pre-wrap text-xs text-[#4a2518]">{order.comment.trim()}</p>
                </section>
            ) : null}

            <div className="flex justify-end border-t border-[#d4c4b0] pt-4">
                <OrderEmailActions
                    orderId={order.id}
                    sendEmailFrom={sendEmailFrom}
                    developerEmail={developerEmail}
                    salesEmail={salesEmail}
                    customerEmail={customerEmail}
                    actions={['developer']}
                />
            </div>
        </div>
    );
}
