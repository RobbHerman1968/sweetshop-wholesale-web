'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateUserFromForm } from '@/lib/db-pg/actions/users';
import type { ManageUser } from '@/lib/db-pg/actions/users';

type Props = {
    user: ManageUser;
    backHref: string;
};

export function EditUserContent({ user, backHref }: Props) {
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
                            Username / email
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
                        <input type="checkbox" id="edit-user-isActive" name="isActive" defaultChecked={user.isActive} className="h-4 w-4 rounded border-[#c49a78]" />
                        <Label htmlFor="edit-user-isActive" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                            Active
                        </Label>
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="edit-user-isAdmin" name="isAdmin" defaultChecked={user.isAdmin} className="h-4 w-4 rounded border-[#c49a78]" />
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
                    <Input id="edit-user-newPassword" name="newPassword" type="password" autoComplete="new-password" className="w-full sm:max-w-md" placeholder="Leave blank to keep current password" />
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
