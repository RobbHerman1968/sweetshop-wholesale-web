'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
    { href: '/manage', label: 'Dashboard' },
    { href: '/manage/users', label: 'Users' },
    { href: '/manage/accounts', label: 'Accounts' },
    { href: '/manage/products', label: 'Products' },
    { href: '/manage/categories', label: 'Categories' },
    { href: '/manage/pages', label: 'Pages' },
    { href: '/manage/menus', label: 'Menus' },
    { href: '/manage/orders', label: 'Orders' },
    { href: '/manage/images', label: 'Images' },
] as const;

export function ManageSidebar() {
    const pathname = usePathname();

    return (
        <>
            {/* Desktop sidebar */}
            <aside className="hidden w-56 shrink-0 self-stretch border-r border-[#c49a78] bg-[#f8eddf] md:block">
                <nav className="flex h-full flex-col gap-0.5 py-4 pl-3 pr-2" aria-label="Management">
                    {navItems.map(({ href, label }) => {
                        const isActive = pathname === href || (href !== '/manage' && pathname.startsWith(href));
                        return (
                            <Link key={href} href={href} className={cn('rounded-md px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] transition-colors', isActive ? 'bg-[#f3e0cf] text-[#4a2518]' : 'text-[#6e4a34] hover:bg-[#f3e0cf]')}>
                                {label}
                            </Link>
                        );
                    })}
                </nav>
            </aside>
            {/* Mobile horizontal nav */}
            <nav className="flex gap-1 overflow-x-auto border-b border-[#c49a78] bg-[#f8eddf] px-3 py-2 md:hidden" aria-label="Management">
                {navItems.map(({ href, label }) => {
                    const isActive = pathname === href || (href !== '/manage' && pathname.startsWith(href));
                    return (
                        <Link key={href} href={href} className={cn('shrink-0 rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors', isActive ? 'bg-[#f3e0cf] text-[#4a2518]' : 'text-[#6e4a34] hover:bg-[#f3e0cf]')}>
                            {label}
                        </Link>
                    );
                })}
            </nav>
        </>
    );
}
