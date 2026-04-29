import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'About Us | Sweet Shop USA Wholesale',
    description: 'Learn how Sweet Shop USA handcrafts chocolates, toffees, and clusters for wholesale partners.',
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
    return children;
}
