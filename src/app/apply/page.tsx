import Link from 'next/link';
import { PublicSiteShell } from '@/components/public-site-shell';
import { WholesaleApplicationForm } from '@/components/wholesale-application-form';
import { SITE_MAIN_FOCUS_CLASS, SITE_MAIN_ID } from '@/lib/site-main';
import { cn } from '@/lib/utils';

const baseButtonClass =
    'inline-flex cursor-pointer items-center justify-center whitespace-nowrap rounded-md px-5 py-2 text-xs font-semibold uppercase tracking-[0.22em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50';
const outlineButtonClass = 'border border-[#c49a78] bg-transparent text-[#6e4a34] hover:bg-[#f3e0cf]';

export default function ApplyPage() {
    return (
        <PublicSiteShell>
            <main id={SITE_MAIN_ID} tabIndex={-1} className={cn('mx-auto max-w-6xl px-3 pb-14 pt-2 sm:px-4 sm:pb-16 sm:pt-3', SITE_MAIN_FOCUS_CLASS)}>
                <header className="mb-8 rounded-2xl border border-[#b89572] bg-gradient-to-r from-[#3d2518] via-[#5c3820] to-[#3d2518] px-5 py-8 text-[#fdf7ef] shadow-lg sm:rounded-3xl sm:px-10 sm:py-10">
                    <h1 className="text-xl font-semibold uppercase tracking-[0.28em] text-[#f5d9b8] sm:text-2xl sm:tracking-[0.32em]">Apply for wholesale</h1>
                    <p className="mt-3 max-w-2xl text-xs leading-relaxed text-[#fdf7ef]/90 sm:text-sm">
                        Partner with Sweet Shop USA to offer handcrafted chocolates, clusters, and toffees to your customers. Submit your business details below — we typically respond within 2 business days.
                    </p>
                </header>

                <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
                    <WholesaleApplicationForm />

                    <aside className="space-y-6">
                        <article className="rounded-2xl border border-[#b89572] bg-[#f6ebdd] p-6 sm:p-7">
                            <h2 className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#5c4032]">Who we serve</h2>
                            <p className="mt-4 text-xs leading-relaxed text-[#5c4032]">
                                Wholesale accounts are intended for retailers, specialty shops, corporate gifting programs, and other businesses that resell or distribute our products. We&apos;ll confirm your tax or resale credentials as part of onboarding.
                            </p>
                            <h3 className="mt-8 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#5c4032]">How it works</h3>
                            <ol className="mt-4 list-decimal space-y-3 pl-5 text-xs leading-relaxed text-[#5c4032] marker:text-[#8a7264]">
                                <li>Submit your business details using the request form.</li>
                                <li>Our team reviews your application and may follow up with questions.</li>
                                <li>Once approved, you&apos;ll receive login access to the wholesale catalog and ordering.</li>
                            </ol>
                        </article>

                        <article className="rounded-2xl border border-[#b89572] bg-[#fdf7ef] p-6 sm:p-7">
                            <h2 className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#5c4032]">Questions?</h2>
                            <p className="mt-3 text-xs leading-relaxed text-[#5c4032]">
                                Call wholesale customer service to speak with a representative.
                            </p>
                            <dl className="mt-6 space-y-4 text-xs text-[#5c4032]">
                                <div>
                                    <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a7264]">Wholesale support</dt>
                                    <dd className="mt-1">
                                        <a href="tel:+18002720887" className="font-semibold text-[#4a2518] underline-offset-4 hover:underline">
                                            1-800-272-0887
                                        </a>
                                        <span className="mt-1 block text-[#6e4a34]">Monday–Friday, 8AM–5PM CST</span>
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a7264]">General line</dt>
                                    <dd className="mt-1">
                                        <a href="tel:+18002222269" className="font-semibold text-[#4a2518] underline-offset-4 hover:underline">
                                            1-800-222-2269
                                        </a>
                                    </dd>
                                </div>
                            </dl>
                            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                <Link href="/contact" className={cn(baseButtonClass, outlineButtonClass, 'text-[11px] text-center')}>
                                    Contact us
                                </Link>
                                <Link href="/" className={cn(baseButtonClass, outlineButtonClass, 'text-[11px] text-center')}>
                                    Back to home
                                </Link>
                            </div>
                        </article>
                    </aside>
                </div>
            </main>
        </PublicSiteShell>
    );
}
