'use client';

import Link from 'next/link';
import { useState } from 'react';
import { LoginDialog } from '@/components/login-dialog';
import { RemoteImage } from '@/components/remote-image';
import { SiteFooter } from '@/components/site-footer';
import { Button, buttonVariants } from '@/components/ui/button';
import { SiteHeader } from '@/components/site-header';
import { SITE_MAIN_FOCUS_CLASS, SITE_MAIN_ID } from '@/lib/site-main';
import type { HomePageDisplayContent } from '@/lib/homepage-content';
import { cn } from '@/lib/utils';
import type { BrandBarNavCategory } from '@/assets/brand-bar-nav';

type HomePageClientProps = {
    brandBarCategories: BrandBarNavCategory[];
    initialCartItemCount: number;
    initialIsLoggedIn?: boolean;
    initialAccountDisplayName?: string | null;
    initialAccountShippingLeadTime?: number | null;
    termsPageHref?: string | null;
    privacyPageHref?: string | null;
    content: HomePageDisplayContent;
};

function stripHtml(value: string): string {
    return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function HomePageProductCard({ product }: { product: HomePageDisplayContent['sections'][number]['products'][number] }) {
    const label = stripHtml(product.name) || `Product ${product.id}`;

    return (
        <article className="flex h-full flex-col overflow-hidden rounded-xl border border-[#b89572] bg-[#fdf7ef] shadow-sm">
            <div className="relative h-48 w-full shrink-0 overflow-hidden bg-white sm:h-52 xl:h-44">
                {product.imagePath ? (
                    <RemoteImage src={product.imagePath} alt={label} sizes="(max-width: 1024px) 33vw, 240px" className="brightness-110" />
                ) : (
                    <div className="flex h-full items-center justify-center text-[11px] font-medium uppercase tracking-wider text-[#8b6b4a]">No image</div>
                )}
            </div>
            <div className="flex flex-1 flex-col justify-center p-4">
                <h3 className="text-[12px] font-bold uppercase leading-snug tracking-[0.11em] text-[#4a2518] line-clamp-4">{label}</h3>
            </div>
        </article>
    );
}

function HomePageSectionBlock({ section }: { section: HomePageDisplayContent['sections'][number] }) {
    return (
        <section className="rounded-2xl border border-[#b89572] bg-[#f6ebdd] p-6 sm:p-8">
            <div className="grid gap-6 xl:grid-cols-4 xl:items-stretch">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between xl:col-span-1 xl:h-full xl:flex-col xl:gap-0 xl:pr-2">
                    <div className="max-w-3xl xl:flex xl:min-h-0 xl:max-w-none xl:flex-1 xl:flex-col">
                        <h2 className="text-[13px] font-semibold uppercase tracking-[0.24em] text-[#5c4032] sm:text-sm sm:tracking-[0.26em] xl:shrink-0">{section.title}</h2>
                        {section.description ? (
                            <div className="mt-3 xl:mt-0 xl:flex xl:flex-1 xl:items-center">
                                <p className="text-sm leading-relaxed text-[#5c4032] sm:text-base">{section.description}</p>
                            </div>
                        ) : null}
                    </div>
                    <Link
                        href={section.categoryHref}
                        className={cn(buttonVariants({ variant: 'outline' }), 'shrink-0 px-4 py-1.5 text-[11px] xl:mt-auto xl:w-fit')}
                    >
                        View category
                    </Link>
                </div>

                {section.products.length > 0 ? (
                    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:col-span-3 xl:grid-cols-3 xl:gap-6">
                        {section.products.map((product) => (
                            <li key={product.id} className="h-full min-w-0">
                                <HomePageProductCard product={product} />
                            </li>
                        ))}
                    </ul>
                ) : null}
            </div>
        </section>
    );
}

export function HomePageClient({
    brandBarCategories,
    initialCartItemCount,
    initialIsLoggedIn = false,
    initialAccountDisplayName = null,
    initialAccountShippingLeadTime = null,
    termsPageHref = null,
    privacyPageHref = null,
    content,
}: HomePageClientProps) {
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const { hero, sections } = content;

    return (
        <div className="min-h-screen min-w-0 bg-white text-[#3c251a] font-sans">
            <SiteHeader
                onLoginClick={() => setIsLoginOpen(true)}
                brandBarCategories={brandBarCategories}
                initialCartItemCount={initialCartItemCount}
                initialIsLoggedIn={initialIsLoggedIn}
                initialAccountDisplayName={initialAccountDisplayName}
                initialAccountShippingLeadTime={initialAccountShippingLeadTime}
            />

            <main id={SITE_MAIN_ID} tabIndex={-1} className={cn('mx-auto flex max-w-6xl flex-col gap-10 overflow-x-clip px-3 pb-14 pt-1 sm:px-4 sm:pb-16 sm:pt-1', SITE_MAIN_FOCUS_CLASS)}>
                <section className="relative min-h-[280px] overflow-hidden rounded-2xl border border-[#b89572] bg-gradient-to-r from-[#3d2518] via-[#5c3820] to-[#3d2518] text-[#fdf7ef] shadow-lg sm:min-h-[320px] sm:rounded-3xl">
                    {hero.videoUrl ? <video className="absolute inset-0 h-full w-full object-cover" src={hero.videoUrl} autoPlay muted loop playsInline aria-hidden /> : null}
                    <div className="absolute inset-0 bg-gradient-to-r from-[#3d2518]/85 via-[#2a1810]/70 to-[#3d2518]/85" aria-hidden />
                    <div className="absolute inset-0 opacity-30 mix-blend-overlay bg-[radial-gradient(circle_at_top,_#f5d4b8_0,_transparent_55%),radial-gradient(circle_at_bottom,_#2b1508_0,_transparent_55%)]" aria-hidden />
                    <div className="relative flex flex-col items-center gap-3 px-4 py-8 text-center sm:gap-4 sm:px-10 sm:py-10 md:px-16 md:py-14">
                        <h1 className="text-2xl font-semibold uppercase tracking-[0.35em] text-[#f5d9b8] sm:text-3xl sm:tracking-[0.4em]">{hero.title}</h1>
                        <p className="text-[11px] tracking-[0.28em] uppercase text-[#fdf7ef]/80 sm:text-sm sm:tracking-[0.35em]">{hero.subtitle}</p>
                        <p className="mt-3 max-w-xl text-xs leading-relaxed text-[#fdf7ef]/90 sm:mt-4 sm:max-w-2xl sm:text-sm">{hero.body}</p>
                        <p className="text-[11px] tracking-[0.26em] text-[#f5d9b8] sm:text-xs sm:tracking-[0.3em]">{hero.phone}</p>
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

                {sections.map((section) => (
                    <HomePageSectionBlock key={`${section.categoryId}-${section.title}`} section={section} />
                ))}
            </main>

            <LoginDialog open={isLoginOpen} onOpenChange={setIsLoginOpen} />

            <SiteFooter termsPageHref={termsPageHref} privacyPageHref={privacyPageHref} />
        </div>
    );
}
