import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getStateShippingTaxRateByIdForManage } from '@/lib/db-pg/actions/state-shipping-tax-rate';
import { StateShippingTaxRateForm } from '../state-shipping-tax-rate-form';

type Props = {
    params: Promise<{ rateId: string }>;
};

export default async function ManageEditStateShippingTaxRatePage({ params }: Props) {
    const { rateId: rateIdParam } = await params;
    const rateId = parseInt(rateIdParam, 10);
    const rate = Number.isFinite(rateId) ? await getStateShippingTaxRateByIdForManage(rateId) : null;

    if (!rate) {
        notFound();
    }

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <div className="flex flex-wrap items-center gap-3">
                <Link
                    href="/manage/state-shipping-tax-rates"
                    className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34] underline-offset-4 hover:underline"
                >
                    ← Back to state rates
                </Link>
            </div>
            <StateShippingTaxRateForm mode="edit" rate={rate} backHref="/manage/state-shipping-tax-rates" />
        </div>
    );
}
