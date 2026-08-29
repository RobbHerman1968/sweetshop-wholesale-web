'use client';

import * as React from 'react';
import { CalendarIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function parseIsoDate(value: string): Date | undefined {
    const match = ISO_DATE_REGEX.exec(value);
    if (!match) {
        return undefined;
    }

    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(5, 7));
    const day = Number(value.slice(8, 10));
    const date = new Date(year, month - 1, day);

    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
        return undefined;
    }

    return date;
}

function formatIsoDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDisplayDate(value: string): string {
    const date = parseIsoDate(value);
    if (!date) {
        return value;
    }

    return date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
    });
}

type DatePickerProps = {
    id?: string;
    label?: string;
    value?: string;
    onChange: (value: string | undefined) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
};

export function DatePicker({
    id,
    label,
    value,
    onChange,
    placeholder = 'Pick a date',
    className,
    disabled = false,
}: DatePickerProps) {
    const [open, setOpen] = React.useState(false);
    const selectedDate = value ? parseIsoDate(value) : undefined;
    const triggerId = id ?? (label ? `date-picker-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
        <div className={cn('flex flex-col gap-1', className)}>
            {label ? (
                <Label htmlFor={triggerId} className="text-[11px] tracking-wider text-[#7c5b44]">
                    {label}
                </Label>
            ) : null}
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id={triggerId}
                        type="button"
                        variant="outline"
                        disabled={disabled}
                        className={cn(
                            'h-8 w-[9.5rem] justify-between px-2.5 text-left text-xs font-normal normal-case tracking-normal text-[#4a2518]',
                            !value && 'text-[#7c5b44]',
                        )}
                    >
                        <span className="truncate">{value ? formatDisplayDate(value) : placeholder}</span>
                        <CalendarIcon className="size-3.5 shrink-0 text-[#6e4a34]" aria-hidden />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        defaultMonth={selectedDate}
                        onSelect={(date) => {
                            onChange(date ? formatIsoDate(date) : undefined);
                            setOpen(false);
                        }}
                    />
                </PopoverContent>
            </Popover>
        </div>
    );
}

export { parseIsoDate };
