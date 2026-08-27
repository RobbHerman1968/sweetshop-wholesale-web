import Link from 'next/link';
import { notFound } from 'next/navigation';
import moment from 'moment-timezone';
import { buttonVariants } from '@/components/ui/button';
import { getApplicationByIdForManage } from '@/lib/db-pg/actions/application';
import { formatPhoneDisplay } from '@/lib/checkout-utils';
import { cn } from '@/lib/utils';

type Props = {
    params: Promise<{ applicationId: string }>;
    searchParams: Promise<{ returnTo?: string }>;
};

function resolveBackHref(returnTo: string | undefined): string {
    if (returnTo?.startsWith('/manage/applications')) {
        return returnTo;
    }
    return '/manage/applications';
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="grid gap-1 sm:grid-cols-[10rem_1fr] sm:gap-4">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6e4a34]">{label}</dt>
            <dd className="text-sm text-[#4a2518]">{value}</dd>
        </div>
    );
}

export default async function ManageApplicationDetailPage({ params, searchParams }: Props) {
    const { applicationId: applicationIdParam } = await params;
    const { returnTo } = await searchParams;
    const applicationId = parseInt(applicationIdParam, 10);

    if (!Number.isFinite(applicationId) || applicationId <= 0) {
        notFound();
    }

    const detail = await getApplicationByIdForManage(applicationId);
    if (!detail) {
        notFound();
    }

    const backHref = resolveBackHref(returnTo);
    const contactName = [detail.contactFirstName.trim(), detail.contactLastName.trim()].filter(Boolean).join(' ');
    const submittedAt = moment.utc(detail.createdAt).local().format('MM/DD/YYYY hh:mm A');

    return (
        <div className="mx-auto w-full max-w-7xl space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <Link href={backHref} className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34] underline-offset-4 hover:underline">
                        ← Back to applications
                    </Link>
                    <h1 className="mt-3 text-[14px] font-semibold uppercase tracking-[0.3em] text-[#6e4a34]">Application #{detail.id}</h1>
                    <p className="mt-2 text-xs text-[#6e4a34]">Submitted {submittedAt}</p>
                </div>
                <span
                    className={cn(
                        'inline-flex w-fit rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]',
                        detail.emailSent ? 'bg-[#dcefd8] text-[#24531f]' : 'bg-[#f8d7d7] text-[#7a1f1f]',
                    )}
                >
                    {detail.emailSent ? 'Notification sent' : 'Notification not sent'}
                </span>
            </div>

            <section className="space-y-5 rounded-2xl border border-[#c49a78] bg-[#fdf7ef] p-6">
                <h2 className="text-[12px] font-semibold uppercase tracking-[0.24em] text-[#4a2518]">Business</h2>
                <dl className="space-y-4">
                    <DetailRow label="Business name" value={detail.businessName} />
                    <DetailRow label="Tax / reseller #" value={detail.taxId} />
                </dl>
            </section>

            <section className="space-y-5 rounded-2xl border border-[#c49a78] bg-[#fdf7ef] p-6">
                <h2 className="text-[12px] font-semibold uppercase tracking-[0.24em] text-[#4a2518]">Contact</h2>
                <dl className="space-y-4">
                    <DetailRow label="Name" value={contactName || '—'} />
                    <DetailRow
                        label="Email"
                        value={
                            <a href={`mailto:${detail.email}`} className={cn(buttonVariants({ variant: 'link' }), 'h-auto p-0 text-sm')}>
                                {detail.email}
                            </a>
                        }
                    />
                    <DetailRow
                        label="Phone"
                        value={
                            <a href={`tel:+1${detail.phone}`} className={cn(buttonVariants({ variant: 'link' }), 'h-auto p-0 text-sm')}>
                                {formatPhoneDisplay(detail.phone)}
                            </a>
                        }
                    />
                    <DetailRow label="Fax" value={detail.fax ? formatPhoneDisplay(detail.fax) : '—'} />
                </dl>
            </section>

            <section className="space-y-5 rounded-2xl border border-[#c49a78] bg-[#fdf7ef] p-6">
                <h2 className="text-[12px] font-semibold uppercase tracking-[0.24em] text-[#4a2518]">Billing address</h2>
                <dl className="space-y-4">
                    <DetailRow label="Address" value={detail.billingAddress1} />
                    {detail.billingAddress2?.trim() ? <DetailRow label="Address 2" value={detail.billingAddress2.trim()} /> : null}
                    <DetailRow label="City" value={detail.city} />
                    <DetailRow label="State" value={detail.state} />
                    <DetailRow label="Zip" value={detail.zipCode} />
                </dl>
            </section>
        </div>
    );
}
