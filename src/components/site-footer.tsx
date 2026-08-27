import Link from 'next/link';

type SiteFooterProps = {
    termsPageHref?: string | null;
    privacyPageHref?: string | null;
};

const footerLinkClassName =
    'font-medium text-[#fdf7ef] underline underline-offset-2 hover:text-[#f5d9b8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5d9b8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#3d281a]';

export function SiteFooter({ termsPageHref = null, privacyPageHref = null }: SiteFooterProps) {
    const hasLegalLinks = Boolean(termsPageHref || privacyPageHref);

    return (
        <footer className="mt-8 border-t border-[#b89572] bg-[#3d2818] text-[#fdf7ef]">
            <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 text-xs md:flex-row md:justify-between">
                <section className="space-y-2" aria-labelledby="footer-stay-connected">
                    <h2 id="footer-stay-connected" className="text-xs font-normal uppercase tracking-[0.25em] text-[#f5d9b8]">
                        Stay Connected
                    </h2>
                    <p>Follow us on social media for seasonal launches and news.</p>
                </section>
                <section className="space-y-2" aria-labelledby="footer-wholesale-support">
                    <h2 id="footer-wholesale-support" className="text-xs font-normal uppercase tracking-[0.25em] text-[#f5d9b8]">
                        Wholesale Support
                    </h2>
                    <p>
                        Phone:{' '}
                        <a href="tel:+18002720887" className={footerLinkClassName}>
                            1-800-272-0887
                        </a>
                    </p>
                    <p>Customer Service: Monday–Friday, 8AM–5PM CST</p>
                </section>
                <section className="space-y-2" aria-labelledby="footer-address">
                    <h2 id="footer-address" className="text-xs font-normal uppercase tracking-[0.25em] text-[#f5d9b8]">
                        Address
                    </h2>
                    <p>Sweet Shop USA</p>
                    <p>Texas, USA</p>
                </section>
            </div>
            <div className="border-t border-[#6b4532] bg-[#3d281a] px-4 py-3 text-[10px] tracking-[0.2em] uppercase text-[#f5d9b8]">
                <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 text-center sm:flex-row sm:justify-between sm:text-left">
                    <p>© {new Date().getFullYear()} Sweet Shop USA. All rights reserved.</p>
                    {hasLegalLinks ? (
                        <nav aria-label="Legal" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 sm:justify-end">
                            {termsPageHref ? (
                                <Link href={termsPageHref} className={footerLinkClassName}>
                                    Terms &amp; Conditions
                                </Link>
                            ) : null}
                            {privacyPageHref ? (
                                <Link href={privacyPageHref} className={footerLinkClassName}>
                                    Privacy Policy
                                </Link>
                            ) : null}
                        </nav>
                    ) : null}
                </div>
            </div>
        </footer>
    );
}
