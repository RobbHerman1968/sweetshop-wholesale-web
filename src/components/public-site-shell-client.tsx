'use client';

import { useState, type ReactNode } from 'react';
import { LoginDialog } from '@/components/login-dialog';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import type { BrandBarNavCategory } from '@/assets/brand-bar-nav';

type PublicSiteShellClientProps = {
    children: ReactNode;
    brandBarCategories: BrandBarNavCategory[];
};

export function PublicSiteShellClient({ children, brandBarCategories }: PublicSiteShellClientProps) {
    const [isLoginOpen, setIsLoginOpen] = useState(false);

    return (
        <div className="min-h-screen bg-white text-[#3c251a] font-sans">
            <SiteHeader onLoginClick={() => setIsLoginOpen(true)} brandBarCategories={brandBarCategories} />
            {children}
            <SiteFooter />
            <LoginDialog open={isLoginOpen} onOpenChange={setIsLoginOpen} />
        </div>
    );
}
