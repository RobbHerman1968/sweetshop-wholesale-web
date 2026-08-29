'use client';

import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
                <Button
                    type="button"
                    variant="ghost"
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 h-auto w-9 rounded-none px-0 text-[#4a2518]"
                    aria-label={visible ? 'Hide password' : 'Show password'}
                    aria-pressed={visible}
                    onClick={() => setVisible((current) => !current)}
                >
                    {visible ? <EyeOff className="size-4" strokeWidth={1.75} aria-hidden /> : <Eye className="size-4" strokeWidth={1.75} aria-hidden />}
                </Button>
            </div>
        );
    },
);
PasswordInput.displayName = 'PasswordInput';
