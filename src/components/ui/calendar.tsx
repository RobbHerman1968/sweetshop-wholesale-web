'use client';

import * as React from 'react';
import { DayPicker, type DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import 'react-day-picker/style.css';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            className={cn('rdp-sweetshop p-3', className)}
            classNames={{
                months: 'flex flex-col sm:flex-row gap-4',
                month: 'flex flex-col gap-4',
                month_caption: 'relative flex justify-center items-center h-9 min-h-9 px-10',
                caption_label: 'text-xs font-semibold uppercase tracking-wider text-[#6e4a34] z-[1]',
                nav: 'flex items-center gap-1',
                button_previous: 'absolute left-0 top-0 z-10 h-9 w-9 shrink-0 rounded-md border border-[#c49a78] bg-[#fdf7ef] text-[#6e4a34] hover:bg-[#f3e0cf] flex items-center justify-center',
                button_next: 'absolute right-0 top-0 z-10 h-9 w-9 shrink-0 rounded-md border border-[#c49a78] bg-[#fdf7ef] text-[#6e4a34] hover:bg-[#f3e0cf] flex items-center justify-center',
                month_grid: 'w-full border-collapse',
                weekdays: 'flex',
                weekday: 'w-9 rounded-md text-[11px] font-medium text-[#7c5b44]',
                week: 'flex w-full mt-1',
                day: 'relative p-0 text-center text-sm',
                day_button:
                    'h-9 w-9 rounded-md border border-transparent font-normal text-[#4a2518] hover:bg-[#f3e0cf] hover:border-[#c49a78] focus-visible:ring-2 focus-visible:ring-[#6e4a34] focus-visible:ring-offset-2',
                selected:
                    'bg-[#6e4a34] text-[#fdf7ef] hover:bg-[#5d3b29] hover:text-[#fdf7ef] focus:bg-[#6e4a34] focus:text-[#fdf7ef]',
                today: 'bg-[#e3cbb0] text-[#4a2518]',
                outside: 'text-[#c49a78] opacity-60',
                range_start: 'rounded-s-md bg-[#6e4a34] text-[#fdf7ef]',
                range_end: 'rounded-e-md bg-[#6e4a34] text-[#fdf7ef]',
                range_middle: 'rounded-none bg-[#e3cbb0]/50 text-[#4a2518]',
                hidden: 'invisible',
                ...classNames,
            }}
            components={{
                Chevron: ({ orientation }) =>
                    orientation === 'left' ? (
                        <ChevronLeft className="h-4 w-4" />
                    ) : (
                        <ChevronRight className="h-4 w-4" />
                    ),
            }}
            {...props}
        />
    );
}
Calendar.displayName = 'Calendar';

export { Calendar, type DateRange };
