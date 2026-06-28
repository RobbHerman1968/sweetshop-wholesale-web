'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { updateSiteSettingValueFromForm, type SiteSettingRow } from '@/lib/db-pg/actions/site-setting';

type SiteSettingsContentProps = {
    data: SiteSettingRow[];
};

function formatSettingValue(value: number) {
    return value.toFixed(2);
}

export function SiteSettingsContent({ data }: SiteSettingsContentProps) {
    const router = useRouter();

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <div>
                <h1 className="text-[14px] font-semibold uppercase tracking-[0.3em] text-[#6e4a34]">Site Settings</h1>
                <p className="mt-2 text-xs text-[#6e4a34]">Global configuration values used across the site.</p>
            </div>

            <p className="text-xs text-[#6e4a34]">
                Showing {data.length} {data.length === 1 ? 'setting' : 'settings'}.
            </p>

            {data.length === 0 ? (
                <p className="rounded-2xl border border-[#c49a78] bg-[#f8eddf] p-6 text-center text-xs text-[#6e4a34]">
                    No site settings found.
                </p>
            ) : (
                <div className="overflow-x-auto rounded-md border border-[#c49a78] bg-[#f8eddf]">
                    <table className="min-w-full border-collapse text-xs text-[#4a2518]">
                        <thead className="bg-[#e3cbb0] text-[11px] uppercase tracking-[0.16em]">
                            <tr>
                                <th className="px-3 py-2 text-left min-w-48">Setting</th>
                                <th className="w-32 px-3 py-2 text-left">Value</th>
                                <th className="px-3 py-2 text-right w-28"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row, idx) => (
                                <SiteSettingRowForm
                                    key={row.id}
                                    row={row}
                                    isEven={idx % 2 === 0}
                                    onSaved={() => router.refresh()}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

type SiteSettingRowFormProps = {
    row: SiteSettingRow;
    isEven: boolean;
    onSaved: () => void;
};

function SiteSettingRowForm({ row, isEven, onSaved }: SiteSettingRowFormProps) {
    const [value, setValue] = useState(formatSettingValue(row.value));
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setValue(formatSettingValue(row.value));
    }, [row.value]);

    const isDirty = value !== formatSettingValue(row.value);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSaving(true);

        const formData = new FormData(e.currentTarget);
        const result = await updateSiteSettingValueFromForm(formData);

        if (!result.ok) {
            setSaving(false);
            toast({
                variant: 'destructive',
                title: 'Could not save setting',
                description: result.error,
            });
            return;
        }

        setSaving(false);
        toast({
            title: 'Setting saved',
            description: row.name || undefined,
        });
        onSaved();
    }

    return (
        <tr className={isEven ? 'bg-[#fdf7ef]' : 'bg-[#f8eddf]'}>
            <td className="px-3 py-2 align-middle text-[11px] font-semibold">{row.name || '—'}</td>
            <td className="px-3 py-2 align-middle">
                <form id={`site-setting-form-${row.id}`} onSubmit={handleSubmit} className="space-y-1">
                    <input type="hidden" name="id" value={row.id} readOnly />
                    <Input
                        name="value"
                        type="number"
                        step="0.01"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="h-8 w-28 tabular-nums text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        required
                        aria-label={`Value for ${row.name}`}
                    />
                </form>
            </td>
            <td className="px-3 py-2 align-middle text-right">
                <Button
                    type="submit"
                    form={`site-setting-form-${row.id}`}
                    variant="sweet"
                    className="px-3 py-1 text-[10px] tracking-[0.15em]"
                    disabled={saving || !isDirty}
                >
                    {saving ? 'Saving…' : 'Save'}
                </Button>
            </td>
        </tr>
    );
}
