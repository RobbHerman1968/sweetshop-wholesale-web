import { Suspense } from 'react';
import { getStateShippingTaxRatesFromDB } from '@/lib/db-pg/actions/state-shipping-tax-rate';
import { StateShippingTaxRatesContent } from './state-shipping-tax-rates-content';

type Props = {
    searchParams: Promise<{ state?: string }>;
};

export default async function ManageStateShippingTaxRatesPage({ searchParams }: Props) {
    const params = await searchParams;
    const state = params.state?.trim() ?? '';

    const data = await getStateShippingTaxRatesFromDB({
        stateAbbr: state || undefined,
    });

    return (
        <Suspense fallback={<div className="mx-auto max-w-7xl text-xs text-[#6e4a34]">Loading state rates…</div>}>
            <StateShippingTaxRatesContent data={data} searchState={state} />
        </Suspense>
    );
}
