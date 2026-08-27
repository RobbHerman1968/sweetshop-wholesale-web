'use client';

import type { OrderDashboardStats } from '@/lib/db-pg/actions/order';
import { DashboardOrdersCharts } from './dashboard-orders-charts';

type DashboardContentProps = {
    orderStats: OrderDashboardStats;
};

export function DashboardContent({ orderStats }: DashboardContentProps) {
    return (
        <div className="mx-auto w-full max-w-7xl h-full min-h-full">
            <h1 className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#7c5b44]">Dashboard</h1>
            <DashboardOrdersCharts stats={orderStats} />
        </div>
    );
}
