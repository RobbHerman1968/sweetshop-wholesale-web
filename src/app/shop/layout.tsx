import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Shop | Sweet Shop USA Wholesale',
    description: 'Browse wholesale chocolates, clusters, and toffee. Sign in to view live SKU, pricing, and availability.',
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
    return children;
}
