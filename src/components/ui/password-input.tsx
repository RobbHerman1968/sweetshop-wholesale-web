'use client';

import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input, type InputProps } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export const PasswordInput = React.forwardRef<HTMLInputElement, Omit<InputProps, 'type'>>(
    ({ className, ...props }, ref) => {
        const [visible, setVisible] = React.useState(false);

        return (
            <div className="relative">
                <Input
                    ref={ref}
                    type={visible ? 'text' : 'password'}
                    className={cn('pr-10', className)}
                    {...props}
                />
                <button
                    type="button"
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 inline-flex w-9 items-center justify-center text-[#6e4a34] opacity-80 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a78] focus-visible:ring-offset-2"
                    aria-label={visible ? 'Hide password' : 'Show password'}
                    aria-pressed={visible}
                    onClick={() => setVisible((current) => !current)}
                >
                    {visible ? <EyeOff className="size-4" strokeWidth={1.75} aria-hidden /> : <Eye className="size-4" strokeWidth={1.75} aria-hidden />}
                </button>
            </div>
        );
    },
);
PasswordInput.displayName = 'PasswordInput';
