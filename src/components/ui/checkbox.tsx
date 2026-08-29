'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(({ className, ...props }, ref) => (
    <input
        ref={ref}
        type="checkbox"
        className={cn(
            'h-4 w-4 shrink-0 rounded border border-[#c49a78] bg-white text-[#4a2518] accent-[#4a2518] outline-none',
            'focus-visible:ring-2 focus-visible:ring-[#c49a78] focus-visible:ring-offset-1',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className,
        )}
        {...props}
    />
));
Checkbox.displayName = 'Checkbox';
