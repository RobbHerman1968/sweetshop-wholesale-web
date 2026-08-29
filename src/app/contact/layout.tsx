import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Contact Us | Sweet Shop USA Wholesale',
    description: 'Visit Sweet Shop USA in Mount Pleasant, Texas, or call wholesale support for orders, accounts, and product questions.',
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
    return children;
}
