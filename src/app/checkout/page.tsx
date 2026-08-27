import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { CheckoutContent } from '@/components/checkout/checkout-content';
import { PublicSiteShell } from '@/components/public-site-shell';
import { getShippingLeadTimeForAccount } from '@/lib/account-shipping-lead-time';
import { FREE_SHIPPING_THRESHOLD_SETTING_ID } from '@/lib/checkout-shipping-cost';
import type { CheckoutAccountDefaults } from '@/lib/checkout-types';
import { getAccountByIdForManage } from '@/lib/db-pg/actions/account';
import {
    getAccountAddressesForCheckout,
    getAccountShippingAddressesForCheckout,
} from '@/lib/db-pg/actions/account-address';
import { getSiteSettingByIdForManage } from '@/lib/db-pg/actions/site-setting';
import { getStateShippingTaxRatesFromDB } from '@/lib/db-pg/actions/state-shipping-tax-rate';
import { getShopCart } from '@/lib/shop-cart-actions';
import { getEffectiveWholesaleAccountIdForShopCatalog } from '@/lib/wholesale-account-switcher-actions';
import { SITE_MAIN_FOCUS_CLASS, SITE_MAIN_ID } from '@/lib/site-main';
import { parseUserId } from '@/lib/user-id';
import { cn } from '@/lib/utils';
import { selectFirstEmailAddress, getDefaultExpectedDeliveryDate } from '@/lib/checkout-utils';

const MINIMUM_ORDER_SETTING_ID = 2;

function isBelowMinimumOrder(subTotal: number, itemCount: number, minimumOrderAmount: number | null): boolean {
    return minimumOrderAmount != null && itemCount > 0 && subTotal < minimumOrderAmount;
}

function trim(value: string | null | undefined): string {
    return value?.trim() ?? '';
}

export default async function CheckoutPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        redirect('/cart');
    }

    const userId = parseUserId(session.user.id);
    if (userId == null) {
        redirect('/cart');
    }

    const accountId = await getEffectiveWholesaleAccountIdForShopCatalog(userId, session.user.isAdmin ?? false);
    if (accountId == null) {
        redirect('/cart');
    }

    const [
        cartResult,
        minimumOrderSetting,
        freeShippingSetting,
        stateRates,
        savedAddresses,
        savedShippingAddresses,
        account,
        shippingLeadTime,
    ] = await Promise.all([
        getShopCart(),
        getSiteSettingByIdForManage(MINIMUM_ORDER_SETTING_ID),
        getSiteSettingByIdForManage(FREE_SHIPPING_THRESHOLD_SETTING_ID),
        getStateShippingTaxRatesFromDB(),
        getAccountAddressesForCheckout(accountId),
        getAccountShippingAddressesForCheckout(accountId),
        getAccountByIdForManage(accountId),
        getShippingLeadTimeForAccount(accountId),
    ]);

    if (!cartResult.ok || cartResult.cart.items.length === 0) {
        redirect('/cart');
    }

    const minimumOrderAmount = minimumOrderSetting?.value ?? null;
    if (isBelowMinimumOrder(cartResult.cart.subTotal, cartResult.cart.items.length, minimumOrderAmount)) {
        redirect('/cart');
    }

    const accountDefaults: CheckoutAccountDefaults = {
        firstName: trim(account?.contactFirstName),
        lastName: trim(account?.contactLastName),
        companyName: trim(account?.name),
        addressLine1: trim(account?.contactAddress1),
        addressLine2: trim(account?.contactAddress2),
        city: trim(account?.contactCity),
        state: trim(account?.contactState),
        zipCode: trim(account?.contactZipCode),
        emailAddress: selectFirstEmailAddress(account?.contactEmail) || trim(session.user.email),
        phoneNumber: trim(account?.contactPhone),
        terms: trim(account?.terms),
        isTerms: account?.isTerms ?? false,
    };

    const defaultExpectedDeliveryDate = getDefaultExpectedDeliveryDate(shippingLeadTime);

    return (
        <PublicSiteShell>
            <main
                id={SITE_MAIN_ID}
                tabIndex={-1}
                className={cn('mx-auto min-w-0 max-w-6xl px-3 pb-14 pt-2 sm:px-4 sm:pb-16 sm:pt-3', SITE_MAIN_FOCUS_CLASS)}
            >
                <div className="mb-6">
                    <h1 className="text-2xl font-bold uppercase tracking-[0.14em] text-[#4a2518]">Checkout</h1>
                </div>

                <CheckoutContent
                    cart={cartResult.cart}
                    savedAddresses={savedAddresses}
                    savedShippingAddresses={savedShippingAddresses}
                    accountDefaults={accountDefaults}
                    shippingLeadTime={shippingLeadTime}
                    defaultExpectedDeliveryDate={defaultExpectedDeliveryDate}
                    shippingOptions={{
                        freeShippingThreshold: freeShippingSetting?.value ?? null,
                        isSkipShipping: account?.isSkipShipping ?? false,
                        isFreeGroundShipping: account?.isFreeGroundShipping ?? false,
                        isSkipTax: account?.isSkipTax ?? false,
                        stateShippingRates: stateRates.map((rate) => ({
                            stateAbbr: rate.stateAbbr,
                            shippingRate: rate.shippingRate,
                            taxRate: rate.taxRate,
                        })),
                    }}
                />
            </main>
        </PublicSiteShell>
    );
}
