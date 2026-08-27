'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { approveExcelOrderSheetOrders } from '@/lib/db-pg/actions/excel-order-sheet-approve';
import { parseAndValidateExcelOrderSheet } from '@/lib/db-pg/actions/excel-order-sheet-validation';
import type { ExcelOrderSheetValidatedOrder } from '@/lib/excel-order-sheet/types';

const ACCEPTED_EXTENSIONS = '.csv,.xls,.xlsx';

function formatMoney(value: number) {
    return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function formatAddressPreview(company: string, address1: string, city: string, state: string, zip: string) {
    return (
        <>
            <div>{company || '—'}</div>
            {address1 ? <div className="text-[10px] text-[#6e4a34]">{address1}</div> : null}
            <div className="text-[10px] text-[#6e4a34]">
                {city}, {state} {zip}
            </div>
        </>
    );
}

export function UploadExcelOrderSheetContent() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [approving, setApproving] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    const [orders, setOrders] = useState<ExcelOrderSheetValidatedOrder[] | null>(null);
    const [approveResults, setApproveResults] = useState<
        Array<{
            lineNumber: number;
            ok: boolean;
            orderId?: number;
            orderNumber?: number;
            accountMateOrderNumber?: number | null;
            error?: string;
        }> | null
    >(null);

    function resetState() {
        setErrors([]);
        setOrders(null);
        setApproveResults(null);
    }

    function handleFileChange() {
        const file = fileInputRef.current?.files?.[0];
        setSelectedFileName(file?.name ?? null);
        resetState();
    }

    async function handleProcessSheet() {
        const file = fileInputRef.current?.files?.[0];
        if (!file) {
            toast({ title: 'Choose a file', description: 'Select an Excel or CSV order sheet first.', variant: 'destructive' });
            return;
        }

        setLoading(true);
        resetState();

        try {
            const formData = new FormData();
            formData.set('file', file);
            const result = await parseAndValidateExcelOrderSheet(formData);

            if (!result.ok) {
                setErrors(result.errors);
                toast({
                    title: 'Validation failed',
                    description: 'Fix the sheet and upload again. No orders were loaded.',
                    variant: 'destructive',
                });
                return;
            }

            setOrders(result.orders);
            toast({
                title: 'Sheet validated',
                description: `${result.orders.length} order${result.orders.length === 1 ? '' : 's'} ready for review. No orders were sent.`,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to process the file.';
            setErrors([message]);
            toast({ title: 'Upload failed', description: message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }

    async function handleApproveOrders() {
        if (!orders?.length) {
            return;
        }

        setApproving(true);
        setApproveResults(null);

        try {
            const result = await approveExcelOrderSheetOrders(orders);
            if (!result.ok) {
                toast({ title: 'Approval failed', description: result.error, variant: 'destructive' });
                return;
            }

            setApproveResults(result.results);
            setOrders(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            setSelectedFileName(null);

            const successCount = result.results.filter((row) => row.ok).length;
            toast({
                title: 'Orders submitted',
                description: `${successCount} of ${result.results.length} order${result.results.length === 1 ? '' : 's'} placed.`,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to approve orders.';
            toast({ title: 'Approval failed', description: message, variant: 'destructive' });
        } finally {
            setApproving(false);
        }
    }

    return (
        <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col gap-6">
            <div>
                <h1 className="text-[14px] font-semibold uppercase tracking-[0.3em] text-[#6e4a34]">
                    Upload Excel Order Sheet
                </h1>
                <p className="mt-2 max-w-3xl text-xs text-[#6e4a34]">
                    Each row is one order with legacy EDI fields plus AccountMateId. Validate checks accounts and items
                    only — it does not place orders or call AccountMate. Use Approve after review to submit.
                </p>
            </div>

            <section className="rounded-md border border-[#c49a78] bg-[#f8eddf] p-5">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Template & upload</h2>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                    <a
                        href="/manage/upload-excel-order-sheet/template"
                        className="inline-flex h-9 items-center justify-center rounded-md border border-[#c49a78] bg-white px-4 text-sm font-medium text-[#4a2518] hover:bg-[#f3e0cf]"
                    >
                        Download blank template
                    </a>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept={ACCEPTED_EXTENSIONS}
                        className="hidden"
                        onChange={handleFileChange}
                    />
                    <Button
                        type="button"
                        variant="outline"
                        className="border-[#c49a78] bg-white text-[#4a2518] hover:bg-[#f3e0cf]"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        Choose file
                    </Button>
                    <span className="text-xs text-[#6e4a34]">{selectedFileName ?? 'No file selected'}</span>
                    <Button type="button" disabled={loading} onClick={handleProcessSheet}>
                        {loading ? 'Validating…' : 'Validate sheet (preview only)'}
                    </Button>
                </div>
            </section>

            {errors.length > 0 ? (
                <section className="rounded-md border border-red-300 bg-red-50 p-5">
                    <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-red-800">
                        Validation stopped — fix all issues
                    </h2>
                    <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-red-900">
                        {errors.map((error) => (
                            <li key={error}>{error}</li>
                        ))}
                    </ul>
                </section>
            ) : null}

            {orders && orders.length > 0 ? (
                <section className="flex min-h-0 flex-1 flex-col gap-4 rounded-md border border-[#c49a78] bg-[#fdf7ef] p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                                Review orders
                            </h2>
                            <p className="mt-1 text-xs text-[#6e4a34]">
                                {orders.length} order{orders.length === 1 ? '' : 's'} passed validation. Review billing,
                                shipping, and line items before approving.
                            </p>
                        </div>
                        <Button type="button" disabled={approving} onClick={handleApproveOrders}>
                            {approving ? 'Placing orders…' : `Approve ${orders.length} order${orders.length === 1 ? '' : 's'}`}
                        </Button>
                    </div>

                    <div className="min-h-0 flex-1 overflow-auto rounded-md border border-[#c49a78] bg-[#f8eddf]">
                        <table className="min-w-full border-collapse text-xs text-[#4a2518]">
                            <thead className="sticky top-0 bg-[#e3cbb0] text-[11px] uppercase tracking-[0.14em]">
                                <tr>
                                    <th className="px-3 py-2 text-left">Row</th>
                                    <th className="px-3 py-2 text-left">AccountMate</th>
                                    <th className="px-3 py-2 text-left">PO</th>
                                    <th className="min-w-36 px-3 py-2 text-left">Comment</th>
                                    <th className="min-w-40 px-3 py-2 text-left">Bill to</th>
                                    <th className="min-w-40 px-3 py-2 text-left">Ship to</th>
                                    <th className="px-3 py-2 text-left">Item</th>
                                    <th className="px-3 py-2 text-right">Qty</th>
                                    <th className="px-3 py-2 text-right">Price</th>
                                    <th className="px-3 py-2 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map((orderRow, index) => (
                                    <tr key={orderRow.lineNumber} className={index % 2 === 0 ? 'bg-[#f8eddf]' : 'bg-[#fdf7ef]'}>
                                        <td className="px-3 py-2">{orderRow.lineNumber}</td>
                                        <td className="px-3 py-2">
                                            <div>{orderRow.accountMateId}</div>
                                            <div className="text-[10px] text-[#6e4a34]">{orderRow.accountName ?? '—'}</div>
                                        </td>
                                        <td className="px-3 py-2">{orderRow.po || '—'}</td>
                                        <td className="max-w-48 px-3 py-2">
                                            {orderRow.commentOrGiftMessage ? (
                                                <span className="line-clamp-3 whitespace-pre-wrap">
                                                    {orderRow.commentOrGiftMessage}
                                                </span>
                                            ) : (
                                                '—'
                                            )}
                                        </td>
                                        <td className="px-3 py-2">
                                            {formatAddressPreview(
                                                orderRow.billingCompany,
                                                orderRow.billingAddress1,
                                                orderRow.billingCity,
                                                orderRow.billingState,
                                                orderRow.billingZip,
                                            )}
                                        </td>
                                        <td className="px-3 py-2">
                                            {formatAddressPreview(
                                                orderRow.shippingCompany,
                                                orderRow.shippingAddress1,
                                                orderRow.shippingCity,
                                                orderRow.shippingState,
                                                orderRow.shippingZip,
                                            )}
                                        </td>
                                        <td className="px-3 py-2">
                                            <div>{orderRow.itemNumber}</div>
                                            <div className="text-[10px] text-[#6e4a34]">{orderRow.productName ?? '—'}</div>
                                        </td>
                                        <td className="px-3 py-2 text-right">{orderRow.quantity}</td>
                                        <td className="px-3 py-2 text-right">{formatMoney(orderRow.price)}</td>
                                        <td className="px-3 py-2 text-right">
                                            {formatMoney(orderRow.quantity * orderRow.price)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            ) : null}

            {approveResults && approveResults.length > 0 ? (
                <section className="rounded-md border border-[#c49a78] bg-[#f8eddf] p-5">
                    <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Results</h2>
                    <ul className="mt-3 space-y-2 text-xs text-[#4a2518]">
                        {approveResults.map((result) => (
                            <li key={result.lineNumber}>
                                Row {result.lineNumber}:{' '}
                                {result.ok ? (
                                    <>
                                        Web order #{result.orderNumber}
                                        {result.accountMateOrderNumber != null
                                            ? ` · AccountMate SO ${result.accountMateOrderNumber}`
                                            : ''}
                                        {result.orderId != null ? (
                                            <>
                                                {' '}
                                                ·{' '}
                                                <Link
                                                    href={`/manage/orders/${result.orderId}`}
                                                    className="underline hover:text-[#6e4a34]"
                                                >
                                                    View order
                                                </Link>
                                            </>
                                        ) : null}
                                    </>
                                ) : (
                                    <span className="text-red-800">{result.error ?? 'Failed'}</span>
                                )}
                            </li>
                        ))}
                    </ul>
                </section>
            ) : null}
        </div>
    );
}
