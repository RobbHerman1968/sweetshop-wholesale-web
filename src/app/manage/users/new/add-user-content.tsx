'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { createUserFromForm } from '@/lib/db-pg/actions/users';

type Props = {
    backHref: string;
};

export function AddUserContent({ backHref }: Props) {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSaving(true);
        setError(null);
        const result = await createUserFromForm(new FormData(e.currentTarget));
        if (!result.ok) {
            setError(result.error);
            setSaving(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <header className="space-y-1">
                <h1 className="text-[14px] font-semibold uppercase tracking-[0.3em] text-[#6e4a34]">Add User</h1>
                <p className="text-xs text-[#6e4a34]">
                    Create a new wholesale login. If an AccountMate ID is entered, the account must exist locally or in
                    AccountMate before the user is created.
                </p>
            </header>

            {error ? (
                <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
                    {error}
                </p>
            ) : null}

            <section className="space-y-4 rounded-2xl border border-[#c49a78] bg-[#f8eddf] p-4 sm:p-6">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Account</h2>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="add-user-userName" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                            Email
                        </Label>
                        <Input id="add-user-userName" name="userName" type="email" autoComplete="off" className="w-full" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="add-user-accountMateId" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                            AccountMate ID
                        </Label>
                        <Input id="add-user-accountMateId" name="accountMateId" autoComplete="off" className="w-full" />
                    </div>
                </div>
            </section>

            <section className="space-y-4 rounded-2xl border border-[#c49a78] bg-[#f8eddf] p-4 sm:p-6">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Profile</h2>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="add-user-firstName" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                            First name
                        </Label>
                        <Input id="add-user-firstName" name="firstName" autoComplete="off" className="w-full" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="add-user-lastName" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                            Last name
                        </Label>
                        <Input id="add-user-lastName" name="lastName" autoComplete="off" className="w-full" required />
                    </div>
                </div>
            </section>

            <section className="space-y-4 rounded-2xl border border-[#c49a78] bg-[#f8eddf] p-4 sm:p-6">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Access</h2>

                <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-2">
                        <Checkbox id="add-user-isActive" name="isActive" defaultChecked />
                        <Label htmlFor="add-user-isActive" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                            Active
                        </Label>
                    </div>
                    <div className="flex items-center gap-2">
                        <Checkbox id="add-user-isAdmin" name="isAdmin" />
                        <Label htmlFor="add-user-isAdmin" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                            Admin
                        </Label>
                    </div>
                </div>
            </section>

            <section className="space-y-4 rounded-2xl border border-[#c49a78] bg-[#f8eddf] p-4 sm:p-6">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Password</h2>
                <div className="space-y-2">
                    <Label htmlFor="add-user-password" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                        Password
                    </Label>
                    <div className="w-full sm:max-w-md">
                        <PasswordInput
                            id="add-user-password"
                            name="password"
                            autoComplete="new-password"
                            minLength={6}
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
                    {saving ? 'Creating…' : 'Create user'}
                </Button>
            </div>
        </form>
    );
}
