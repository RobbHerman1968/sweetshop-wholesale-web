import Link from 'next/link';
import { StateShippingTaxRateForm } from '../state-shipping-tax-rate-form';

export default function ManageAddStateShippingTaxRatePage() {
    return (
        <div className="mx-auto w-full max-w-7xl space-y-6">
            <div className="flex flex-wrap items-center gap-3">
                <Link
                    href="/manage/state-shipping-tax-rates"
                    className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34] underline-offset-4 hover:underline"
                >
                    ← Back to state rates
                </Link>
            </div>
            <StateShippingTaxRateForm mode="create" backHref="/manage/state-shipping-tax-rates" />
        </div>
    );
}
