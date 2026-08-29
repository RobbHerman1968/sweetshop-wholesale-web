'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    createStateShippingTaxRateFromForm,
    updateStateShippingTaxRateFromForm,
    type StateShippingTaxRateRow,
} from '@/lib/db-pg/actions/state-shipping-tax-rate';
import { lookupUsStateName, normalizeStateAbbr } from '@/lib/us-state-names';

type StateShippingTaxRateFormProps = {
    mode: 'create' | 'edit';
    rate?: StateShippingTaxRateRow;
    backHref: string;
};

function formatRatePercent(rate: number) {
    const percent = rate * 100;
    return Number.isInteger(percent) ? String(percent) : String(Number(percent.toFixed(4)));
}

export function StateShippingTaxRateForm({ mode, rate, backHref }: StateShippingTaxRateFormProps) {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [stateAbbr, setStateAbbr] = useState(rate?.stateAbbr ?? '');
    const [stateName, setStateName] = useState(rate?.stateName ?? '');

    const title = mode === 'create' ? 'Add State Rate' : 'Edit State Rate';
    const submitLabel = mode === 'create' ? 'Create rate' : 'Save changes';

    function handleStateAbbrChange(value: string) {
        const nextAbbr = normalizeStateAbbr(value).slice(0, 2);
        setStateAbbr(nextAbbr);

        const lookupName = lookupUsStateName(nextAbbr);
        if (lookupName) {
            setStateName(lookupName);
        }
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSaving(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const result =
            mode === 'create'
                ? await createStateShippingTaxRateFromForm(formData)
                : await updateStateShippingTaxRateFromForm(formData);

        if (!result.ok) {
            setError(result.error);
            setSaving(false);
            return;
        }

        setSaving(false);
        router.refresh();
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {mode === 'edit' && rate ? <input type="hidden" name="id" value={rate.id} readOnly /> : null}

            <header className="space-y-1">
                <h1 className="text-[14px] font-semibold uppercase tracking-[0.3em] text-[#6e4a34]">{title}</h1>
                <p className="text-xs text-[#6e4a34]">Configure shipping and tax rates for a state.</p>
            </header>

            {error ? (
                <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
                    {error}
                </p>
            ) : null}

            <section className="space-y-4 rounded-2xl border border-[#c49a78] bg-[#f8eddf] p-4 sm:p-6">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">State</h2>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="state-rate-abbr" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                            Abbreviation
                        </Label>
                        <Input
                            id="state-rate-abbr"
                            name="stateAbbr"
                            value={stateAbbr}
                            onChange={(e) => handleStateAbbrChange(e.target.value)}
                            className="w-full uppercase"
                            maxLength={2}
                            autoComplete="off"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="state-rate-name" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                            State name
                        </Label>
                        <Input
                            id="state-rate-name"
                            name="stateName"
                            value={stateName}
                            onChange={(e) => setStateName(e.target.value)}
                            className="w-full"
                            required
                        />
                    </div>
                </div>
            </section>

            <section className="space-y-4 rounded-2xl border border-[#c49a78] bg-[#f8eddf] p-4 sm:p-6">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Rates</h2>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="state-rate-shipping" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                            Shipping rate (%)
                        </Label>
                        <Input
                            id="state-rate-shipping"
                            name="shippingRatePercent"
                            type="number"
                            min="0"
                            step="0.0001"
                            defaultValue={rate ? formatRatePercent(rate.shippingRate) : '0'}
                            className="w-full"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="state-rate-tax" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                            Tax rate (%)
                        </Label>
                        <Input
                            id="state-rate-tax"
                            name="taxRatePercent"
                            type="number"
                            min="0"
                            step="0.0001"
                            defaultValue={rate ? formatRatePercent(rate.taxRate) : '0'}
                            className="w-full"
                            required
                        />
                    </div>
                </div>
            </section>

            <div className="flex flex-wrap gap-3 border-t border-[#e3cbb0] pt-4">
                <Link href={backHref} className={buttonVariants({ variant: 'outline' })}>
                    Cancel
                </Link>
                <Button type="submit" disabled={saving}>
                    {saving ? 'Saving…' : submitLabel}
                </Button>
            </div>
        </form>
    );
}
