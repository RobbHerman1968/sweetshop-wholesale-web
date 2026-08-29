'use client';

import { CheckoutSectionTitle, checkoutTextClass } from '@/components/checkout/checkout-form-row';
import { formatCheckoutCurrency, formatDisplayDate, formatPhoneDisplay } from '@/lib/checkout-utils';
import { getCardTypeLabel } from '@/lib/checkout-payment-validation';
import type { CheckoutBillingForm, CheckoutPaymentSummary, CheckoutShippingForm } from '@/lib/checkout-types';
import type { ShopCartView } from '@/lib/shop-cart-view';
import { cn } from '@/lib/utils';

type CheckoutStepReviewProps = {
    cart: ShopCartView;
    shipping: CheckoutShippingForm;
    billing: CheckoutBillingForm;
    billingSameAsShipping: boolean;
    payment: CheckoutPaymentSummary;
    billingEmailAddress: string;
    shippingCost: number;
    tax: number;
    estimatedTotal: number;
};

function AddressBlock({
    firstName,
    lastName,
    companyName,
    addressLine1,
    addressLine2,
    city,
    state,
    zipCode,
    country,
    emailAddress,
    phoneNumber,
}: {
    firstName: string;
    lastName: string;
    companyName: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    emailAddress: string;
    phoneNumber: string;
}) {
    return (
        <div className={cn('space-y-1', checkoutTextClass)}>
            <p className="font-semibold">{[firstName, lastName].filter(Boolean).join(' ')}</p>
            {companyName ? <p>{companyName}</p> : null}
            <p>{addressLine1}</p>
            {addressLine2 ? <p>{addressLine2}</p> : null}
            <p>
                {city}, {state} {zipCode}
            </p>
            <p>{country}</p>
            <p>{emailAddress}</p>
            <p>{formatPhoneDisplay(phoneNumber)}</p>
        </div>
    );
}

export function CheckoutStepReview({
    cart,
    shipping,
    billing,
    billingSameAsShipping,
    payment,
    billingEmailAddress,
    shippingCost,
    tax,
    estimatedTotal,
}: CheckoutStepReviewProps) {
    return (
        <div className="min-w-0 space-y-8 overflow-x-clip">
            <section className="space-y-3">
                <CheckoutSectionTitle>Review &amp; Place Order</CheckoutSectionTitle>
                <p className={checkoutTextClass}>Confirm your shipping, billing, and payment details before placing the order.</p>
            </section>

            <section className="rounded-sm border border-[#e8dfd4] bg-white p-4 sm:p-5">
                <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-[#4a2518]">Shipping</h3>
                <div className="mt-3">
                    <AddressBlock
                        firstName={shipping.firstName}
                        lastName={shipping.lastName}
                        companyName={shipping.companyName}
                        addressLine1={shipping.addressLine1}
                        addressLine2={shipping.addressLine2}
                        city={shipping.city}
                        state={shipping.state}
                        zipCode={shipping.zipCode}
                        country={shipping.country}
                        emailAddress={shipping.emailAddress}
                        phoneNumber={shipping.phoneNumber}
                    />
                    <p className={cn('pt-2', checkoutTextClass)}>
                        Expected delivery:{' '}
                        <span className="font-semibold">{formatDisplayDate(shipping.expectedDeliveryDate)}</span>
                    </p>
                    {shipping.comment.trim() || cart.comment?.trim() ? (
                        <div className={cn('pt-2', checkoutTextClass)}>
                            <p className="font-semibold">Comment</p>
                            <p className="whitespace-pre-wrap italic">{shipping.comment.trim() || cart.comment?.trim()}</p>
                        </div>
                    ) : null}
                </div>
            </section>

            <section className="rounded-sm border border-[#e8dfd4] bg-white p-4 sm:p-5">
                <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-[#4a2518]">Billing</h3>
                <div className="mt-3">
                    {billingSameAsShipping ? (
                        <p className={cn('mb-2 italic', checkoutTextClass)}>Same as shipping address</p>
                    ) : null}
                    <AddressBlock
                        firstName={billing.firstName}
                        lastName={billing.lastName}
                        companyName={billing.companyName}
                        addressLine1={billing.addressLine1}
                        addressLine2={billing.addressLine2}
                        city={billing.city}
                        state={billing.state}
                        zipCode={billing.zipCode}
                        country={billing.country}
                        emailAddress={billingEmailAddress || billing.emailAddress}
                        phoneNumber={billing.phoneNumber}
                    />
                </div>
            </section>

            <section className="rounded-sm border border-[#e8dfd4] bg-white p-4 sm:p-5">
                <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-[#4a2518]">Payment</h3>
                <div className={cn('mt-3 space-y-1', checkoutTextClass)}>
                    <p>
                        {payment.payByTerms
                            ? `Terms: ${payment.terms || 'Account terms'}`
                            : `${getCardTypeLabel(payment.cardType) || 'Card'} ending in ${payment.cardLast4 || '----'}`}
                    </p>
                    {!payment.payByTerms && payment.cardName ? <p>Name on card: {payment.cardName}</p> : null}
                    {!payment.payByTerms && payment.cardMonth && payment.cardYear ? (
                        <p>
                            Expires: {payment.cardMonth}/{payment.cardYear}
                        </p>
                    ) : null}
                </div>
            </section>

            <section className="rounded-sm border border-[#e8dfd4] bg-[#fdf7ef] p-4 sm:p-5">
                <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-[#4a2518]">Order Total</h3>
                <dl className={cn('mt-3 space-y-2', checkoutTextClass)}>
                    <div className="flex items-center justify-between gap-3">
                        <dt>Subtotal</dt>
                        <dd className="font-semibold tabular-nums">{formatCheckoutCurrency(cart.subTotal)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                        <dt>Shipping</dt>
                        <dd className="font-semibold tabular-nums">{formatCheckoutCurrency(shippingCost)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                        <dt>Tax</dt>
                        <dd className="font-semibold tabular-nums">{formatCheckoutCurrency(tax)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-[#e8dfd4] pt-2">
                        <dt className="text-base font-bold uppercase tracking-[0.06em]">Estimated Total</dt>
                        <dd className="text-2xl font-bold tabular-nums text-[#4a2518]">{formatCheckoutCurrency(estimatedTotal)}</dd>
                    </div>
                </dl>
            </section>
        </div>
    );
}
