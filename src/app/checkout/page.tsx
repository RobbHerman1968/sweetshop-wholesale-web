import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { PublicSiteShell } from '@/components/public-site-shell';
import { getSiteSettingByIdForManage } from '@/lib/db-pg/actions/site-setting';
import { getShopCart } from '@/lib/shop-cart-actions';
import { SITE_MAIN_FOCUS_CLASS, SITE_MAIN_ID } from '@/lib/site-main';
import { cn } from '@/lib/utils';

const MINIMUM_ORDER_SETTING_ID = 2;

function isBelowMinimumOrder(subTotal: number, itemCount: number, minimumOrderAmount: number | null): boolean {
    return minimumOrderAmount != null && itemCount > 0 && subTotal < minimumOrderAmount;
}

export default async function CheckoutPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        redirect('/cart');
    }

    const [cartResult, minimumOrderSetting] = await Promise.all([
        getShopCart(),
        getSiteSettingByIdForManage(MINIMUM_ORDER_SETTING_ID),
    ]);

    if (!cartResult.ok || cartResult.cart.items.length === 0) {
        redirect('/cart');
    }

    const minimumOrderAmount = minimumOrderSetting?.value ?? null;
    if (isBelowMinimumOrder(cartResult.cart.subTotal, cartResult.cart.items.length, minimumOrderAmount)) {
        redirect('/cart');
    }

    return (
        <PublicSiteShell>
            <main
                id={SITE_MAIN_ID}
                tabIndex={-1}
                className={cn('mx-auto max-w-6xl px-3 pb-14 pt-2 sm:px-4 sm:pb-16 sm:pt-3', SITE_MAIN_FOCUS_CLASS)}
            >
                <div className="mb-6 space-y-2">
                    <h1 className="text-2xl font-bold uppercase tracking-[0.14em] text-[#4a2518]">Checkout</h1>
                </div>

                <div className="rounded-2xl border border-[#b89572] bg-[#f6ebdd] p-8 text-center">
                    <p className="text-sm text-[#5c4032]">Not implemented.</p>
                    <Link
                        href="/cart"
                        className="mt-4 inline-flex rounded-md bg-[#4a2518] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#fdf7ef] transition-colors hover:bg-[#3a1b11]"
                    >
                        Back to cart
                    </Link>
                </div>
            </main>
        </PublicSiteShell>
    );
}
