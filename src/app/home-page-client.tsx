'use client';

import Link from 'next/link';
import { useState } from 'react';
import { LoginDialog } from '@/components/login-dialog';
import { SiteFooter } from '@/components/site-footer';
import { Button, buttonVariants } from '@/components/ui/button';
import { SiteHeader } from '@/components/site-header';
import { SITE_MAIN_FOCUS_CLASS, SITE_MAIN_ID } from '@/lib/site-main';
import { cn } from '@/lib/utils';
import type { BrandBarNavCategory } from '@/assets/brand-bar-nav';

const heroVideoSrc = 'https://tk1qsvgip35suuxh.public.blob.vercel-storage.com/videos/sweetshopusa-hero.mp4';

type HomePageClientProps = {
    brandBarCategories: BrandBarNavCategory[];
};

export function HomePageClient({ brandBarCategories }: HomePageClientProps) {
    const [isLoginOpen, setIsLoginOpen] = useState(false);

    return (
        <div className="min-h-screen bg-white text-[#3c251a] font-sans">
            <SiteHeader onLoginClick={() => setIsLoginOpen(true)} brandBarCategories={brandBarCategories} />

            <main id={SITE_MAIN_ID} tabIndex={-1} className={cn('mx-auto flex max-w-6xl flex-col gap-10 px-3 pb-14 pt-1 sm:px-4 sm:pb-16 sm:pt-1', SITE_MAIN_FOCUS_CLASS)}>
                {/* Hero banner */}
                <section className="relative min-h-[280px] overflow-hidden rounded-2xl border border-[#b89572] bg-gradient-to-r from-[#3d2518] via-[#5c3820] to-[#3d2518] text-[#fdf7ef] shadow-lg sm:min-h-[320px] sm:rounded-3xl">
                    {heroVideoSrc ? <video className="absolute inset-0 h-full w-full object-cover" src={heroVideoSrc} autoPlay muted loop playsInline aria-hidden /> : null}
                    <div className="absolute inset-0 bg-gradient-to-r from-[#3d2518]/85 via-[#2a1810]/70 to-[#3d2518]/85" aria-hidden />
                    <div className="absolute inset-0 opacity-30 mix-blend-overlay bg-[radial-gradient(circle_at_top,_#f5d4b8_0,_transparent_55%),radial-gradient(circle_at_bottom,_#2b1508_0,_transparent_55%)]" aria-hidden />
                    <div className="relative flex flex-col items-center gap-3 px-4 py-8 text-center sm:gap-4 sm:px-10 sm:py-10 md:px-16 md:py-14">
                        <h1 className="text-2xl font-semibold uppercase tracking-[0.35em] text-[#f5d9b8] sm:text-3xl sm:tracking-[0.4em]">SWEET SHOP USA</h1>
                        <p className="text-[11px] tracking-[0.28em] uppercase text-[#fdf7ef]/80 sm:text-sm sm:tracking-[0.35em]">Handmade Chocolates</p>
                        <p className="mt-3 max-w-xl text-xs leading-relaxed text-[#fdf7ef]/90 sm:mt-4 sm:max-w-2xl sm:text-sm">To view our wholesale items please sign in using your wholesale login or apply now to become a Sweet Shop USA wholesale partner.</p>
                        <p className="text-[11px] tracking-[0.26em] text-[#f5d9b8] sm:text-xs sm:tracking-[0.3em]">1-800-222-2269</p>
                        <div className="mt-4 flex w-full flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:justify-center sm:gap-4">
                            <Button type="button" variant="primary" className="bg-[#fdf7ef] text-[#251a0a]! hover:bg-[#ede0d4] px-4 py-1.5 text-[11px] sm:w-auto" onClick={() => setIsLoginOpen(true)}>
                                Wholesale Login
                            </Button>
                            <Link
                                href="/apply"
                                className={cn(
                                    buttonVariants({ variant: 'outline' }),
                                    'border-[#f5d9b8]/70 text-[#fdf7ef] hover:bg-[#5c3828] hover:text-[#fdf7ef] px-4 py-1.5 text-[11px] sm:w-auto text-center',
                                )}
                            >
                                Apply Now
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Content rows */}
                <section className="grid gap-6 md:gap-8 md:grid-cols-[2fr,2fr]">
                    {/* New items */}
                    <article className="rounded-2xl border border-[#b89572] bg-[#f6ebdd] p-6">
                        <h2 className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#5c4032]">New at Sweet Shop USA</h2>
                        <p className="mt-3 text-xs text-[#5c4032]">Discover our latest handcrafted truffles, seasonal assortments, and exclusive wholesale offerings for your shop or business.</p>
                        <div className="mt-5 h-32 rounded-2xl bg-gradient-to-tr from-[#c9a078] via-[#e8d0b8] to-[#faf0e8]" aria-hidden />
                        <Button type="button" variant="link" className="mt-4 text-[11px]">
                            View New Items
                        </Button>
                    </article>

                    {/* Spring collection */}
                    <article className="rounded-2xl border border-[#b89572] bg-[#f6ebdd] p-6">
                        <h2 className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#5c4032]">Spring Collection</h2>
                        <p className="mt-3 text-xs text-[#5c4032]">Bright, gift-ready packaging and fresh flavor profiles designed for spring holidays, celebrations, and corporate gifting.</p>
                        <div className="mt-5 grid h-32 grid-cols-2 gap-3" aria-hidden>
                            <div className="rounded-2xl bg-gradient-to-br from-[#f0d8bc] to-[#faf0e8]" />
                            <div className="rounded-2xl bg-gradient-to-br from-[#ddc09a] to-[#f0e0cc]" />
                        </div>
                        <Button type="button" variant="link" className="mt-4 text-[11px]">
                            Explore Spring
                        </Button>
                    </article>
                </section>

                {/* Brand / process / featured strip */}
                <section className="grid gap-6 md:gap-8 md:grid-cols-3">
                    <div className="rounded-2xl border border-[#b89572] bg-[#f6ebdd] p-5 sm:p-6">
                        <h3 className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#5c4032]">Our Family of Brands</h3>
                        <p className="mt-3 text-xs text-[#5c4032]">Sweet Shop USA crafts confections for leading national and regional brands, private label programs, and specialty retailers.</p>
                    </div>
                    <div className="rounded-2xl border border-[#b89572] bg-[#f6ebdd] p-5 sm:p-6">
                        <h3 className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#5c4032]">Handcrafting Process</h3>
                        <p className="mt-3 text-xs text-[#5c4032]">Every piece is hand dipped, decorated, and inspected in our Texas chocolate factory, following time-honored techniques.</p>
                        <Button type="button" variant="outline" className="mt-4 px-4 py-1.5 text-[11px]">
                            Watch the Process
                        </Button>
                    </div>
                    <div className="rounded-2xl border border-[#b89572] bg-[#f6ebdd] p-5 sm:p-6">
                        <h3 className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#5c4032]">Featured Items</h3>
                        <p className="mt-3 text-xs text-[#5c4032]">Curated assortments, best-selling truffles, and premium toffees ready to delight your customers.</p>
                    </div>
                </section>
            </main>

            <LoginDialog open={isLoginOpen} onOpenChange={setIsLoginOpen} />

            <SiteFooter />
        </div>
    );
}
