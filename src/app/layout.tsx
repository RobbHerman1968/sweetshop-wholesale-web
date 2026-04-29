import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AuthSessionProvider } from '@/components/providers/session-provider';
import { SITE_MAIN_ID } from '@/lib/site-main';

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
});

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
});

export const metadata: Metadata = {
    title: 'Sweet Shop USA Wholesale',
    description: 'Sweet Shop USA Wholesale',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                <a href={`#${SITE_MAIN_ID}`} className="skip-to-main">
                    Skip to main content
                </a>
                <AuthSessionProvider>{children}</AuthSessionProvider>
            </body>
        </html>
    );
}
