'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { BrandBar } from '@/components/brand-bar';
import { UserAccountMenu } from '@/components/user-account-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Replace with live cart line quantity (e.g. from API or store) when checkout is wired. */
const TEMPORARY_CART_ITEM_COUNT: number = 3;

const headerNavLinkClass =
    'inline-flex items-center rounded-md px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5c4032] transition-colors hover:bg-[#f3e0cf] hover:text-[#3c251a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a78] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f6ebdd]';

type SiteHeaderProps = {
    onLoginClick: () => void;
};

type CartNavButtonProps = {
    variant: 'ghost' | 'outline';
    className?: string;
};

function CartNavButton({ variant, className }: CartNavButtonProps) {
    const count = TEMPORARY_CART_ITEM_COUNT;
    const countDisplay = count > 99 ? '99+' : String(count);
    const itemsLine = count === 1 ? '1 item' : `${countDisplay} items`;
    const aria = `Shopping cart, ${itemsLine}`;

    return (
        <button
            type="button"
            aria-label={aria}
            className={cn(
                'inline-flex items-end gap-1.5 text-left transition-colors',
                variant === 'ghost' && 'rounded-sm px-1 py-0.5 text-[#1a1512] hover:bg-[#f3e0cf]',
                variant === 'outline' &&
                    'min-h-11 justify-center rounded-md border border-[#c49a78] bg-white/70 px-3 py-2 hover:bg-[#f3e0cf]',
                className,
            )}
        >
            <ShoppingCart className="size-7 shrink-0 text-[#2a221e]" strokeWidth={1.35} aria-hidden />
            <span className="flex min-w-0 flex-col leading-[1.12]">
                <span
                    className={cn(
                        'text-[11px] font-semibold tabular-nums tracking-tight',
                        count > 0 ? 'text-[#b45309]' : 'text-[#6f6860]',
                    )}
                >
                    {itemsLine}
                </span>
                <span className="text-[13px] font-bold leading-none tracking-tight text-[#1f1814]">Cart</span>
            </span>
        </button>
    );
}

export function SiteHeader({ onLoginClick }: SiteHeaderProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { status } = useSession();
    const isLoggedIn = status === 'authenticated';

    return (
        <header>
            <div className="bg-[#f6ebdd]">
                <div className="mx-auto flex max-w-6xl flex-col gap-2 px-3 pt-1.5 pb-1 sm:px-4 sm:pt-2 sm:pb-1">
                    {/* Top utility navigation with logo */}
                    <div className="flex items-center justify-between gap-2 text-xs uppercase tracking-[0.18em] text-[#5c4032]">
                        <div className="flex items-center gap-1 sm:gap-2">
                            <Link
                                href="/"
                                className="inline-flex shrink-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a78] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f6ebdd]"
                            >
                                <Image
                                    src="/logo.png"
                                    alt="Sweet Shop USA wholesale, home"
                                    width={36}
                                    height={36}
                                    className="h-7 w-7 sm:h-9 sm:w-9 object-contain"
                                    priority
                                />
                            </Link>
                        </div>

                        {/* Desktop nav */}
                        <nav className="hidden items-center gap-6 md:flex" aria-label="Company">
                            <Link href="/locations" className={headerNavLinkClass}>
                                Locations
                            </Link>
                            <Link href="/shop" className={headerNavLinkClass}>
                                Shop
                            </Link>
                            <Link href="/about" className={headerNavLinkClass}>
                                About Us
                            </Link>
                            <Link href="/apply" className={headerNavLinkClass}>
                                Apply Now
                            </Link>
                            <Link href="/contact" className={headerNavLinkClass}>
                                Contact Us
                            </Link>
                        </nav>

                        {/* Desktop actions */}
                        <div className="hidden items-center gap-3 md:flex">
                            {isLoggedIn ? (
                                <>
                                    <CartNavButton variant="ghost" />
                                    <UserAccountMenu />
                                </>
                            ) : (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="bg-transparent text-[11px] hover:bg-[#f3e0cf]"
                                    onClick={onLoginClick}
                                >
                                    Login
                                </Button>
                            )}
                        </div>

                        {/* Mobile menu toggle */}
                        <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-md border border-[#d4c4b0] bg-white/60 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5c4032] md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a78] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f6ebdd]"
                            aria-expanded={isMenuOpen}
                            aria-controls="site-header-mobile-nav"
                            onClick={() => setIsMenuOpen((prev) => !prev)}
                        >
                            Menu
                        </button>
                    </div>

                    {/* Mobile nav + actions */}
                    <div
                        id="site-header-mobile-nav"
                        hidden={!isMenuOpen}
                        className="flex flex-col gap-2 rounded-lg border border-[#d4c4b0] bg-[#f6ebdd] px-3 py-3 text-[11px] uppercase tracking-[0.18em] text-[#5c4032] md:hidden"
                    >
                        <nav className="flex flex-col gap-1" aria-label="Company">
                            <Link
                                href="/shop"
                                className={cn(headerNavLinkClass, 'w-fit py-2')}
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Shop
                            </Link>
                            <Link
                                href="/about"
                                className={cn(headerNavLinkClass, 'w-fit py-2')}
                                onClick={() => setIsMenuOpen(false)}
                            >
                                About Us
                            </Link>
                            <Button variant="ghost" className="justify-start px-0 py-1 text-[11px]" type="button">
                                Sugarfree
                            </Button>
                            <Link
                                href="/locations"
                                className={cn(headerNavLinkClass, 'w-fit py-2')}
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Locations
                            </Link>
                            <Link
                                href="/apply"
                                className={cn(headerNavLinkClass, 'w-fit py-2')}
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Apply Now
                            </Link>
                            <Link
                                href="/contact"
                                className={cn(headerNavLinkClass, 'w-fit py-2')}
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Contact Us
                            </Link>
                        </nav>
                        <div className="mt-2 flex gap-2">
                            {isLoggedIn ? (
                                <>
                                    <CartNavButton variant="outline" className="flex-1" />
                                    <UserAccountMenu triggerClassName="border-[#c4a88a]" />
                                </>
                            ) : (
                                <Button type="button" variant="primary" className="w-full" onClick={onLoginClick}>
                                    Login
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="border-t border-[#d4c4b0] bg-white pb-2 pt-2 sm:pb-3 sm:pt-3">
                <BrandBar />
            </div>
        </header>
    );
}
