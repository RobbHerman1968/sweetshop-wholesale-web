'use client';

import { useState, type ReactNode } from 'react';
import { LoginDialog } from '@/components/login-dialog';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

type PublicSiteShellProps = {
    children: ReactNode;
};

export function PublicSiteShell({ children }: PublicSiteShellProps) {
    const [isLoginOpen, setIsLoginOpen] = useState(false);

    return (
        <div className="min-h-screen bg-white text-[#3c251a] font-sans">
            <SiteHeader onLoginClick={() => setIsLoginOpen(true)} />
            {children}
            <SiteFooter />
            <LoginDialog open={isLoginOpen} onOpenChange={setIsLoginOpen} />
        </div>
    );
}
