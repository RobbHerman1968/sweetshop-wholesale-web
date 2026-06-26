'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    getWholesaleAccountSwitcherState,
    resetAdminShopAs,
    searchWholesaleAccountsForAdmin,
    setWholesaleSelectedAccount,
    type WholesaleAccountSwitcherOption,
} from '@/lib/wholesale-account-switcher-actions';
import { Input } from '@/components/ui/input';
import { markPendingShopQueryStrip } from '@/lib/shop-chrome-nav';
import { useShopCartStore } from '@/store/useShopCartStore';
import { cn } from '@/lib/utils';

const triggerButtonClass =
    'inline-flex w-full max-w-56 min-w-0 shrink items-center justify-between gap-2 rounded-md border border-[#c4a88a] bg-white/70 px-2.5 py-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5c4032] shadow-sm transition-colors hover:bg-[#f3e0cf] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a78] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f6ebdd]';

export type WholesaleAccountSwitcherProps = {
    /** e.g. collapse mobile header menu after choosing an account */
    onAccountSelected?: () => void;
};

export function WholesaleAccountSwitcher({ onAccountSelected }: WholesaleAccountSwitcherProps) {
    const router = useRouter();
    const { status } = useSession();
    const [accounts, setAccounts] = useState<WholesaleAccountSwitcherOption[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
    const [selectedAccountDisplayName, setSelectedAccountDisplayName] = useState<string | null>(null);
    const [shouldPersistCookie, setShouldPersistCookie] = useState(false);
    const [isAdminShopAs, setIsAdminShopAs] = useState(false);
    const [canShopAsAnyAccount, setCanShopAsAnyAccount] = useState(false);
    const [hasOwnedAccounts, setHasOwnedAccounts] = useState(false);
    const [adminSearch, setAdminSearch] = useState('');
    const [adminSearchResults, setAdminSearchResults] = useState<WholesaleAccountSwitcherOption[]>([]);
    const [adminSearchLoading, setAdminSearchLoading] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);

    const refreshState = useCallback(async () => {
        setLoading(true);
        try {
            const next = await getWholesaleAccountSwitcherState();
            setAccounts(next.accounts);
            setSelectedAccountId(next.selectedAccountId);
            setSelectedAccountDisplayName(next.selectedAccountDisplayName);
            setShouldPersistCookie(next.shouldPersistCookie);
            setIsAdminShopAs(next.isAdminShopAs);
            setCanShopAsAnyAccount(next.canShopAsAnyAccount);
            setHasOwnedAccounts(next.hasOwnedAccounts);
            useShopCartStore.getState().setAccountId(next.selectedAccountId);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (status !== 'authenticated') {
            setAccounts([]);
            setSelectedAccountId(null);
            setSelectedAccountDisplayName(null);
            setShouldPersistCookie(false);
            setIsAdminShopAs(false);
            setCanShopAsAnyAccount(false);
            setHasOwnedAccounts(false);
            setAdminSearch('');
            setAdminSearchResults([]);
            setLoading(false);
            useShopCartStore.getState().reset();
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
            useShopCartStore.getState().setAccountId(selectedAccountId);
            router.refresh();
        })();
    }, [status, loading, shouldPersistCookie, selectedAccountId, router]);

    useEffect(() => {
        if (!canShopAsAnyAccount || !open) {
            setAdminSearchResults([]);
            return;
        }

        const trimmed = adminSearch.trim();
        if (trimmed.length < 2) {
            setAdminSearchResults([]);
            return;
        }

        const handle = window.setTimeout(() => {
            setAdminSearchLoading(true);
            void searchWholesaleAccountsForAdmin(trimmed)
                .then(setAdminSearchResults)
                .finally(() => setAdminSearchLoading(false));
        }, 250);

        return () => window.clearTimeout(handle);
    }, [adminSearch, canShopAsAnyAccount, open]);

    const pickAccount = async (accountId: number, adminShopAs = false) => {
        setOpen(false);
        onAccountSelected?.();
        markPendingShopQueryStrip();

        const picked =
            accounts.find((a) => a.id === accountId) ?? adminSearchResults.find((a) => a.id === accountId);
        if (picked) {
            setSelectedAccountId(accountId);
            setSelectedAccountDisplayName(picked.displayName);
        }

        try {
            const { ok } = await setWholesaleSelectedAccount(accountId, {
                adminShopAs: adminShopAs ? true : undefined,
                redirectToShop: true,
            });
            if (!ok) {
                void refreshState();
            }
        } catch (error) {
            // redirect() throws; Next.js handles navigation from the server action response.
            if (typeof error === 'object' && error != null && 'digest' in error) {
                const digest = String((error as { digest?: string }).digest ?? '');
                if (digest.startsWith('NEXT_REDIRECT')) {
                    return;
                }
            }
            console.error('[Wholesale account change]', error);
            void refreshState();
        }
    };

    const resetShopAs = async () => {
        setResetting(true);
        try {
            const { ok } = await resetAdminShopAs();
            if (!ok) return;
            setOpen(false);
            onAccountSelected?.();
            markPendingShopQueryStrip();
            await refreshState();
            router.refresh();
        } finally {
            setResetting(false);
        }
    };

    const exitShopAsLabel = hasOwnedAccounts ? 'Back to my account' : 'Exit shop-as';

    if (status !== 'authenticated' || (!loading && accounts.length === 0 && !canShopAsAnyAccount)) {
        return null;
    }

    const selectedLabel = selectedAccountDisplayName?.trim() || 'Account';
    const showAccountPicker = canShopAsAnyAccount || accounts.length > 1;

    if (!showAccountPicker && !loading) {
        return (
            <div
                className={cn(triggerButtonClass, 'cursor-default', loading && 'opacity-70')}
                title={loading ? undefined : selectedLabel}
                aria-label={loading ? 'Account' : `Account: ${selectedLabel}`}
            >
                <span className="min-w-0 flex-1 truncate">{loading ? 'Account' : selectedLabel}</span>
            </div>
        );
    }

    const triggerLabel = loading ? 'Accounts' : selectedLabel;

    const shopAsClearButton = isAdminShopAs ? (
        <button
            type="button"
            disabled={resetting}
            aria-label={exitShopAsLabel}
            title={exitShopAsLabel}
            className="inline-flex shrink-0 items-center justify-center self-stretch rounded-r-md border border-l-0 border-[#b8860b] bg-[#fff8e7] px-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#7a2818] transition-colors hover:bg-[#fde8e0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a78] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f6ebdd] disabled:opacity-70"
            onClick={() => void resetShopAs()}
        >
            {resetting ? '…' : 'Exit'}
        </button>
    ) : null;

    const shopAsTriggerClass = (extra?: string) =>
        cn(triggerButtonClass, isAdminShopAs && 'rounded-r-none border-[#b8860b] bg-[#fff8e7]', extra);

    const accountSwitcherShell = (trigger: ReactNode, content: ReactNode) => (
        <div className="inline-flex max-w-full items-stretch">
            <Popover open={open} onOpenChange={setOpen}>
                {trigger}
                {content}
            </Popover>
            {shopAsClearButton}
        </div>
    );

    const adminSearchSection = canShopAsAnyAccount ? (
        <div className="border-t border-[#ebe6e1] p-1">
            <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6b6560]">Shop as account</p>
            <div className="px-1 pb-1">
                <Input
                    value={adminSearch}
                    onChange={(e) => setAdminSearch(e.target.value)}
                    placeholder="Search name or AccountMate ID"
                    className="h-8 border-[#e6e1db] text-[12px]"
                />
            </div>
            {adminSearchLoading ? <p className="px-2 pb-2 text-[11px] text-[#6b6560]">Searching…</p> : null}
            {adminSearchResults.length > 0 ? (
                <ul className="flex max-h-40 flex-col gap-0.5 overflow-y-auto px-1 pb-1">
                    {adminSearchResults.map((a) => (
                        <li key={a.id}>
                            <button
                                type="button"
                                className="w-full rounded-md px-2 py-2 text-left text-[13px] font-medium leading-snug text-[#3c251a] outline-none transition-colors hover:bg-[#f4f1ed] focus-visible:ring-2 focus-visible:ring-[#c4b5a8]/80"
                                onClick={() => void pickAccount(a.id, true)}
                            >
                                {a.displayName}
                            </button>
                        </li>
                    ))}
                </ul>
            ) : null}
            {adminSearch.trim().length >= 2 && !adminSearchLoading && adminSearchResults.length === 0 ? (
                <p className="px-2 pb-2 text-[11px] text-[#6b6560]">No accounts found.</p>
            ) : null}
        </div>
    ) : null;

    const popoverContentClass =
        'w-56 overflow-hidden rounded-lg border border-[#e6e1db] bg-white p-1 shadow-[0_12px_48px_-12px_rgba(24,18,12,0.22)]';

    if (!loading && accounts.length === 0 && canShopAsAnyAccount) {
        const emptyAdminLabel = isAdminShopAs ? selectedLabel : 'Shop as account';

        return accountSwitcherShell(
            <PopoverTrigger asChild>
                <button
                    type="button"
                    aria-haspopup="dialog"
                    aria-expanded={open}
                    aria-label={isAdminShopAs ? `Wholesale account: ${emptyAdminLabel}` : 'Shop as account'}
                    className={shopAsTriggerClass()}
                >
                    <span className="min-w-0 flex-1 truncate">{emptyAdminLabel}</span>
                    <ChevronDown className="size-3.5 shrink-0 opacity-70" strokeWidth={2} aria-hidden />
                </button>
            </PopoverTrigger>,
            <PopoverContent align="end" sideOffset={8} className={popoverContentClass}>
                {adminSearchSection}
            </PopoverContent>,
        );
    }

    return accountSwitcherShell(
        <PopoverTrigger asChild>
            <button
                type="button"
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-label={`Wholesale account: ${triggerLabel}`}
                disabled={loading}
                className={shopAsTriggerClass(loading ? 'opacity-70' : undefined)}
            >
                <span className="min-w-0 flex-1 truncate">{triggerLabel}</span>
                <ChevronDown className="size-3.5 shrink-0 opacity-70" strokeWidth={2} aria-hidden />
            </button>
        </PopoverTrigger>,
        <PopoverContent align="end" sideOffset={8} className={popoverContentClass}>
            <p className="border-b border-[#ebe6e1] px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6b6560]">
                Wholesale account
            </p>
            {accounts.length > 0 ? (
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
            ) : null}
            {adminSearchSection}
        </PopoverContent>,
    );
}
