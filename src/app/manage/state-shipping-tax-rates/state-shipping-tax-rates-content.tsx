'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { reloadOnSearchClear } from '@/lib/manage-search-clear';
import type { StateShippingTaxRateRow } from '@/lib/db-pg/actions/state-shipping-tax-rate';
import { cn } from '@/lib/utils';

type StateShippingTaxRatesContentProps = {
    data: StateShippingTaxRateRow[];
    searchState: string;
};

function buildQuery(params: { state?: string }) {
    const q = new URLSearchParams();
    if (params.state?.trim()) q.set('state', params.state.trim());
    return q.toString() ? `?${q.toString()}` : '';
}

function formatShippingRate(value: number) {
    return `$${value.toFixed(2)}`;
}

function formatTaxRate(value: number) {
    return `${(value * 100).toFixed(4).replace(/\.?0+$/, '')}%`;
}

export function StateShippingTaxRatesContent({ data, searchState }: StateShippingTaxRatesContentProps) {
    const router = useRouter();

    const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const state = (form.elements.namedItem('state') as HTMLInputElement).value;
        router.push(`/manage/state-shipping-tax-rates${buildQuery({ state: state || undefined })}`);
    };

    return (
        <div className="mx-auto flex h-full w-full max-w-7xl flex-col gap-4 overflow-hidden">
            <div className="shrink-0">
                <h1 className="text-[14px] font-semibold uppercase tracking-[0.3em] text-[#6e4a34]">State Shipping &amp; Tax Rates</h1>
                <p className="mt-2 text-xs text-[#6e4a34]">Shipping and tax rates configured per state.</p>
            </div>

            <div className="flex shrink-0 flex-wrap items-end justify-between gap-3">
                <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-3">
                    <label className="flex flex-col gap-1">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">State</span>
                        <Input
                            name="state"
                            type="search"
                            placeholder="Search by abbreviation"
                            defaultValue={searchState}
                            className="w-48 min-w-0 sm:w-56"
                            onChange={(e) =>
                                reloadOnSearchClear(e, searchState, () =>
                                    router.push(`/manage/state-shipping-tax-rates${buildQuery({})}`),
                                )
                            }
                        />
                    </label>
                    <Button type="submit" variant="sweet" className="shrink-0">
                        Search
                    </Button>
                </form>
                <Link href="/manage/state-shipping-tax-rates/new" className={cn(buttonVariants({ variant: 'sweet' }), 'text-[11px]')}>
                    Add state rate
                </Link>
            </div>

            <p className="shrink-0 text-xs text-[#6e4a34]">
                Showing {data.length} state {data.length === 1 ? 'rate' : 'rates'}
                {searchState ? ' (filtered)' : ''}.
            </p>

            <div className="min-h-0 flex-1 overflow-hidden pb-2.5">
                {data.length === 0 ? (
                    <p className="rounded-2xl border border-[#c49a78] bg-[#f8eddf] p-6 text-center text-xs text-[#6e4a34]">
                        No state shipping or tax rates found.
                    </p>
                ) : (
                    <div className="h-full overflow-auto rounded-md border border-[#c49a78] bg-[#f8eddf]">
                        <table className="min-w-full border-collapse text-xs text-[#4a2518]">
                            <thead className="sticky top-0 z-10 bg-[#e3cbb0] text-[11px] uppercase tracking-[0.16em]">
                                <tr>
                                    <th className="w-24 px-3 py-2 text-center">State</th>
                                    <th className="min-w-40 px-3 py-2 text-left">State name</th>
                                    <th className="w-36 px-3 py-2 text-center">Shipping rate</th>
                                    <th className="w-36 px-3 py-2 text-center">Tax rate</th>
                                    <th className="w-20 px-3 py-2 text-center"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((row, idx) => {
                                    const isEven = idx % 2 === 0;

                                    return (
                                        <tr key={row.id} className={isEven ? 'bg-[#fdf7ef]' : 'bg-[#f8eddf]'}>
                                            <td className="px-3 py-2 align-middle text-center text-[11px] font-semibold uppercase">
                                                {row.stateAbbr || '—'}
                                            </td>
                                            <td className="px-3 py-2 align-middle text-[11px]">{row.stateName || '—'}</td>
                                            <td className="px-3 py-2 align-middle text-center text-[11px] tabular-nums">
                                                {formatShippingRate(row.shippingRate)}
                                            </td>
                                            <td className="px-3 py-2 align-middle text-center text-[11px] tabular-nums">
                                                {formatTaxRate(row.taxRate)}
                                            </td>
                                            <td className="px-3 py-2 align-middle text-center text-[11px]">
                                                <Link
                                                    href={`/manage/state-shipping-tax-rates/${row.id}`}
                                                    className={cn(buttonVariants({ variant: 'sweet' }), 'px-3 py-1 text-[10px] tracking-[0.15em]')}
                                                >
                                                    Edit
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
