'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'sweet' | 'primary' | 'outline' | 'ghost' | 'link';

const variantClasses: Record<ButtonVariant, string> = {
    sweet: 'bg-[#6e4a34] text-[#fdf7ef] hover:bg-[#5d3b29]',
    primary: 'bg-[#4a2518] text-[#fdf7ef] hover:bg-[#3a1b11]',
    outline: 'border border-[#c49a78] text-[#6e4a34] bg-transparent hover:bg-[#f3e0cf]',
    ghost: 'text-[#6e4a34] bg-transparent hover:bg-[#f3e0cf]',
    link: 'text-[#6e4a34] underline underline-offset-4 hover:text-[#3f1d12]',
};

const baseClasses =
    'inline-flex cursor-pointer items-center justify-center whitespace-nowrap text-xs font-semibold uppercase tracking-[0.22em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 px-5 py-2 rounded-md';

export function buttonVariants({ variant = 'primary' }: { variant?: ButtonVariant }) {
    return cn(baseClasses, variantClasses[variant ?? 'primary']);
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant = 'primary', ...props }, ref) => {
    return <button ref={ref} className={cn(buttonVariants({ variant }), className)} {...props} />;
});
Button.displayName = 'Button';
