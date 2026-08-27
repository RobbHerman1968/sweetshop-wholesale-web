'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
    return (
        <textarea
            ref={ref}
            className={cn(
                'flex min-h-20 w-full min-w-0 rounded-md border border-[#d1b79a] bg-white px-3 py-2 text-base text-[#4a2b1f] outline-none ring-amber-300 placeholder:text-[#6e4a34] focus:ring sm:text-sm',
                className,
            )}
            {...props}
        />
    );
});
Textarea.displayName = 'Textarea';
