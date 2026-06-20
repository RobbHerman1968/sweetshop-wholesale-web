import { getOrderDashboardStats } from '@/lib/db-pg/actions/order';
import { DashboardContent } from './dashboard-content';

export default async function ManagePage() {
    const orderStats = await getOrderDashboardStats();

    return <DashboardContent orderStats={orderStats} />;
}
