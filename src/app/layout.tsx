import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { getServerSession } from 'next-auth';
import './globals.css';
import { authOptions } from '@/auth';
import { AppVersionReload } from '@/components/providers/app-version-reload';
import { AuthSessionProvider } from '@/components/providers/session-provider';
import { Toaster } from '@/components/ui/toaster';
import { APP_BUILD_ID } from '@/lib/app-build-id';
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

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    interactiveWidget: 'resizes-content',
};

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const session = await getServerSession(authOptions);

    return (
        <html lang="en">
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                <AuthSessionProvider session={session}>
                    <a href={`#${SITE_MAIN_ID}`} className="skip-to-main">
                        Skip to main content
                    </a>
                    {children}
                    <Toaster />
                    <AppVersionReload initialBuildId={APP_BUILD_ID} />
                </AuthSessionProvider>
            </body>
        </html>
    );
}
