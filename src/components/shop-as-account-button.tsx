'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    getWholesaleAccountSwitcherState,
    resetAdminShopAs,
    setWholesaleSelectedAccount,
} from '@/lib/wholesale-account-switcher-actions';
import { markPendingShopQueryStrip } from '@/lib/shop-chrome-nav';
import { cn } from '@/lib/utils';

type ShopAsAccountButtonProps = {
    accountId: number;
    label?: string;
    className?: string;
    variant?: 'sweet' | 'outline' | 'ghost';
};

export function ShopAsAccountButton({
    accountId,
    label = 'Shop as',
    className,
    variant = 'sweet',
}: ShopAsAccountButtonProps) {
    const [loading, setLoading] = useState(false);
    const [isActiveShopAs, setIsActiveShopAs] = useState(false);

    useEffect(() => {
        void getWholesaleAccountSwitcherState().then((state) => {
            setIsActiveShopAs(state.isAdminShopAs && state.selectedAccountId === accountId);
        });
    }, [accountId]);

    async function handleShopAs() {
        setLoading(true);
        try {
            const { ok } = await setWholesaleSelectedAccount(accountId, { adminShopAs: true });
            if (!ok) return;
            markPendingShopQueryStrip();
            window.location.assign('/shop');
        } finally {
            setLoading(false);
        }
    }

    async function handleExitShopAs() {
        setLoading(true);
        try {
            const { ok } = await resetAdminShopAs();
            if (!ok) return;
            setIsActiveShopAs(false);
            markPendingShopQueryStrip();
            window.location.assign('/shop');
        } finally {
            setLoading(false);
        }
    }

    if (isActiveShopAs) {
        return (
            <Button
                type="button"
                variant="outline"
                className={cn('text-[11px] text-[#7a2818] hover:bg-[#fde8e0]', className)}
                disabled={loading}
                onClick={() => void handleExitShopAs()}
            >
                {loading ? 'Exiting…' : 'Exit shop-as'}
            </Button>
        );
    }

    return (
        <Button
            type="button"
            variant={variant}
            className={cn('text-[11px]', className)}
            disabled={loading}
            onClick={() => void handleShopAs()}
        >
            {loading ? 'Opening shop…' : label}
        </Button>
    );
}
