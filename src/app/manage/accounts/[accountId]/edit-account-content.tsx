'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateAccountFromForm, reloadAccountFromAccountMate } from '@/lib/db-pg/actions/account';
import type { ManageAccount } from '@/lib/db-pg/actions/account';
import type { ManageMenu } from '@/lib/db-pg/actions/menu';
import { formatManageMenuLabel } from '@/lib/menu-manage-utils';

type Props = {
    account: ManageAccount;
    menus: ManageMenu[];
    backHref: string;
};

const fieldLabelClass = 'text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]';

function buildAccountFormKey(account: ManageAccount) {
    return JSON.stringify({
        id: account.id,
        accountMateId: account.accountMateId,
        name: account.name,
        contactFirstName: account.contactFirstName,
        contactLastName: account.contactLastName,
        contactPhone: account.contactPhone,
        contactAddress1: account.contactAddress1,
        contactAddress2: account.contactAddress2,
        contactCity: account.contactCity,
        contactState: account.contactState,
        contactZipCode: account.contactZipCode,
        terms: account.terms,
        isTerms: account.isTerms,
        menuId: account.menuId,
    });
}

export function EditAccountContent({ account, menus, backHref }: Props) {
    const router = useRouter();
    const accountMateIdRef = useRef<HTMLInputElement>(null);
    const [accountFields, setAccountFields] = useState(account);
    const [saving, setSaving] = useState(false);
    const [reloading, setReloading] = useState(false);

    useEffect(() => {
        setAccountFields(account);
    }, [account]);

    async function handleReloadAccount() {
        const accountMateId = accountMateIdRef.current?.value.trim();
        if (!accountMateId) {
            console.warn('[reload account] No AccountMate ID');
            return;
        }

        setReloading(true);
        try {
            const result = await reloadAccountFromAccountMate(account.id, accountMateId);
            if (!result.ok) {
                console.error('[reload account]', result.error);
                return;
            }
            console.log('[reload account]', {
                accountId: result.accountId,
                accountMateId: result.accountMateId,
                accountMateRow: result.accountMateRow,
                mapped: result.mapped,
            });
            setAccountFields((prev) => ({
                ...prev,
                accountMateId: result.accountMateId,
                name: result.mapped.name,
                contactFirstName: result.mapped.contactFirstName,
                contactLastName: result.mapped.contactLastName,
                contactPhone: result.mapped.contactPhone,
                contactAddress1: result.mapped.contactAddress1,
                contactAddress2: result.mapped.contactAddress2,
                contactCity: result.mapped.contactCity,
                contactState: result.mapped.contactState,
                contactZipCode: result.mapped.contactZipCode,
                terms: result.mapped.terms,
                isTerms: result.mapped.isTerms,
            }));
            router.refresh();
        } catch (err) {
            console.error('[reload account]', err);
        } finally {
            setReloading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSaving(true);
        await updateAccountFromForm(new FormData(e.currentTarget));
        setSaving(false);
        router.refresh();
    }

    return (
        <form key={buildAccountFormKey(accountFields)} onSubmit={handleSubmit} className="space-y-8">
            <input type="hidden" name="id" value={accountFields.id} readOnly />

            <header className="space-y-1">
                <h1 className="text-[14px] font-semibold uppercase tracking-[0.3em] text-[#6e4a34]">Edit Account</h1>
                <p className="text-xs text-[#6e4a34]">Update wholesale account details, contact info, and shipping or billing flags.</p>
            </header>

            <section className="space-y-4 rounded-2xl border border-[#c49a78] bg-[#f8eddf] p-4 sm:p-6">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Shopping menu</h2>
                <p className="text-xs text-[#6e4a34]">Choose which shop catalog menu this account sees when signed in.</p>
                <div className="space-y-2">
                    <Label htmlFor="edit-account-menuId" className={fieldLabelClass}>
                        Menu
                    </Label>
                    <select
                        id="edit-account-menuId"
                        name="menuId"
                        defaultValue={String(accountFields.menuId ?? 0)}
                        className="flex h-9 w-full rounded-md border border-[#c49a78] bg-[#fdf7ef] px-3 py-1 text-xs text-[#4a2518] shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#6e4a34]"
                    >
                        <option value="0">Default (Wholesale shopping)</option>
                        {menus.map((menuOption) => (
                            <option key={menuOption.id} value={menuOption.id}>
                                {formatManageMenuLabel(menuOption)}
                            </option>
                        ))}
                    </select>
                </div>
            </section>

            <section className="space-y-4 rounded-2xl border border-[#c49a78] bg-[#f8eddf] p-4 sm:p-6">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Basic info</h2>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="edit-account-name" className={fieldLabelClass}>
                            Account name
                        </Label>
                        <Input id="edit-account-name" name="name" defaultValue={accountFields.name ?? ''} className="w-full" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-account-accountMateId" className={fieldLabelClass}>
                            AccountMate ID
                        </Label>
                        <div className="flex flex-wrap gap-2">
                            <Input
                                ref={accountMateIdRef}
                                id="edit-account-accountMateId"
                                name="accountMateId"
                                defaultValue={accountFields.accountMateId ?? ''}
                                className="min-w-0 flex-1"
                            />
                            <Button type="button" variant="outline" disabled={reloading} onClick={handleReloadAccount}>
                                {reloading ? 'Reloading…' : 'Reload account'}
                            </Button>
                        </div>
                    </div>
                </div>

                <p className="text-[11px] text-[#6e4a34]">Account ID: {accountFields.id}</p>
            </section>

            <section className="space-y-4 rounded-2xl border border-[#c49a78] bg-[#f8eddf] p-4 sm:p-6">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Contact</h2>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="edit-account-contactFirstName" className={fieldLabelClass}>
                            First name
                        </Label>
                        <Input id="edit-account-contactFirstName" name="contactFirstName" defaultValue={accountFields.contactFirstName ?? ''} className="w-full" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-account-contactLastName" className={fieldLabelClass}>
                            Last name
                        </Label>
                        <Input id="edit-account-contactLastName" name="contactLastName" defaultValue={accountFields.contactLastName ?? ''} className="w-full" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-account-contactEmail" className={fieldLabelClass}>
                            Email
                        </Label>
                        <Input id="edit-account-contactEmail" name="contactEmail" type="email" defaultValue={accountFields.contactEmail ?? ''} className="w-full" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-account-contactPhone" className={fieldLabelClass}>
                            Phone
                        </Label>
                        <Input id="edit-account-contactPhone" name="contactPhone" defaultValue={accountFields.contactPhone ?? ''} className="w-full" />
                    </div>
                </div>
            </section>

            <section className="space-y-4 rounded-2xl border border-[#c49a78] bg-[#f8eddf] p-4 sm:p-6">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Address</h2>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="edit-account-contactAddress1" className={fieldLabelClass}>
                            Address line 1
                        </Label>
                        <Input id="edit-account-contactAddress1" name="contactAddress1" defaultValue={accountFields.contactAddress1 ?? ''} className="w-full" />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="edit-account-contactAddress2" className={fieldLabelClass}>
                            Address line 2
                        </Label>
                        <Input id="edit-account-contactAddress2" name="contactAddress2" defaultValue={accountFields.contactAddress2 ?? ''} className="w-full" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-account-contactCity" className={fieldLabelClass}>
                            City
                        </Label>
                        <Input id="edit-account-contactCity" name="contactCity" defaultValue={accountFields.contactCity ?? ''} className="w-full" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-account-contactState" className={fieldLabelClass}>
                            State
                        </Label>
                        <Input id="edit-account-contactState" name="contactState" defaultValue={accountFields.contactState ?? ''} className="w-full" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-account-contactZipCode" className={fieldLabelClass}>
                            ZIP code
                        </Label>
                        <Input id="edit-account-contactZipCode" name="contactZipCode" defaultValue={accountFields.contactZipCode ?? ''} className="w-full" />
                    </div>
                </div>
            </section>

            <section className="space-y-4 rounded-2xl border border-[#c49a78] bg-[#f8eddf] p-4 sm:p-6">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Settings</h2>

                <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="edit-account-isSkipTax" name="isSkipTax" defaultChecked={accountFields.isSkipTax} className="h-4 w-4 rounded border-[#c49a78]" />
                        <Label htmlFor="edit-account-isSkipTax" className={fieldLabelClass}>
                            Skip tax
                        </Label>
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="edit-account-isSkipShipping" name="isSkipShipping" defaultChecked={accountFields.isSkipShipping} className="h-4 w-4 rounded border-[#c49a78]" />
                        <Label htmlFor="edit-account-isSkipShipping" className={fieldLabelClass}>
                            Skip shipping
                        </Label>
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="edit-account-isFreeGroundShipping" name="isFreeGroundShipping" defaultChecked={accountFields.isFreeGroundShipping} className="h-4 w-4 rounded border-[#c49a78]" />
                        <Label htmlFor="edit-account-isFreeGroundShipping" className={fieldLabelClass}>
                            Free ground shipping
                        </Label>
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="edit-account-isTerms" name="isTerms" defaultChecked={accountFields.isTerms} className="h-4 w-4 rounded border-[#c49a78]" />
                        <Label htmlFor="edit-account-isTerms" className={fieldLabelClass}>
                            Terms account
                        </Label>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="edit-account-terms" className={fieldLabelClass}>
                        Terms
                    </Label>
                    <textarea
                        id="edit-account-terms"
                        name="terms"
                        defaultValue={accountFields.terms ?? ''}
                        rows={3}
                        className="flex min-h-[80px] w-full rounded-md border border-[#c49a78] bg-[#fdf7ef] px-3 py-2 text-xs text-[#4a2518] shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#6e4a34]"
                    />
                </div>
            </section>

            <div className="flex flex-wrap gap-3 border-t border-[#e3cbb0] pt-4">
                <Link href={backHref} className={buttonVariants({ variant: 'outline' })}>
                    Cancel
                </Link>
                <Button type="submit" disabled={saving}>
                    {saving ? 'Saving…' : 'Save changes'}
                </Button>
            </div>
        </form>
    );
}
