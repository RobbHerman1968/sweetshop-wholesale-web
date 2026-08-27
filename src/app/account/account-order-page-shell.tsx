'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { SiteHeader } from '@/components/site-header';
import { SITE_MAIN_FOCUS_CLASS, SITE_MAIN_ID } from '@/lib/site-main';
import { cn } from '@/lib/utils';
import type { BrandBarNavCategory } from '@/assets/brand-bar-nav';

type AccountOrderPageShellProps = {
    brandBarCategories: BrandBarNavCategory[];
    initialCartItemCount: number;
    initialIsLoggedIn?: boolean;
    initialAccountDisplayName?: string | null;
    initialAccountShippingLeadTime?: number | null;
    children: React.ReactNode;
};

export function AccountOrderPageShell({
    brandBarCategories,
    initialCartItemCount,
    initialIsLoggedIn = true,
    initialAccountDisplayName = null,
    initialAccountShippingLeadTime = null,
    children,
}: AccountOrderPageShellProps) {
    const router = useRouter();
    const { status } = useSession();

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.replace('/');
        }
    }, [status, router]);

    return (
        <div className="min-h-screen min-w-0 overflow-x-clip bg-white text-[#3c251a] font-sans">
            <SiteHeader
                onLoginClick={() => router.push('/')}
                brandBarCategories={brandBarCategories}
                initialCartItemCount={initialCartItemCount}
                initialIsLoggedIn={initialIsLoggedIn}
                initialAccountDisplayName={initialAccountDisplayName}
                initialAccountShippingLeadTime={initialAccountShippingLeadTime}
            />

            <main
                id={SITE_MAIN_ID}
                tabIndex={-1}
                className={cn(
                    'mx-auto min-w-0 max-w-6xl border-t-2 border-[#c49a78]/45 bg-gradient-to-b from-[#fdf7ef] to-white px-3 pt-4 pb-8 sm:border-t sm:bg-none sm:px-4 sm:pt-4 sm:pb-10',
                    SITE_MAIN_FOCUS_CLASS,
                )}
            >
                {children}
            </main>
        </div>
    );
}
