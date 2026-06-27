'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { SITE_MAIN_FOCUS_CLASS, SITE_MAIN_ID } from '@/lib/site-main';
import { cn } from '@/lib/utils';
import type { BrandBarNavCategory } from '@/assets/brand-bar-nav';

type AccountPageClientProps = {
    brandBarCategories: BrandBarNavCategory[];
    initialCartItemCount: number;
};

export function AccountPageClient({ brandBarCategories, initialCartItemCount }: AccountPageClientProps) {
    const router = useRouter();
    const { data: session, status } = useSession();

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.replace('/');
        }
    }, [status, router]);

    return (
        <div className="min-h-screen bg-white text-[#3c251a] font-sans">
            <SiteHeader
                onLoginClick={() => router.push('/')}
                brandBarCategories={brandBarCategories}
                initialCartItemCount={initialCartItemCount}
            />

            <main id={SITE_MAIN_ID} tabIndex={-1} className={cn('mx-auto max-w-6xl px-3 pt-1 pb-8 sm:px-4 sm:pt-1 sm:pb-10', SITE_MAIN_FOCUS_CLASS)}>
                {status === 'loading' ? (
                    <p className="text-sm text-[#6e4a34]" role="status" aria-live="polite">
                        Loading account…
                    </p>
                ) : session ? (
                    <div className="flex max-w-md flex-col gap-4 rounded-lg border border-[#d4c4b0] bg-[#fdf7ef] p-6">
                        <h1 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#4a2518]">Account</h1>
                        <dl className="flex flex-col gap-3 text-sm text-[#5c4032]">
                            <div>
                                <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a7264]">Name</dt>
                                <dd className="mt-0.5 font-medium text-[#3c251a]">{session.user?.name ?? '—'}</dd>
                            </div>
                            <div>
                                <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a7264]">Login</dt>
                                <dd className="mt-0.5 font-medium text-[#3c251a]">{session.user?.email ?? '—'}</dd>
                            </div>
                        </dl>
                        <Link href="/" className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6e4a34] underline underline-offset-4 hover:text-[#4a2518]">
                            Back to home
                        </Link>
                    </div>
                ) : null}
            </main>
        </div>
    );
}
