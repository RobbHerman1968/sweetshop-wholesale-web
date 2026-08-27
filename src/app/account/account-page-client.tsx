'use client';

import { Fragment, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import moment from 'moment-timezone';
import { SiteHeader } from '@/components/site-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { SITE_MAIN_FOCUS_CLASS, SITE_MAIN_ID } from '@/lib/site-main';
import { cn } from '@/lib/utils';
import {
    updateAccountProfileFromForm,
    type AccountPageData,
} from '@/lib/account-page-actions';
import type { BrandBarNavCategory } from '@/assets/brand-bar-nav';

type AccountPageClientProps = {
    brandBarCategories: BrandBarNavCategory[];
    initialCartItemCount: number;
    initialIsLoggedIn?: boolean;
    initialAccountDisplayName?: string | null;
    initialAccountShippingLeadTime?: number | null;
    accountData: AccountPageData;
};

function formatOrderDateCentral(orderDate: string | null): string {
    if (!orderDate) return '—';
    return moment.utc(orderDate).local().format('MM/DD/YYYY hh:mm A');
}

export function AccountPageClient({
    brandBarCategories,
    initialCartItemCount,
    initialIsLoggedIn = true,
    initialAccountDisplayName = null,
    initialAccountShippingLeadTime = null,
    accountData,
}: AccountPageClientProps) {
    const router = useRouter();
    const { data: session, status, update } = useSession();
    const [profile, setProfile] = useState(accountData.profile);
    const [firstName, setFirstName] = useState(accountData.profile.firstName ?? '');
    const [lastName, setLastName] = useState(accountData.profile.lastName ?? '');
    const [saving, setSaving] = useState(false);
    const [profileError, setProfileError] = useState<string | null>(null);

    const showCompleteProfileNotice = profile.needsProfileCompletion;

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.replace('/');
        }
    }, [status, router]);

    async function handleProfileSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setProfileError(null);
        setSaving(true);

        const formData = new FormData();
        formData.set('firstName', firstName);
        formData.set('lastName', lastName);

        const result = await updateAccountProfileFromForm(formData);
        setSaving(false);

        if (!result.ok) {
            setProfileError(result.error);
            return;
        }

        const nextProfile = {
            ...profile,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            needsProfileCompletion: false,
        };
        setProfile(nextProfile);

        const displayName = [nextProfile.firstName, nextProfile.lastName].filter(Boolean).join(' ');
        await update({ name: displayName, needsProfileCompletion: false });

        toast({ title: 'Profile updated' });
        router.refresh();
    }

    return (
        <div className="min-h-screen min-w-0 bg-white text-[#3c251a] font-sans">
            <SiteHeader
                onLoginClick={() => router.push('/')}
                brandBarCategories={brandBarCategories}
                initialCartItemCount={initialCartItemCount}
                initialIsLoggedIn={initialIsLoggedIn}
                initialAccountDisplayName={initialAccountDisplayName}
                initialAccountShippingLeadTime={initialAccountShippingLeadTime}
            />

            <main
                id={SITE_MAIN_ID}
                tabIndex={-1}
                className={cn(
                    'mx-auto min-w-0 max-w-6xl overflow-x-clip border-t-2 border-[#c49a78]/45 bg-gradient-to-b from-[#fdf7ef] to-white px-3 pt-4 pb-8 sm:border-t sm:bg-none sm:px-4 sm:pt-4 sm:pb-10',
                    SITE_MAIN_FOCUS_CLASS,
                )}
            >
                {status === 'loading' ? (
                    <p className="text-sm text-[#6e4a34]" role="status" aria-live="polite">
                        Loading account…
                    </p>
                ) : session ? (
                    <div className="space-y-6">
                        <header className="space-y-1">
                            <h1 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#4a2518]">Account</h1>
                            <p className="text-xs text-[#6e4a34]">Manage your profile and view your order history.</p>
                        </header>

                        {showCompleteProfileNotice ? (
                            <div
                                className="rounded-lg border border-amber-600/40 bg-amber-50 px-4 py-3 text-sm text-[#5c4032]"
                                role="status"
                                aria-live="polite"
                            >
                                Please update your first and last name below to complete your account profile.
                            </div>
                        ) : null}

                        <section className="max-w-xl space-y-4 rounded-lg border border-[#d4c4b0] bg-[#fdf7ef] p-6">
                            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#4a2518]">Profile</h2>

                            <dl className="grid gap-3 text-sm text-[#5c4032] sm:grid-cols-2">
                                <div>
                                    <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a7264]">Login</dt>
                                    <dd className="mt-0.5 font-medium text-[#3c251a]">{profile.userName}</dd>
                                </div>
                            </dl>

                            <form onSubmit={handleProfileSubmit} className="space-y-4">
                                {profileError ? (
                                    <p className="text-xs text-red-600" role="alert">
                                        {profileError}
                                    </p>
                                ) : null}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="account-firstName">First name</Label>
                                        <Input
                                            id="account-firstName"
                                            name="firstName"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            required
                                            autoComplete="given-name"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="account-lastName">Last name</Label>
                                        <Input
                                            id="account-lastName"
                                            name="lastName"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            required
                                            autoComplete="family-name"
                                        />
                                    </div>
                                </div>
                                <Button type="submit" disabled={saving}>
                                    {saving ? 'Saving…' : 'Save profile'}
                                </Button>
                            </form>
                        </section>

                        {accountData.hasLinkedAccount ? (
                            <section className="space-y-4">
                                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#4a2518]">Your orders</h2>
                                {accountData.orders.length === 0 ? (
                                    <p className="rounded-lg border border-[#d4c4b0] bg-[#fdf7ef] p-6 text-center text-xs text-[#6e4a34]">
                                        No orders yet.
                                    </p>
                                ) : (
                                    <div className="min-w-0 max-w-full overflow-x-auto rounded-md border border-[#c49a78] bg-[#f8eddf]">
                                        <table className="w-full table-fixed border-collapse text-xs text-[#4a2518] sm:table-auto">
                                            <thead className="bg-[#e3cbb0] text-[11px] uppercase tracking-[0.16em]">
                                                <tr>
                                                    <th className="px-3 py-2 text-center">Order #</th>
                                                    <th className="px-3 py-2 text-center">AM Order #</th>
                                                    <th className="hidden px-3 py-2 text-center sm:table-cell">Date</th>
                                                    <th className="px-3 py-2 text-right">Total</th>
                                                    <th className="hidden px-3 py-2 text-center sm:table-cell">Ship Code</th>
                                                    <th className="px-3 py-2 text-right w-20"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {accountData.orders.map((order, idx) => {
                                                    const detailHref = `/account/orders/${order.id}`;
                                                    const isEven = idx % 2 === 0;
                                                    const rowBg = isEven ? 'bg-[#fdf7ef] font-mono' : 'bg-[#f8eddf] font-mono';
                                                    return (
                                                        <Fragment key={order.id}>
                                                            <tr className={rowBg}>
                                                                <td className="px-3 py-2 align-middle text-center text-[11px] font-semibold">
                                                                    #{order.orderNumber ?? order.id}
                                                                </td>
                                                                <td className="px-2 py-2 align-middle text-center text-[11px] sm:px-3">
                                                                    <span className="block truncate">{order.accountMateOrderNumber ?? '—'}</span>
                                                                </td>
                                                                <td className="hidden px-3 py-2 align-middle text-center text-[11px] tabular-nums sm:table-cell">
                                                                    {formatOrderDateCentral(order.orderDate)}
                                                                </td>
                                                                <td className="px-3 py-2 align-middle text-right text-[11px] font-semibold">
                                                                    ${Number(order.total).toFixed(2)}
                                                                </td>
                                                                <td className="hidden px-3 py-2 align-middle text-center text-[11px] sm:table-cell">{order.shippingCode ?? '—'}</td>
                                                                <td className="px-3 py-2 align-middle text-right text-[11px]">
                                                                    <Link
                                                                        href={detailHref}
                                                                        className={cn(buttonVariants({ variant: 'sweet' }), 'px-3 py-1 text-[10px] tracking-[0.15em]')}
                                                                    >
                                                                        View
                                                                    </Link>
                                                                </td>
                                                            </tr>
                                                            <tr className={cn(rowBg, 'sm:hidden')}>
                                                                <td
                                                                    colSpan={4}
                                                                    className="px-3 pb-2 pt-0 text-center text-[10px] font-sans font-normal normal-case tracking-normal text-[#6e4a34]"
                                                                >
                                                                    {formatOrderDateCentral(order.orderDate)}
                                                                    <span className="mx-1">·</span>
                                                                    Ship: {order.shippingCode ?? '—'}
                                                                </td>
                                                            </tr>
                                                        </Fragment>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </section>
                        ) : null}

                        <Link href="/" className="inline-block text-xs font-semibold uppercase tracking-[0.18em] text-[#6e4a34] underline underline-offset-4 hover:text-[#4a2518]">
                            Back to home
                        </Link>
                    </div>
                ) : null}
            </main>
        </div>
    );
}
