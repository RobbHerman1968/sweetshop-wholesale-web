'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    getWholesaleAccountCatalogDebug,
    getWholesaleAccountSwitcherState,
    setWholesaleSelectedAccount,
    type WholesaleAccountSwitcherOption,
} from '@/lib/wholesale-account-switcher-actions';
import { markPendingShopQueryStrip } from '@/lib/shop-chrome-nav';
import { cn } from '@/lib/utils';

const triggerButtonClass =
    'inline-flex w-56 shrink-0 items-center justify-between gap-2 rounded-md border border-[#c4a88a] bg-white/70 px-2.5 py-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5c4032] shadow-sm transition-colors hover:bg-[#f3e0cf] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a78] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f6ebdd]';

export type WholesaleAccountSwitcherProps = {
    /** e.g. collapse mobile header menu after choosing an account */
    onAccountSelected?: () => void;
};

export function WholesaleAccountSwitcher({ onAccountSelected }: WholesaleAccountSwitcherProps) {
    const router = useRouter();
    const { status } = useSession();
    const [accounts, setAccounts] = useState<WholesaleAccountSwitcherOption[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
    const [shouldPersistCookie, setShouldPersistCookie] = useState(false);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);

    const refreshState = useCallback(async () => {
        setLoading(true);
        try {
            const next = await getWholesaleAccountSwitcherState();
            setAccounts(next.accounts);
            setSelectedAccountId(next.selectedAccountId);
            setShouldPersistCookie(next.shouldPersistCookie);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (status !== 'authenticated') {
            setAccounts([]);
            setSelectedAccountId(null);
            setShouldPersistCookie(false);
            setLoading(false);
            return;
        }
        void refreshState();
    }, [status, refreshState]);

    /** After sign-in or when cookie is missing, persist the default (first) account so the header stays aligned with the server. */
    useEffect(() => {
        if (status !== 'authenticated' || loading || !shouldPersistCookie || selectedAccountId == null) return;
        void (async () => {
            const { ok } = await setWholesaleSelectedAccount(selectedAccountId);
            if (!ok) return;
            setShouldPersistCookie(false);
            router.refresh();
        })();
    }, [status, loading, shouldPersistCookie, selectedAccountId, router]);

    const pickAccount = async (accountId: number) => {
        const { ok } = await setWholesaleSelectedAccount(accountId);
        if (!ok) return;

        setSelectedAccountId(accountId);
        setOpen(false);
        onAccountSelected?.();
        markPendingShopQueryStrip();

        // Navigate immediately; debug fetch must not block routing (slow DB → no transition).
        void getWholesaleAccountCatalogDebug(accountId)
            .then((dbg) => {
                if (!dbg.ok) return;
                console.log('[Wholesale account change]', {
                    accountId: dbg.accountId,
                    accountGroupLinks: dbg.accountGroupLinks,
                    productGroupIds: dbg.productGroupIds,
                    activeProductTotal: dbg.activeProductTotal,
                    activeProductsSample: dbg.activeProductsSample,
                    ...(dbg.activeProductsShown < dbg.activeProductTotal
                        ? {
                              note: `Sample shows ${dbg.activeProductsShown} of ${dbg.activeProductTotal} active products (first 50 by name).`,
                          }
                        : {}),
                });
            })
            .catch(() => {
                /* ignore */
            });

        // Client `router.push` after a server action is unreliable here; full navigation
        // applies the Set-Cookie from the action and always loads the shop.
        window.location.assign('/shop');
    };

    if (status !== 'authenticated' || (!loading && accounts.length === 0)) {
        return null;
    }

    if (!loading && accounts.length === 1) {
        const only = accounts[0];
        return (
            <div
                className={cn(triggerButtonClass, 'cursor-default')}
                title={only.displayName}
                aria-label={`Account: ${only.displayName}`}
            >
                <span className="min-w-0 flex-1 truncate">{only.displayName}</span>
            </div>
        );
    }

    const selectedLabel =
        selectedAccountId != null ? accounts.find((a) => a.id === selectedAccountId)?.displayName ?? 'Accounts' : 'Accounts';

    const triggerLabel = loading ? 'Accounts' : selectedLabel;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    aria-haspopup="dialog"
                    aria-expanded={open}
                    aria-label={`Wholesale account: ${triggerLabel}`}
                    disabled={loading}
                    className={cn(triggerButtonClass, loading && 'opacity-70')}
                >
                    <span className="min-w-0 flex-1 truncate">{triggerLabel}</span>
                    <ChevronDown className="size-3.5 shrink-0 opacity-70" strokeWidth={2} aria-hidden />
                </button>
            </PopoverTrigger>
            <PopoverContent
                align="end"
                sideOffset={8}
                className="w-56 overflow-hidden rounded-lg border border-[#e6e1db] bg-white p-1 shadow-[0_12px_48px_-12px_rgba(24,18,12,0.22)]"
            >
                <p className="border-b border-[#ebe6e1] px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6b6560]">
                    Wholesale account
                </p>
                <ul className="flex max-h-64 flex-col gap-0.5 overflow-y-auto p-1">
                    {accounts.map((a) => (
                        <li key={a.id}>
                            <button
                                type="button"
                                role="menuitemradio"
                                aria-checked={selectedAccountId === a.id}
                                className={cn(
                                    'w-full rounded-md px-2 py-2 text-left text-[13px] font-medium leading-snug outline-none transition-colors hover:bg-[#f4f1ed] focus-visible:ring-2 focus-visible:ring-[#c4b5a8]/80',
                                    selectedAccountId === a.id ? 'bg-[#f0ebe6] text-[#2c1810]' : 'text-[#3c251a]',
                                )}
                                onClick={() => void pickAccount(a.id)}
                            >
                                {a.displayName}
                            </button>
                        </li>
                    ))}
                </ul>
            </PopoverContent>
        </Popover>
    );
}
