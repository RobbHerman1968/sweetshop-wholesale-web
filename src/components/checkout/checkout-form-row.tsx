'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type CheckoutFormRowProps = {
    label: string;
    required?: boolean;
    children: ReactNode;
    className?: string;
};

export function CheckoutFormRow({ label, required, children, className }: CheckoutFormRowProps) {
    return (
        <div
            className={cn(
                'grid gap-1 border-b border-[#e8dfd4] py-2.5 sm:grid-cols-[minmax(7.5rem,9.5rem)_1fr] sm:items-center sm:gap-4',
                className,
            )}
        >
            <div className={checkoutLabelClass}>
                {label}
                {required ? <span className="text-[#4a2518]">*</span> : null}
            </div>
            <div className="min-w-0">{children}</div>
        </div>
    );
}

export function CheckoutSectionTitle({ children }: { children: ReactNode }) {
    return <h2 className="font-serif text-2xl font-normal text-[#4a2518]">{children}</h2>;
}

export const checkoutTextClass = 'text-sm text-[#4a2518]';

export const checkoutLabelClass = 'text-sm font-bold text-[#4a2518]';

export const checkoutChoiceClass = 'inline-flex items-center gap-2 text-sm text-[#4a2518]';

export const checkoutFieldInvalidClass = 'border-red-500 focus:ring-red-300';

/** Checkout overrides for shadcn Input / Textarea (keep form look consistent). */
export const checkoutInputClass = 'border-[#cfcfcf] text-[#4a2518] placeholder:text-[#6e4a34]';

/** Checkout overrides for shadcn SelectTrigger (form-field look vs manage uppercase chrome). */
export const checkoutSelectTriggerClass =
    'border-[#cfcfcf] bg-white text-sm font-normal normal-case tracking-normal text-[#4a2518] shadow-none focus-visible:ring-amber-300';

export const checkoutCompactFieldClass = cn(
    'inline-flex h-9 w-36 shrink-0 items-center justify-between gap-2 rounded-md border border-[#cfcfcf] bg-white px-3 py-2 text-sm text-[#4a2518] outline-none ring-amber-300 focus:ring',
);
