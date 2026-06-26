'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutDashboard, LogOut, User } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { clearWholesaleShopAsSelection } from '@/lib/wholesale-account-switcher-actions';
import { cn } from '@/lib/utils';

export type UserAccountMenuProps = {
    triggerClassName?: string;
    /** e.g. collapse mobile header menu when navigating or signing out */
    onNavigate?: () => void;
};

const accountMenuRowBase =
    'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] font-medium leading-snug outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#c4b5a8]/80 focus-visible:ring-offset-0';

function initialsFromUser(name: string | null | undefined, email: string | null | undefined): string {
    const n = (name ?? '').trim();
    if (n.length > 0) {
        const parts = n.split(/\s+/).filter((p) => p.length > 0);
        if (parts.length >= 2) {
            const a = parts[0]?.[0];
            const b = parts[parts.length - 1]?.[0];
            if (a && b) return (a + b).toUpperCase();
        }
        const c = parts[0]?.[0];
        return c ? c.toUpperCase() : '?';
    }
    const e = (email ?? '').trim();
    if (e.length > 0) {
        const local = (e.split('@')[0] ?? e).replace(/[^a-zA-Z0-9]/g, '');
        if (local.length >= 2) return local.slice(0, 2).toUpperCase();
        if (local.length === 1) return local.toUpperCase();
    }
    return '?';
}

export function UserAccountMenu({ triggerClassName, onNavigate }: UserAccountMenuProps) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const isAdmin = session?.user?.isAdmin ?? false;
    const isInManageArea = pathname?.startsWith('/manage') ?? false;
    const manageHomeHref = isInManageArea ? '/' : '/manage';
    const manageHomeLabel = isInManageArea ? 'Home' : 'Website manager';
    const displayName = session?.user?.name ?? session?.user?.email ?? '';
    const loginId = session?.user?.email;
    const showSecondaryLine = Boolean(displayName && loginId && displayName !== loginId);
    const initials = initialsFromUser(session?.user?.name, session?.user?.email);
    const menuAriaLabel = displayName ? `Account menu, signed in as ${displayName}` : 'Account menu';

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    aria-label={menuAriaLabel}
                    className={cn(
                        'inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-[#c4a88a] bg-[#5c3d2e] text-sm font-semibold leading-none tracking-tight text-[#fdf7ef] shadow-sm transition-[box-shadow,background-color] hover:border-[#d4b896] hover:bg-[#4a3228] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a78] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f6ebdd]',
                        triggerClassName,
                    )}
                >
                    <span aria-hidden className="select-none">
                        {initials}
                    </span>
                </button>
            </PopoverTrigger>
            <PopoverContent
                align="end"
                sideOffset={8}
                className="w-56 overflow-hidden rounded-lg border border-[#e6e1db] bg-white p-1.5 shadow-[0_12px_48px_-12px_rgba(24,18,12,0.22)]"
            >
                <div className="rounded-lg border border-[#d2c9bf] bg-[#e4dcd3] px-2.5 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6b6560]">Signed in as</p>
                    <p className="mt-1 truncate text-[13px] font-semibold tracking-tight text-[#1c1916]">{displayName || 'Member'}</p>
                    {showSecondaryLine ? <p className="mt-0.5 truncate text-xs text-[#6b6560]">{loginId}</p> : null}
                </div>
                <nav className="flex flex-col gap-0.5 pt-1" aria-label="Account menu">
                    {isAdmin ? (
                        <Link
                            href={manageHomeHref}
                            className={cn(
                                accountMenuRowBase,
                                'text-[#5c2c18] hover:bg-[#faf4ed] focus-visible:bg-[#faf4ed]',
                            )}
                            onClick={() => onNavigate?.()}
                        >
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-[#e8cfc4] bg-[#fde8e0] text-[#7a2818]">
                                {isInManageArea ? (
                                    <Home className="size-4" strokeWidth={1.75} aria-hidden />
                                ) : (
                                    <LayoutDashboard className="size-4" strokeWidth={1.75} aria-hidden />
                                )}
                            </span>
                            <span className="min-w-0 flex-1 leading-snug">{manageHomeLabel}</span>
                        </Link>
                    ) : null}
                    <Link
                        href="/account"
                        className={cn(
                            accountMenuRowBase,
                            'text-[#2c1810] hover:bg-[#f4f1ed] focus-visible:bg-[#f4f1ed]',
                        )}
                        onClick={() => onNavigate?.()}
                    >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[#f0ebe6] text-[#5c524c]">
                            <User className="size-4" strokeWidth={1.75} aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">Account</span>
                    </Link>
                    <Separator className="my-0.5 bg-[#ebe6e1]" />
                    <button
                        type="button"
                        className={cn(
                            accountMenuRowBase,
                            'cursor-pointer text-[#6b303c] hover:bg-[#faf4f5] focus-visible:bg-[#faf4f5]',
                        )}
                        onClick={() => {
                            onNavigate?.();
                            void (async () => {
                                await clearWholesaleShopAsSelection();
                                await signOut();
                            })();
                        }}
                    >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[#f5ecee] text-[#7a3d48]">
                            <LogOut className="size-4" strokeWidth={1.75} aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">Log out</span>
                    </button>
                </nav>
            </PopoverContent>
        </Popover>
    );
}
