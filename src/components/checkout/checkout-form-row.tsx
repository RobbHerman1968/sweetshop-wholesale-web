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

export const checkoutFieldInvalidClass = 'border-red-500';

const checkoutControlBaseClass =
    'flex h-9 min-w-0 rounded-sm border border-[#cfcfcf] bg-white px-2 py-1 text-base leading-normal text-[#4a2518] outline-none placeholder:text-base placeholder:text-[#6e4a34] sm:text-sm sm:placeholder:text-sm';

export const checkoutFieldClass = cn(checkoutControlBaseClass, 'w-full');

export const checkoutSelectClass = cn(checkoutControlBaseClass, 'w-full');

export const checkoutCompactFieldClass = cn(checkoutControlBaseClass, 'w-36 shrink-0');
