'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { isLocalhostHostname } from '@/lib/is-localhost';

type NavLink = { type: 'link'; href: string; label: string; isActive?: (pathname: string) => boolean };
type NavDivider = { type: 'divider' };
type NavItem = NavLink | NavDivider;

const baseNavItems: NavItem[] = [
    { type: 'link', href: '/manage', label: 'Dashboard' },
    {
        type: 'link',
        href: '/manage/orders',
        label: 'Orders',
        isActive: (pathname) =>
            pathname === '/manage/orders' ||
            (pathname.startsWith('/manage/orders/') && !pathname.startsWith('/manage/orders/active-carts')),
    },
    { type: 'link', href: '/manage/orders/active-carts', label: 'Active Carts' },
    { type: 'divider' },
    { type: 'link', href: '/manage/users', label: 'User Accounts' },
    { type: 'link', href: '/manage/accounts', label: 'AccountMate Accounts' },
    { type: 'divider' },
    { type: 'link', href: '/manage/upload-excel-order-sheet', label: 'Upload Excel Order Sheet' },
    { type: 'divider' },
    { type: 'link', href: '/manage/state-shipping-tax-rates', label: 'State Rates' },
    { type: 'link', href: '/manage/site-settings', label: 'Site Settings' },
    { type: 'divider' },
    { type: 'link', href: '/manage/products', label: 'Products' },
    { type: 'link', href: '/manage/images', label: 'Images' },
    { type: 'divider' },
    { type: 'link', href: '/manage/categories', label: 'Categories' },
    { type: 'link', href: '/manage/pages', label: 'Pages' },
    { type: 'link', href: '/manage/menus', label: 'Menus' },
];

const localhostNavItems: NavItem[] = [
    { type: 'divider' },
    { type: 'link', href: '/manage/sync', label: 'Sync' },
];

function isNavLinkActive(pathname: string, href: string) {
    return pathname === href || (href !== '/manage' && pathname.startsWith(href));
}

function renderNavItems(items: NavItem[], pathname: string, className: string, dividerClassName: string) {
    return items.map((item, index) => {
        if (item.type === 'divider') {
            return <div key={`divider-${index}`} className={dividerClassName} role="separator" />;
        }
        const { href, label, isActive } = item;
        const active = isActive ? isActive(pathname) : isNavLinkActive(pathname, href);
        return (
            <Link key={href} href={href} className={cn(className, active ? 'bg-[#f3e0cf] text-[#4a2518]' : 'text-[#6e4a34] hover:bg-[#f3e0cf]')}>
                {label}
            </Link>
        );
    });
}

export function ManageSidebar() {
    const pathname = usePathname();
    const [isLocalhost, setIsLocalhost] = useState(false);

    useEffect(() => {
        setIsLocalhost(isLocalhostHostname(window.location.hostname));
    }, []);

    const navItems = useMemo(() => (isLocalhost ? [...baseNavItems, ...localhostNavItems] : baseNavItems), [isLocalhost]);

    return (
        <>
            {/* Desktop sidebar */}
            <aside className="hidden w-72 shrink-0 self-stretch overflow-y-auto border-r border-[#c49a78] bg-[#f8eddf] md:block">
                <nav className="flex flex-col gap-0.5 py-4 pl-3 pr-2" aria-label="Management">
                    {renderNavItems(
                        navItems,
                        pathname,
                        'rounded-md px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] transition-colors',
                        'my-2 border-t border-[#c49a78]',
                    )}
                </nav>
            </aside>
            {/* Mobile horizontal nav */}
            <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-[#c49a78] bg-[#f8eddf] px-3 py-2 md:hidden" aria-label="Management">
                {renderNavItems(
                    navItems,
                    pathname,
                    'shrink-0 rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors',
                    'my-1 w-px shrink-0 self-stretch bg-[#c49a78]',
                )}
            </nav>
        </>
    );
}
