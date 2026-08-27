'use client';

import { useState, type ReactNode } from 'react';
import { LoginDialog } from '@/components/login-dialog';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import type { BrandBarNavCategory } from '@/assets/brand-bar-nav';

type PublicSiteShellClientProps = {
    children: ReactNode;
    brandBarCategories: BrandBarNavCategory[];
    initialCartItemCount: number;
    initialIsLoggedIn?: boolean;
    initialAccountDisplayName?: string | null;
    initialAccountShippingLeadTime?: number | null;
    termsPageHref?: string | null;
    privacyPageHref?: string | null;
};

export function PublicSiteShellClient({
    children,
    brandBarCategories,
    initialCartItemCount,
    initialIsLoggedIn = false,
    initialAccountDisplayName = null,
    initialAccountShippingLeadTime = null,
    termsPageHref = null,
    privacyPageHref = null,
}: PublicSiteShellClientProps) {
    const [isLoginOpen, setIsLoginOpen] = useState(false);

    return (
        <div className="flex min-h-screen min-w-0 flex-col bg-white text-[#3c251a] font-sans">
            <SiteHeader
                onLoginClick={() => setIsLoginOpen(true)}
                brandBarCategories={brandBarCategories}
                initialCartItemCount={initialCartItemCount}
                initialIsLoggedIn={initialIsLoggedIn}
                initialAccountDisplayName={initialAccountDisplayName}
                initialAccountShippingLeadTime={initialAccountShippingLeadTime}
            />
            <div className="min-w-0 flex-1 overflow-x-clip">{children}</div>
            <SiteFooter termsPageHref={termsPageHref} privacyPageHref={privacyPageHref} />
            <LoginDialog open={isLoginOpen} onOpenChange={setIsLoginOpen} />
        </div>
    );
}
