import Image from 'next/image';
import Link from 'next/link';
import { Facebook, Twitter, Youtube } from 'lucide-react';
import type { ComponentType } from 'react';
import { cn } from '@/lib/utils';

type SiteFooterProps = {
    termsPageHref?: string | null;
    privacyPageHref?: string | null;
};

const footerLinkClassName =
    'font-medium text-[#fdf7ef] underline underline-offset-2 hover:text-[#f5d9b8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5d9b8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#3d281a]';

const socialLinkBaseClassName =
    'inline-flex size-9 items-center justify-center rounded-full border border-[#6b4532] bg-transparent text-[#fdf7ef] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5d9b8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#3d2818]';

function PinterestIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
        </svg>
    );
}

const SOCIAL_LINKS: ReadonlyArray<{
    href: string;
    label: string;
    icon: ComponentType<{ className?: string }>;
    hoverClassName: string;
}> = [
    {
        href: 'https://www.facebook.com/pages/Sweet-Shop-USA/108243137277',
        label: 'Facebook',
        icon: Facebook,
        hoverClassName: 'hover:border-[#1877F2] hover:bg-[#1877F2] hover:text-white',
    },
    {
        href: 'https://twitter.com/sweetshopusa',
        label: 'X (Twitter)',
        icon: Twitter,
        hoverClassName: 'hover:border-[#1D9BF0] hover:bg-[#1D9BF0] hover:text-white',
    },
    {
        href: 'https://youtu.be/VQ3c7GG-8yA',
        label: 'YouTube',
        icon: Youtube,
        hoverClassName: 'hover:border-[#FF0000] hover:bg-[#FF0000] hover:text-white',
    },
    {
        href: 'https://www.pinterest.com/pin/563935184560968693/',
        label: 'Pinterest',
        icon: PinterestIcon,
        hoverClassName: 'hover:border-[#E60023] hover:bg-[#E60023] hover:text-white',
    },
];

export function SiteFooter({ termsPageHref = null, privacyPageHref = null }: SiteFooterProps) {
    const hasLegalLinks = Boolean(termsPageHref || privacyPageHref);

    return (
        <footer className="mt-8 shrink-0 border-t border-[#b89572] bg-[#3d2818] text-[#fdf7ef]">
            <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 text-xs md:flex-row md:justify-between">
                <section className="space-y-2" aria-labelledby="footer-stay-connected">
                    <h2 id="footer-stay-connected" className="text-xs font-normal uppercase tracking-[0.25em] text-[#f5d9b8]">
                        Stay Connected
                    </h2>
                    <p>Follow us on social media for seasonal launches and news.</p>
                    <nav aria-label="Social media" className="flex flex-wrap items-center gap-2 pt-1">
                        {SOCIAL_LINKS.map(({ href, label, icon: Icon, hoverClassName }) => (
                            <a
                                key={href}
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={label}
                                className={cn(socialLinkBaseClassName, hoverClassName)}
                            >
                                <Icon className="size-4" aria-hidden />
                            </a>
                        ))}
                    </nav>
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
                <div
                    className={cn(
                        'mx-auto grid max-w-6xl items-center gap-3 text-center',
                        hasLegalLinks ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2',
                    )}
                >
                    <p className="sm:justify-self-start sm:text-left">© {new Date().getFullYear()} Sweet Shop USA. All rights reserved.</p>
                    <div className="flex justify-center sm:justify-self-center">
                        <Image
                            src="/creditcards.png"
                            alt="Accepted payment methods: Visa, MasterCard, Discover, and American Express"
                            width={1318}
                            height={214}
                            className="h-8 w-auto max-w-full"
                        />
                    </div>
                    {hasLegalLinks ? (
                        <nav aria-label="Legal" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 sm:justify-self-end sm:justify-end">
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
