import { PublicSiteShell } from '@/components/public-site-shell';
import { SITE_MAIN_FOCUS_CLASS, SITE_MAIN_ID } from '@/lib/site-main';
import { cn } from '@/lib/utils';

export default function ContactPage() {
    return (
        <PublicSiteShell>
            <main id={SITE_MAIN_ID} tabIndex={-1} className={cn('mx-auto max-w-6xl px-3 pb-14 pt-2 sm:px-4 sm:pb-16 sm:pt-3', SITE_MAIN_FOCUS_CLASS)}>
                <header className="mb-8 rounded-2xl border border-[#b89572] bg-gradient-to-r from-[#3d2518] via-[#5c3820] to-[#3d2518] px-5 py-8 text-[#fdf7ef] shadow-lg sm:rounded-3xl sm:px-10 sm:py-10">
                    <h1 className="text-xl font-semibold uppercase tracking-[0.28em] text-[#f5d9b8] sm:text-2xl sm:tracking-[0.32em]">Contact us</h1>
                    <p className="mt-3 max-w-2xl text-xs leading-relaxed text-[#fdf7ef]/90 sm:text-sm">
                        Our confections are handcrafted in Mount Pleasant, Texas. Visit factory retail for fresh assortments, seasonal specials, and gifts straight from the kitchen.
                    </p>
                </header>

                <div className="grid gap-6 md:grid-cols-2">
                    <article className="rounded-2xl border border-[#b89572] bg-[#f6ebdd] p-6 sm:p-7">
                        <h2 className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#5c4032]">Factory & headquarters</h2>
                        <p className="mt-3 text-xs leading-relaxed text-[#5c4032]">
                            Sweet Shop USA chocolate factory and main offices are located in Mount Pleasant, Texas. Wholesale orders ship from this facility nationwide.
                        </p>
                        <dl className="mt-5 space-y-3 text-xs text-[#5c4032]">
                            <div>
                                <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a7264]">Address</dt>
                                <dd className="mt-1 font-medium text-[#3c251a]">
                                    Sweet Shop USA
                                    <span className="mt-1 block font-normal">1316 Industrial Road</span>
                                    <span className="block font-normal">Mount Pleasant, TX 75455</span>
                                </dd>
                            </div>
                            <div>
                                <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a7264]">Phone</dt>
                                <dd className="mt-1">
                                    <a
                                        href="tel:+18002222269"
                                        className="font-semibold text-[#4a2518] underline-offset-4 hover:underline"
                                    >
                                        1-800-222-2269
                                    </a>
                                    <span className="mt-1 block text-[#6e4a34]">Customer service: Monday–Friday, 8AM–5PM CST</span>
                                </dd>
                            </div>
                            <div>
                                <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a7264]">Retail</dt>
                                <dd className="mt-1">Factory retail hours and holiday schedules are posted at the shop entrance and on our social channels.</dd>
                            </div>
                        </dl>
                    </article>

                    <article className="rounded-2xl border border-[#b89572] bg-[#f6ebdd] p-6 sm:p-7">
                        <h2 className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#5c4032]">Wholesale partners</h2>
                        <p className="mt-3 text-xs leading-relaxed text-[#5c4032]">
                            Our chocolates are carried by specialty grocers, gift shops, and regional retailers across the country. Sign in to the wholesale catalog to
                            browse SKUs, seasonal programs, and private label options.
                        </p>
                        <p className="mt-4 text-xs leading-relaxed text-[#5c4032]">
                            Interested in carrying Sweet Shop USA? Use <span className="font-semibold text-[#4a2518]">Apply Now</span> on the home page or call wholesale
                            support at{' '}
                            <a
                                href="tel:+18002222269"
                                className="font-semibold text-[#4a2518] underline underline-offset-2 hover:text-[#3c251a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a78] focus-visible:ring-offset-2"
                            >
                                1-800-222-2269
                            </a>
                            .
                        </p>
                    </article>
                </div>
            </main>
        </PublicSiteShell>
    );
}
