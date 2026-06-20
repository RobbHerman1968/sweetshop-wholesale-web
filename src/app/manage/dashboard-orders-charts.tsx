'use client';

import { useMemo, useState } from 'react';
import moment from 'moment-timezone';
import {
    Area,
    Bar,
    CartesianGrid,
    ComposedChart,
    Legend,
    Line,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { cn } from '@/lib/utils';
import type { OrderDashboardStats, OrderDailyStat } from '@/lib/db-pg/actions/order';

type Period = 7 | 30 | 90 | 'ytd';

type DashboardOrdersChartsProps = {
    stats: OrderDashboardStats;
};

const PERIODS: Array<{ value: Period; label: string }> = [
    { value: 7, label: '7d' },
    { value: 30, label: '30d' },
    { value: 90, label: '90d' },
    { value: 'ytd', label: 'YTD' },
];
const CHICAGO = 'America/Chicago';
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
const YEAR_COLORS = ['#4a2518', '#8b5a3c', '#c49a78', '#7c5b44', '#6e4a34', '#a07858'] as const;

const currency = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
});

const currencyPrecise = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

function formatShortDate(date: string) {
    return moment.tz(date, CHICAGO).format('MMM D');
}

function formatLongDate(date: string) {
    return moment.tz(date, CHICAGO).format('ddd, MMM D, YYYY');
}

function formatPctChange(current: number, previous: number) {
    if (previous <= 0) {
        return current > 0 ? '+100%' : '—';
    }
    const change = ((current - previous) / previous) * 100;
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
}

type ChartPoint = OrderDailyStat & {
    label: string;
    dayOfWeek: number;
};

function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: ChartPoint }> }) {
    if (!active || !payload?.length) return null;
    const point = payload[0]?.payload;
    if (!point) return null;

    return (
        <div className="rounded-md border border-[#c49a78] bg-[#fdf7ef] px-3 py-2 text-xs shadow-md">
            <p className="font-semibold text-[#4a2518]">{formatLongDate(point.date)}</p>
            <p className="mt-1 text-[#7c5b44]">
                <span className="font-medium text-[#4a2518]">{point.orderCount}</span> orders
            </p>
            <p className="text-[#7c5b44]">
                <span className="font-medium text-[#4a2518]">{currencyPrecise.format(point.revenue)}</span> revenue
            </p>
            {point.orderCount > 0 ? (
                <p className="text-[#7c5b44]">
                    <span className="font-medium text-[#4a2518]">{currencyPrecise.format(point.avgOrderValue)}</span> avg order
                </p>
            ) : null}
        </div>
    );
}

function WeekdayTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: { day: string; orders: number; revenue: number } }> }) {
    if (!active || !payload?.length) return null;
    const point = payload[0]?.payload;
    if (!point) return null;

    return (
        <div className="rounded-md border border-[#c49a78] bg-[#fdf7ef] px-3 py-2 text-xs shadow-md">
            <p className="font-semibold text-[#4a2518]">{point.day}</p>
            <p className="mt-1 text-[#7c5b44]">
                <span className="font-medium text-[#4a2518]">{point.orders}</span> orders
            </p>
            <p className="text-[#7c5b44]">
                <span className="font-medium text-[#4a2518]">{currencyPrecise.format(point.revenue)}</span> revenue
            </p>
        </div>
    );
}

function YearMonthlyTooltip({
    active,
    payload,
    label,
    selectedYears,
}: {
    active?: boolean;
    payload?: Array<{ dataKey?: string; value?: number; color?: string }>;
    label?: string;
    selectedYears: number[];
}) {
    if (!active || !payload?.length) return null;

    return (
        <div className="rounded-md border border-[#c49a78] bg-[#fdf7ef] px-3 py-2 text-xs shadow-md">
            <p className="font-semibold text-[#4a2518]">{label}</p>
            <div className="mt-2 space-y-1">
                {selectedYears.map((year) => {
                    const entry = payload.find((item) => item.dataKey === `revenue_${year}`);
                    if (entry == null) return null;
                    return (
                        <p key={year} className="text-[#7c5b44]">
                            <span className="font-medium text-[#4a2518]">{year}:</span> {currencyPrecise.format(Number(entry.value ?? 0))}
                        </p>
                    );
                })}
            </div>
        </div>
    );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
    return (
        <div className="rounded-lg border border-[#c49a78]/60 bg-[#f8eddf] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#7c5b44]">{label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-[#4a2518]">{value}</p>
            {hint ? <p className="mt-1 text-[11px] text-[#6e4a34]">{hint}</p> : null}
        </div>
    );
}

function YtdCompareCard({
    year,
    orderCount,
    revenue,
    avgOrderValue,
    throughLabel,
    revenueChange,
    ordersChange,
}: {
    year: number;
    orderCount: number;
    revenue: number;
    avgOrderValue: number;
    throughLabel: string;
    revenueChange?: string;
    ordersChange?: string;
}) {
    return (
        <div className="rounded-lg border border-[#c49a78]/60 bg-[#f8eddf] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#7c5b44]">{year} YTD</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-[#4a2518]">{currency.format(revenue)}</p>
            <p className="mt-1 text-sm text-[#6e4a34]">{orderCount.toLocaleString()} orders · {currencyPrecise.format(avgOrderValue)} avg</p>
            <p className="mt-1 text-[11px] text-[#7c5b44]">{throughLabel}</p>
            {revenueChange ? (
                <p className="mt-1 text-[11px] font-medium text-[#4a2518]">
                    Revenue vs prior year: <span className={revenueChange.startsWith('+') ? 'text-[#4a2518]' : 'text-[#8b5a3c]'}>{revenueChange}</span>
                    {' · '}
                    Orders: <span className={ordersChange?.startsWith('+') ? 'text-[#4a2518]' : 'text-[#8b5a3c]'}>{ordersChange}</span>
                </p>
            ) : null}
        </div>
    );
}

function toggleYearSelection(selectedYears: number[], year: number) {
    if (selectedYears.includes(year)) {
        if (selectedYears.length === 1) return selectedYears;
        return selectedYears.filter((value) => value !== year);
    }

    const next = [...selectedYears, year].sort((a, b) => b - a);
    return next.slice(0, 4);
}

export function DashboardOrdersCharts({ stats }: DashboardOrdersChartsProps) {
    const currentYear = moment.tz(CHICAGO).year();
    const currentMonth = moment.tz(CHICAGO).month() + 1;
    const [period, setPeriod] = useState<Period>(30);
    const [selectedYears, setSelectedYears] = useState<number[]>(() => {
        const defaults = stats.availableYears.slice(0, 3);
        return defaults.length > 0 ? defaults : [currentYear];
    });

    const activeDaily = period === 'ytd' ? stats.ytdDaily : stats.recentDaily;

    const chartData = useMemo(() => {
        const slice = period === 'ytd' ? activeDaily : activeDaily.slice(-(period as number));
        return slice.map((row) => ({
            ...row,
            label: formatShortDate(row.date),
            dayOfWeek: moment.tz(row.date, CHICAGO).day(),
        }));
    }, [activeDaily, period]);

    const summary = useMemo(() => {
        const totalOrders = chartData.reduce((sum, row) => sum + row.orderCount, 0);
        const totalRevenue = chartData.reduce((sum, row) => sum + row.revenue, 0);
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        const bestRevenueDay = chartData.reduce<(typeof chartData)[number] | null>((best, row) => {
            if (!best || row.revenue > best.revenue) return row;
            return best;
        }, null);

        const today = moment.tz(CHICAGO).format('YYYY-MM-DD');
        const todayRow = chartData.find((row) => row.date === today);
        const periodLabel = period === 'ytd' ? `${currentYear} year to date` : `Last ${period} days`;

        return {
            totalOrders,
            totalRevenue,
            avgOrderValue,
            bestRevenueDay,
            todayOrders: todayRow?.orderCount ?? 0,
            todayRevenue: todayRow?.revenue ?? 0,
            periodLabel,
        };
    }, [chartData, currentYear, period]);

    const weekdayData = useMemo(() => {
        const buckets = DAY_LABELS.map((day) => ({ day, orders: 0, revenue: 0 }));

        for (const row of chartData) {
            buckets[row.dayOfWeek].orders += row.orderCount;
            buckets[row.dayOfWeek].revenue += row.revenue;
        }

        return [...buckets.slice(1), buckets[0]];
    }, [chartData]);

    const monthlyChartData = useMemo(() => {
        return MONTH_LABELS.map((monthLabel, index) => {
            const month = index + 1;
            const point: Record<string, string | number> = { monthLabel, month };

            for (const year of selectedYears) {
                const stat = stats.monthlyByYear.find((row) => row.year === year && row.month === month);
                point[`revenue_${year}`] = stat?.revenue ?? 0;
                point[`orders_${year}`] = stat?.orderCount ?? 0;
            }

            return point;
        });
    }, [selectedYears, stats.monthlyByYear]);

    const cumulativeYtdChartData = useMemo(() => {
        return MONTH_LABELS.slice(0, currentMonth).map((monthLabel, index) => {
            const month = index + 1;
            const point: Record<string, string | number> = { monthLabel, month };

            for (const year of selectedYears) {
                const cumulativeRevenue = stats.monthlyByYear
                    .filter((row) => row.year === year && row.month <= month)
                    .reduce((sum, row) => sum + row.revenue, 0);
                const cumulativeOrders = stats.monthlyByYear
                    .filter((row) => row.year === year && row.month <= month)
                    .reduce((sum, row) => sum + row.orderCount, 0);

                point[`revenue_${year}`] = cumulativeRevenue;
                point[`orders_${year}`] = cumulativeOrders;
            }

            return point;
        });
    }, [currentMonth, selectedYears, stats.monthlyByYear]);

    const revenueTicks = useMemo(() => {
        const max = Math.max(...chartData.map((row) => row.revenue), 1);
        const step = max <= 5000 ? 1000 : max <= 25000 ? 5000 : 10000;
        const top = Math.ceil(max / step) * step;
        return Array.from({ length: 5 }, (_, i) => (top / 4) * i);
    }, [chartData]);

    const orderTicks = useMemo(() => {
        const max = Math.max(...chartData.map((row) => row.orderCount), 1);
        const top = Math.max(Math.ceil(max / 5) * 5, 5);
        return Array.from({ length: 5 }, (_, i) => Math.round((top / 4) * i));
    }, [chartData]);

    const barSize = period === 'ytd' ? 6 : period === 7 ? 28 : period === 30 ? 16 : 8;

    return (
        <section className="mb-8 space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h2 className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7c5b44]">Order activity</h2>
                    <p className="mt-1 text-xs text-[#6e4a34]">Daily orders and revenue in Central time</p>
                </div>
                <div className="flex rounded-md border border-[#c49a78]/70 bg-[#f8eddf] p-0.5">
                    {PERIODS.map(({ value, label }) => (
                        <button
                            key={label}
                            type="button"
                            onClick={() => setPeriod(value)}
                            className={cn(
                                'rounded px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors',
                                period === value ? 'bg-[#4a2518] text-[#fdf7ef]' : 'text-[#7c5b44] hover:bg-[#f3e0cf]',
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Orders" value={summary.totalOrders.toLocaleString()} hint={summary.periodLabel} />
                <StatCard label="Revenue" value={currency.format(summary.totalRevenue)} hint={summary.periodLabel} />
                <StatCard label="Avg order" value={currencyPrecise.format(summary.avgOrderValue)} hint="Across selected period" />
                <StatCard
                    label="Today"
                    value={`${summary.todayOrders} orders`}
                    hint={summary.todayRevenue > 0 ? currencyPrecise.format(summary.todayRevenue) : 'No orders yet today'}
                />
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <div className="rounded-lg border border-[#c49a78]/60 bg-[#f8eddf] p-4">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#7c5b44]">Daily trend</p>
                            <p className="mt-0.5 text-xs text-[#6e4a34]">Bars = orders · Area = revenue</p>
                        </div>
                        {summary.bestRevenueDay && summary.bestRevenueDay.revenue > 0 ? (
                            <p className="text-[11px] text-[#6e4a34]">
                                Peak day:{' '}
                                <span className="font-medium text-[#4a2518]">
                                    {formatShortDate(summary.bestRevenueDay.date)} ({currency.format(summary.bestRevenueDay.revenue)})
                                </span>
                            </p>
                        ) : null}
                    </div>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#c49a78" stopOpacity={0.55} />
                                        <stop offset="100%" stopColor="#c49a78" stopOpacity={0.05} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid stroke="#d9b89a" strokeDasharray="4 4" vertical={false} />
                                <XAxis
                                    dataKey="label"
                                    tick={{ fill: '#7c5b44', fontSize: 10 }}
                                    axisLine={{ stroke: '#c49a78' }}
                                    tickLine={false}
                                    minTickGap={period === 7 ? 0 : period === 'ytd' ? 20 : 24}
                                />
                                <YAxis
                                    yAxisId="revenue"
                                    ticks={revenueTicks}
                                    tick={{ fill: '#7c5b44', fontSize: 10 }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(value: number) => currency.format(value)}
                                    width={72}
                                />
                                <YAxis
                                    yAxisId="orders"
                                    orientation="right"
                                    ticks={orderTicks}
                                    tick={{ fill: '#7c5b44', fontSize: 10 }}
                                    axisLine={false}
                                    tickLine={false}
                                    allowDecimals={false}
                                    width={32}
                                />
                                <Tooltip content={<ChartTooltip />} />
                                <Area
                                    yAxisId="revenue"
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#8b5a3c"
                                    strokeWidth={2}
                                    fill="url(#revenueGradient)"
                                    activeDot={{ r: 4, fill: '#4a2518', stroke: '#fdf7ef', strokeWidth: 2 }}
                                />
                                <Bar yAxisId="orders" dataKey="orderCount" fill="#4a2518" radius={[3, 3, 0, 0]} maxBarSize={barSize} opacity={0.85} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="rounded-lg border border-[#c49a78]/60 bg-[#f8eddf] p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#7c5b44]">By weekday</p>
                        <p className="mt-0.5 text-xs text-[#6e4a34]">Which days drive the most volume</p>
                        <div className="mt-4 h-40 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={weekdayData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                                    <CartesianGrid stroke="#d9b89a" strokeDasharray="4 4" vertical={false} />
                                    <XAxis dataKey="day" tick={{ fill: '#7c5b44', fontSize: 10 }} axisLine={{ stroke: '#c49a78' }} tickLine={false} />
                                    <YAxis tick={{ fill: '#7c5b44', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <Tooltip content={<WeekdayTooltip />} />
                                    <Bar dataKey="orders" fill="#7c5b44" radius={[3, 3, 0, 0]} maxBarSize={28} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="rounded-lg border border-[#c49a78]/60 bg-[#f8eddf] p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#7c5b44]">Avg order value</p>
                        <p className="mt-0.5 text-xs text-[#6e4a34]">Daily average ticket size</p>
                        <div className="mt-4 h-40 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                                    <CartesianGrid stroke="#d9b89a" strokeDasharray="4 4" vertical={false} />
                                    <XAxis
                                        dataKey="label"
                                        tick={{ fill: '#7c5b44', fontSize: 10 }}
                                        axisLine={{ stroke: '#c49a78' }}
                                        tickLine={false}
                                        minTickGap={period === 7 ? 0 : period === 'ytd' ? 32 : 32}
                                    />
                                    <YAxis
                                        tick={{ fill: '#7c5b44', fontSize: 10 }}
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={(value: number) => currency.format(value)}
                                        width={56}
                                    />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Line
                                        type="monotone"
                                        dataKey="avgOrderValue"
                                        stroke="#4a2518"
                                        strokeWidth={2}
                                        dot={period === 7 || period === 30 ? { r: 2, fill: '#4a2518' } : false}
                                        activeDot={{ r: 4, fill: '#4a2518', stroke: '#fdf7ef', strokeWidth: 2 }}
                                    />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-4 rounded-lg border border-[#c49a78]/60 bg-[#f8eddf] p-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h2 className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7c5b44]">Year over year</h2>
                        <p className="mt-1 text-xs text-[#6e4a34]">Compare the same calendar period across years (Central time)</p>
                    </div>
                    <div className="flex flex-wrap gap-1 rounded-md border border-[#c49a78]/70 bg-[#fdf7ef] p-1">
                        {stats.availableYears.map((year) => (
                            <button
                                key={year}
                                type="button"
                                onClick={() => setSelectedYears((current) => toggleYearSelection(current, year))}
                                className={cn(
                                    'rounded px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors',
                                    selectedYears.includes(year) ? 'bg-[#4a2518] text-[#fdf7ef]' : 'text-[#7c5b44] hover:bg-[#f3e0cf]',
                                )}
                            >
                                {year}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {stats.ytdComparison
                        .filter((row) => selectedYears.includes(row.year))
                        .map((row) => {
                            const prior = stats.ytdComparison.find((entry) => entry.year === row.year - 1);
                            return (
                                <YtdCompareCard
                                    key={row.year}
                                    year={row.year}
                                    orderCount={row.orderCount}
                                    revenue={row.revenue}
                                    avgOrderValue={row.avgOrderValue}
                                    throughLabel={row.throughLabel}
                                    revenueChange={prior ? formatPctChange(row.revenue, prior.revenue) : undefined}
                                    ordersChange={prior ? formatPctChange(row.orderCount, prior.orderCount) : undefined}
                                />
                            );
                        })}
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#7c5b44]">Monthly revenue by year</p>
                        <p className="mt-0.5 text-xs text-[#6e4a34]">Full calendar months · toggle years above</p>
                        <div className="mt-4 h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={monthlyChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                    <CartesianGrid stroke="#d9b89a" strokeDasharray="4 4" vertical={false} />
                                    <XAxis dataKey="monthLabel" tick={{ fill: '#7c5b44', fontSize: 10 }} axisLine={{ stroke: '#c49a78' }} tickLine={false} />
                                    <YAxis
                                        tick={{ fill: '#7c5b44', fontSize: 10 }}
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={(value: number) => currency.format(value)}
                                        width={72}
                                    />
                                    <Tooltip content={<YearMonthlyTooltip selectedYears={selectedYears} />} />
                                    <Legend wrapperStyle={{ fontSize: 10, color: '#7c5b44' }} />
                                    {selectedYears.map((year, index) => (
                                        <Bar
                                            key={year}
                                            dataKey={`revenue_${year}`}
                                            name={`${year}`}
                                            fill={YEAR_COLORS[index % YEAR_COLORS.length]}
                                            radius={[2, 2, 0, 0]}
                                            maxBarSize={selectedYears.length > 2 ? 10 : 16}
                                        />
                                    ))}
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#7c5b44]">Cumulative YTD revenue</p>
                        <p className="mt-0.5 text-xs text-[#6e4a34]">Running total Jan–{MONTH_LABELS[currentMonth - 1]} for fair same-period comparison</p>
                        <div className="mt-4 h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={cumulativeYtdChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                    <CartesianGrid stroke="#d9b89a" strokeDasharray="4 4" vertical={false} />
                                    <XAxis dataKey="monthLabel" tick={{ fill: '#7c5b44', fontSize: 10 }} axisLine={{ stroke: '#c49a78' }} tickLine={false} />
                                    <YAxis
                                        tick={{ fill: '#7c5b44', fontSize: 10 }}
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={(value: number) => currency.format(value)}
                                        width={72}
                                    />
                                    <Tooltip content={<YearMonthlyTooltip selectedYears={selectedYears} />} />
                                    <Legend wrapperStyle={{ fontSize: 10, color: '#7c5b44' }} />
                                    {selectedYears.map((year, index) => (
                                        <Line
                                            key={year}
                                            type="monotone"
                                            dataKey={`revenue_${year}`}
                                            name={`${year}`}
                                            stroke={YEAR_COLORS[index % YEAR_COLORS.length]}
                                            strokeWidth={2}
                                            dot={{ r: 2, fill: YEAR_COLORS[index % YEAR_COLORS.length] }}
                                            activeDot={{ r: 4, stroke: '#fdf7ef', strokeWidth: 2 }}
                                        />
                                    ))}
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
