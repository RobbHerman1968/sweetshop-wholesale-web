import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Contact Us | Sweet Shop USA Wholesale',
    description: 'Reach Sweet Shop USA wholesale support by phone or email for orders, accounts, and product questions.',
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
    return children;
}
