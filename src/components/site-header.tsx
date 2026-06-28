'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Menu, ShoppingCart, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { BrandBar } from '@/components/brand-bar';
import type { BrandBarNavCategory } from '@/assets/brand-bar-nav';
import { UserAccountMenu } from '@/components/user-account-menu';
import { WholesaleAccountSwitcher } from '@/components/wholesale-account-switcher';
import { markPendingShopQueryStrip } from '@/lib/shop-chrome-nav';
import { useShopCartCount } from '@/hooks/use-shop-cart-count';
import { DEFAULT_SHIPPING_LEAD_TIME } from '@/lib/shipping-lead-time-constants';
import { useShopCartStore } from '@/store/useShopCartStore';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const headerNavLinkClass =
    'inline-flex items-center rounded-md px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5c4032] transition-colors hover:bg-[#f3e0cf] hover:text-[#3c251a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a78] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f6ebdd]';

type SiteHeaderProps = {
    onLoginClick: () => void;
    brandBarCategories: BrandBarNavCategory[];
    initialCartItemCount: number;
    initialAccountDisplayName?: string | null;
    initialAccountShippingLeadTime?: number | null;
};

type CartNavButtonProps = {
    variant: 'ghost' | 'outline';
    className?: string;
    /** Icon + count badge only; for narrow headers (e.g. mobile). */
    compact?: boolean;
    itemCount: number;
};

function CartNavButton({ variant, className, compact, itemCount }: CartNavButtonProps) {
    const count = itemCount;
    const countDisplay = count > 99 ? '99+' : String(count);
    const itemsLine = count === 1 ? '1 item' : `${countDisplay} items`;
    const aria = `Shopping cart, ${itemsLine}`;

    if (compact) {
        return (
            <Link
                href="/cart"
                aria-label={aria}
                className={cn(
                    'relative inline-flex size-10 shrink-0 items-center justify-center rounded-md transition-colors',
                    variant === 'ghost' && 'text-[#1a1512] hover:bg-[#f3e0cf]',
                    variant === 'outline' &&
                        'border border-[#c49a78] bg-white/70 hover:bg-[#f3e0cf]',
                    className,
                )}
            >
                <ShoppingCart className="size-[1.35rem] shrink-0 text-[#2a221e]" strokeWidth={1.35} aria-hidden />
                {count > 0 ? (
                    <span
                        className="absolute -right-1 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-[#b45309] px-1 text-[10px] font-bold tabular-nums leading-none text-white"
                        aria-hidden
                    >
                        {countDisplay}
                    </span>
                ) : null}
            </Link>
        );
    }

    return (
        <Link
            href="/cart"
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
        </Link>
    );
}

export function SiteHeader({
    onLoginClick,
    brandBarCategories,
    initialCartItemCount,
    initialAccountDisplayName = null,
    initialAccountShippingLeadTime = null,
}: SiteHeaderProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [cartCountHydrated, setCartCountHydrated] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const { status } = useSession();
    const isLoggedIn = status === 'authenticated';
    const { itemCount: liveCartItemCount } = useShopCartCount();
    const cartItemCount = cartCountHydrated ? liveCartItemCount : initialCartItemCount;

    useEffect(() => {
        useShopCartStore.getState().setItemCount(initialCartItemCount);
        setCartCountHydrated(true);
    }, [initialCartItemCount]);

    useEffect(() => {
        useShopCartStore.getState().setAccountDisplayName(initialAccountDisplayName?.trim() || null);
    }, [initialAccountDisplayName]);

    useEffect(() => {
        useShopCartStore.getState().setShippingLeadTime(initialAccountShippingLeadTime ?? DEFAULT_SHIPPING_LEAD_TIME);
    }, [initialAccountShippingLeadTime]);

    const onShopNavClick = useCallback(
        (e: React.MouseEvent<HTMLAnchorElement>) => {
            markPendingShopQueryStrip();
            if (pathname === '/shop' && typeof window !== 'undefined' && window.location.search) {
                e.preventDefault();
                router.replace('/shop', { scroll: false });
            }
        },
        [pathname, router],
    );

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
                                    width={40}
                                    height={40}
                                    className="h-10 w-10 sm:h-9 sm:w-9 object-contain"
                                    priority
                                />
                            </Link>
                        </div>

                        {/* Desktop nav */}
                        <nav className="hidden items-center gap-6 md:flex" aria-label="Company">
                            <Link href="/locations" className={headerNavLinkClass}>
                                Locations
                            </Link>
                            <Link href="/shop" className={headerNavLinkClass} onClick={onShopNavClick}>
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
                                    <div className="hidden lg:block">
                                        <WholesaleAccountSwitcher onAccountSelected={() => setIsMenuOpen(false)} />
                                    </div>
                                    <CartNavButton variant="ghost" itemCount={cartItemCount} />
                                    <UserAccountMenu onNavigate={() => setIsMenuOpen(false)} />
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

                        {/* Mobile: cart + account + menu */}
                        <div className="flex shrink-0 items-center gap-1.5 md:hidden">
                            {isLoggedIn ? (
                                <>
                                    <CartNavButton variant="ghost" compact itemCount={cartItemCount} />
                                    <UserAccountMenu onNavigate={() => setIsMenuOpen(false)} />
                                </>
                            ) : null}
                            <button
                                type="button"
                                className="inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-[#d4c4b0] bg-white/60 text-[#5c4032] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a78] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f6ebdd]"
                                aria-expanded={isMenuOpen}
                                aria-controls="site-header-mobile-nav"
                                aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
                                onClick={() => setIsMenuOpen((prev) => !prev)}
                            >
                                {isMenuOpen ? (
                                    <X className="size-6" strokeWidth={1.75} aria-hidden />
                                ) : (
                                    <Menu className="size-6" strokeWidth={1.75} aria-hidden />
                                )}
                            </button>
                        </div>
                    </div>

                    {isLoggedIn ? (
                        <div className="flex w-full justify-center border-t border-[#d4c4b0]/60 pt-2 lg:hidden">
                            <WholesaleAccountSwitcher
                                fullWidthOnMobile
                                onAccountSelected={() => setIsMenuOpen(false)}
                            />
                        </div>
                    ) : null}

                    {/* Mobile nav + actions */}
                    <div
                        id="site-header-mobile-nav"
                        hidden={!isMenuOpen}
                        className="flex flex-col gap-2 rounded-lg border border-[#d4c4b0] bg-[#f6ebdd] px-3 py-3 text-[11px] uppercase tracking-[0.18em] text-[#5c4032] md:hidden"
                    >
                        <nav className="flex flex-col gap-1" aria-label="Company">
                            <Link
                                href="/locations"
                                className={cn(headerNavLinkClass, 'w-fit py-2')}
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Locations
                            </Link>
                            <Link
                                href="/shop"
                                className={cn(headerNavLinkClass, 'w-fit py-2')}
                                onClick={(e) => {
                                    setIsMenuOpen(false);
                                    onShopNavClick(e);
                                }}
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
                        {!isLoggedIn ? (
                            <div className="mt-3">
                                <Button
                                    type="button"
                                    variant="primary"
                                    className="w-full"
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        onLoginClick();
                                    }}
                                >
                                    Login
                                </Button>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>

            <div className="border-t border-[#d4c4b0] bg-white pb-2 pt-2 sm:pb-3 sm:pt-3">
                <BrandBar categories={brandBarCategories} />
            </div>
        </header>
    );
}
