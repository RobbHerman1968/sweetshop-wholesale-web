'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { updateUserFromForm } from '@/lib/db-pg/actions/users';
import type { ManageUser } from '@/lib/db-pg/actions/users';
import type { ManageAccountLink } from '@/lib/db-pg/actions/account';

type Props = {
    user: ManageUser;
    linkedAccount: ManageAccountLink | null;
    backHref: string;
};

export function EditUserContent({ user, linkedAccount, backHref }: Props) {
    const router = useRouter();
    const [saving, setSaving] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSaving(true);
        await updateUserFromForm(new FormData(e.currentTarget));
        setSaving(false);
        router.refresh();
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <input type="hidden" name="id" value={user.id} readOnly />

            <header className="space-y-1">
                <h1 className="text-[14px] font-semibold uppercase tracking-[0.3em] text-[#6e4a34]">Edit User</h1>
                <p className="text-xs text-[#6e4a34]">Update login details, profile, access flags, and optional password reset.</p>
            </header>

            <section className="space-y-4 rounded-2xl border border-[#c49a78] bg-[#f8eddf] p-4 sm:p-6">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Account</h2>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="edit-user-userName" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                            Email
                        </Label>
                        <Input id="edit-user-userName" name="userName" type="email" defaultValue={user.userName} className="w-full" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-user-accountMateId" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                            AccountMate ID
                        </Label>
                        <Input id="edit-user-accountMateId" name="accountMateId" defaultValue={user.accountMateId ?? ''} className="w-full" />
                    </div>
                </div>

                {linkedAccount ? (
                    <p className="text-[11px] text-[#6e4a34]">
                        Wholesale account:{' '}
                        <Link
                            href={`/manage/accounts/${linkedAccount.id}?returnTo=${encodeURIComponent(`/manage/users/${user.id}`)}`}
                            className="font-semibold text-[#4a2518] underline-offset-4 hover:underline"
                        >
                            {linkedAccount.name?.trim() || linkedAccount.accountMateId}
                        </Link>
                    </p>
                ) : null}

                <p className="text-[11px] text-[#6e4a34]">User ID: {user.id}</p>
            </section>

            <section className="space-y-4 rounded-2xl border border-[#c49a78] bg-[#f8eddf] p-4 sm:p-6">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Profile</h2>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="edit-user-firstName" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                            First name
                        </Label>
                        <Input id="edit-user-firstName" name="firstName" defaultValue={user.firstName ?? ''} className="w-full" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-user-lastName" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                            Last name
                        </Label>
                        <Input id="edit-user-lastName" name="lastName" defaultValue={user.lastName ?? ''} className="w-full" />
                    </div>
                </div>
            </section>

            <section className="space-y-4 rounded-2xl border border-[#c49a78] bg-[#f8eddf] p-4 sm:p-6">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Access</h2>

                <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-2">
                        <Checkbox id="edit-user-isActive" name="isActive" defaultChecked={user.isActive} />
                        <Label htmlFor="edit-user-isActive" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                            Active
                        </Label>
                    </div>
                    <div className="flex items-center gap-2">
                        <Checkbox id="edit-user-isAdmin" name="isAdmin" defaultChecked={user.isAdmin} />
                        <Label htmlFor="edit-user-isAdmin" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                            Admin
                        </Label>
                    </div>
                </div>
            </section>

            <section className="space-y-4 rounded-2xl border border-[#c49a78] bg-[#f8eddf] p-4 sm:p-6">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Password</h2>
                <div className="space-y-2">
                    <Label htmlFor="edit-user-newPassword" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                        New password
                    </Label>
                    <div className="w-full sm:max-w-md">
                        <PasswordInput id="edit-user-newPassword" name="newPassword" autoComplete="new-password" placeholder="Leave blank to keep current password" />
                    </div>
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
