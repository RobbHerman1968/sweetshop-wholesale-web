import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { PublicSiteShell } from '@/components/public-site-shell';
import { ShopCartContent } from '@/components/shop-cart-content';
import { getSiteSettingByIdForManage } from '@/lib/db-pg/actions/site-setting';
import { getShopCart } from '@/lib/shop-cart-actions';
import { SITE_MAIN_FOCUS_CLASS, SITE_MAIN_ID } from '@/lib/site-main';
import { cn } from '@/lib/utils';

export default async function CartPage() {
    const session = await getServerSession(authOptions);
    const isLoggedIn = Boolean(session?.user);
    const [cartResult, minimumOrderSetting] = isLoggedIn
        ? await Promise.all([getShopCart(), getSiteSettingByIdForManage(2)])
        : [null, null];

    return (
        <PublicSiteShell>
            <main
                id={SITE_MAIN_ID}
                tabIndex={-1}
                className={cn('mx-auto max-w-6xl px-3 pb-14 pt-2 sm:px-4 sm:pb-16 sm:pt-3', SITE_MAIN_FOCUS_CLASS)}
            >
                <div className="mb-6 space-y-2">
                    <h1 className="text-2xl font-bold uppercase tracking-[0.14em] text-[#4a2518]">Cart</h1>
                    <p className="text-sm text-[#6e4a34]">Review items, update quantities, or remove products before checkout.</p>
                </div>

                {!isLoggedIn ? (
                    <div className="rounded-2xl border border-[#b89572] bg-[#f6ebdd] p-8 text-center">
                        <p className="text-sm text-[#5c4032]">Sign in to view and manage your wholesale cart.</p>
                        <Link
                            href="/shop"
                            className="mt-4 inline-flex rounded-md bg-[#4a2518] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#fdf7ef] transition-colors hover:bg-[#3a1b11]"
                        >
                            Go to shop
                        </Link>
                    </div>
                ) : cartResult && !cartResult.ok ? (
                    <div className="rounded-2xl border border-[#b89572] bg-[#f6ebdd] p-8 text-center">
                        <p className="text-sm text-[#5c4032]">{cartResult.error}</p>
                        <Link
                            href="/shop"
                            className="mt-4 inline-flex rounded-md bg-[#4a2518] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#fdf7ef] transition-colors hover:bg-[#3a1b11]"
                        >
                            Go to shop
                        </Link>
                    </div>
                ) : cartResult?.ok ? (
                    <ShopCartContent
                        initialCart={cartResult.cart}
                        minimumOrderAmount={minimumOrderSetting?.value ?? null}
                    />
                ) : null}
            </main>
        </PublicSiteShell>
    );
}
