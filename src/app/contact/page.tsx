import Link from 'next/link';
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
                        Wholesale support can help with catalog questions, order status, and account setup. We respond during business hours, Central Time.
                    </p>
                </header>

                <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
                    <article className="rounded-2xl border border-[#b89572] bg-[#f6ebdd] p-6 sm:p-7">
                        <h2 className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#5c4032]">Wholesale support</h2>
                        <dl className="mt-5 space-y-4 text-xs text-[#5c4032]">
                            <div>
                                <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a7264]">Phone</dt>
                                <dd className="mt-1">
                                    <a href="tel:+18002720887" className="font-semibold text-[#4a2518] underline-offset-4 hover:underline">
                                        1-800-272-0887
                                    </a>
                                    <span className="mt-1 block text-[#6e4a34]">Customer service: Monday–Friday, 8AM–5PM CST</span>
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
                            <div>
                                <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a7264]">Mail</dt>
                                <dd className="mt-1 font-medium text-[#3c251a]">Sweet Shop USA — Texas, USA</dd>
                            </div>
                        </dl>
                    </article>

                    <article className="flex flex-col justify-between rounded-2xl border border-[#b89572] bg-[#fdf7ef] p-6 sm:p-7">
                        <div>
                            <h2 className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#5c4032]">Already approved?</h2>
                            <p className="mt-3 text-xs leading-relaxed text-[#5c4032]">
                                Sign in to access the wholesale catalog, reorder favorites, and manage your account details.
                            </p>
                        </div>
                        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                            <Link
                                href="/"
                                className="inline-flex items-center justify-center rounded-md bg-[#4a2518] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#fdf7ef] transition-colors hover:bg-[#3a1b11] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a78] focus-visible:ring-offset-2 text-center"
                            >
                                Return to home
                            </Link>
                        </div>
                    </article>
                </div>
            </main>
        </PublicSiteShell>
    );
}
