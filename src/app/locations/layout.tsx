import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Locations | Sweet Shop USA Wholesale',
    description: 'Visit Sweet Shop USA factory retail and find our handcrafted chocolates across Texas.',
};

export default function LocationsLayout({ children }: { children: React.ReactNode }) {
    return children;
}
