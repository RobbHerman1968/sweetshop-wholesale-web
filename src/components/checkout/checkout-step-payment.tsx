'use client';

import { CheckoutFormRow, CheckoutSectionTitle, checkoutFieldClass, checkoutFieldInvalidClass, checkoutSelectClass, checkoutTextClass } from '@/components/checkout/checkout-form-row';
import type { CheckoutPaymentForm } from '@/lib/checkout-types';
import {
    detectCardType,
    formatCardNumberDisplay,
    getCardTypeDisplayLabel,
    getInlineCardNumberError,
    limitCardDigits,
    normalizeCardDigits,
} from '@/lib/checkout-payment-validation';
import { cn } from '@/lib/utils';

type CheckoutStepPaymentProps = {
    form: CheckoutPaymentForm;
    accountIsTerms: boolean;
    accountTerms: string;
    onChange: (next: CheckoutPaymentForm) => void;
};

function handleCardNumberChange(form: CheckoutPaymentForm, rawValue: string): CheckoutPaymentForm {
    const provisionalType = detectCardType(rawValue);
    const cardNumber = limitCardDigits(rawValue, provisionalType);

    return {
        ...form,
        cardNumber,
        cardType: detectCardType(cardNumber),
    };
}

export function CheckoutStepPayment({ form, accountIsTerms, accountTerms, onChange }: CheckoutStepPaymentProps) {
    const patch = (partial: Partial<CheckoutPaymentForm>) => {
        onChange({ ...form, ...partial });
    };

    if (accountIsTerms) {
        return (
            <div className="min-w-0 space-y-8 overflow-x-clip">
                <section>
                    <CheckoutSectionTitle>Payment</CheckoutSectionTitle>
                    <p className={cn('mt-3', checkoutTextClass)}>This account pays on terms.</p>

                    <div className="mt-4 rounded-sm border border-[#e8dfd4] bg-white px-3 sm:px-4">
                        <CheckoutFormRow label="Terms" required className="border-b-0">
                            <p className={cn('py-1.5 font-semibold', checkoutTextClass)}>{accountTerms || form.terms || '—'}</p>
                        </CheckoutFormRow>
                    </div>
                </section>
            </div>
        );
    }

    const cardTypeLabel = getCardTypeDisplayLabel(form.cardNumber, form.cardType);
    const cardNumberError = getInlineCardNumberError(form.cardNumber, form.cardType);
    const formattedCardNumber = formatCardNumberDisplay(form.cardNumber, form.cardType);
    const cvvMaxLength = form.cardType === 'amex' ? 4 : 4;

    return (
        <div className="min-w-0 space-y-8 overflow-x-clip">
            <section>
                <CheckoutSectionTitle>Payment</CheckoutSectionTitle>
                <p className={cn('mt-3', checkoutTextClass)}>Enter credit card details to pay for this order.</p>
            </section>

            <section className="rounded-sm border border-[#e8dfd4] bg-white px-3 sm:px-4">
                <CheckoutFormRow label="Name on Card" required>
                    <input
                        className={checkoutFieldClass}
                        value={form.cardName}
                        onChange={(e) => patch({ cardName: e.target.value })}
                        autoComplete="cc-name"
                    />
                </CheckoutFormRow>
                <CheckoutFormRow label="Card Number" required>
                    <input
                        className={cn(checkoutFieldClass, cardNumberError && checkoutFieldInvalidClass)}
                        value={formattedCardNumber}
                        onChange={(e) => onChange(handleCardNumberChange(form, e.target.value))}
                        autoComplete="cc-number"
                        inputMode="numeric"
                        maxLength={form.cardType === 'amex' ? 17 : 19}
                        aria-invalid={cardNumberError ? true : undefined}
                        aria-describedby={cardNumberError ? 'checkout-card-number-error' : undefined}
                    />
                    {cardNumberError ? (
                        <p id="checkout-card-number-error" className="mt-1 text-sm text-red-600" role="alert">
                            {cardNumberError}
                        </p>
                    ) : null}
                </CheckoutFormRow>
                <CheckoutFormRow label="Card Type">
                    <input
                        className={cn(checkoutFieldClass, 'bg-[#fafafa]', cardNumberError && checkoutFieldInvalidClass)}
                        value={cardTypeLabel}
                        readOnly
                        tabIndex={-1}
                        aria-readonly="true"
                        placeholder="Detected from card number"
                    />
                </CheckoutFormRow>
                <CheckoutFormRow label="Expiration" required>
                    <div className="grid gap-2 sm:grid-cols-2">
                        <select
                            className={checkoutSelectClass}
                            value={form.cardMonth}
                            onChange={(e) => patch({ cardMonth: e.target.value })}
                            autoComplete="cc-exp-month"
                        >
                            <option value="">Month</option>
                            {Array.from({ length: 12 }, (_, index) => {
                                const month = String(index + 1).padStart(2, '0');
                                return (
                                    <option key={month} value={month}>
                                        {month}
                                    </option>
                                );
                            })}
                        </select>
                        <select
                            className={checkoutSelectClass}
                            value={form.cardYear}
                            onChange={(e) => patch({ cardYear: e.target.value })}
                            autoComplete="cc-exp-year"
                        >
                            <option value="">Year</option>
                            {Array.from({ length: 12 }, (_, index) => {
                                const year = String(new Date().getFullYear() + index);
                                return (
                                    <option key={year} value={year}>
                                        {year}
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                </CheckoutFormRow>
                <CheckoutFormRow label="Security Code" required className="border-b-0">
                    <input
                        className={checkoutFieldClass}
                        value={form.cardCcv}
                        onChange={(e) => patch({ cardCcv: normalizeCardDigits(e.target.value).slice(0, cvvMaxLength) })}
                        autoComplete="cc-csc"
                        inputMode="numeric"
                        maxLength={cvvMaxLength}
                    />
                </CheckoutFormRow>
            </section>
        </div>
    );
}
