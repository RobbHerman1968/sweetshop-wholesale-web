'use client';

import { useMemo, useState } from 'react';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    CheckoutFormRow,
    CheckoutSectionTitle,
    checkoutChoiceClass,
    checkoutCompactFieldClass,
    checkoutFieldClass,
    checkoutFieldInvalidClass,
    checkoutLabelClass,
    checkoutSelectClass,
    checkoutTextClass,
} from '@/components/checkout/checkout-form-row';
import {
    CHECKOUT_COMMENT_MAX_LENGTH,
    CHECKOUT_COUNTRIES,
    CHECKOUT_SHIPPING_METHOD_FEDEX_GROUND,
    CHECKOUT_SHIPPING_METHOD_LABEL,
    US_STATE_OPTIONS,
    formatCheckoutCurrency,
    formatCheckoutLongDate,
    formatDisplayDate,
    formatPhoneDisplay,
    getCheckoutDeliveryWindowStart,
    isWeekendDate,
    normalizePhoneDigits,
    parseIsoDate,
    savedAddressToShippingForm,
    buildNewShippingAddressForm,
    type CheckoutShippingFieldErrors,
    type CheckoutShippingFieldId,
} from '@/lib/checkout-utils';
import type { CheckoutSavedAddress, CheckoutShippingForm } from '@/lib/checkout-types';
import { cn } from '@/lib/utils';

type CheckoutStepShippingProps = {
    form: CheckoutShippingForm;
    savedAddresses: CheckoutSavedAddress[];
    shippingLeadTime: number;
    defaultExpectedDeliveryDate: string;
    shippingCost: number;
    fieldErrors?: CheckoutShippingFieldErrors;
    onChange: (next: CheckoutShippingForm) => void;
};

export function CheckoutStepShipping({
    form,
    savedAddresses,
    shippingLeadTime,
    defaultExpectedDeliveryDate,
    shippingCost,
    fieldErrors = {},
    onChange,
}: CheckoutStepShippingProps) {
    const [calendarOpen, setCalendarOpen] = useState(false);
    const minDeliveryDate = useMemo(
        () => parseIsoDate(defaultExpectedDeliveryDate) ?? new Date(),
        [defaultExpectedDeliveryDate],
    );

    const patch = (partial: Partial<CheckoutShippingForm>) => {
        onChange({ ...form, ...partial });
    };

    const handleAddressSelection = (value: string) => {
        if (value === 'new') {
            onChange(buildNewShippingAddressForm(form));
            return;
        }

        const addressId = Number.parseInt(value, 10);
        const saved = savedAddresses.find((address) => address.id === addressId);
        if (!saved) return;

        onChange({
            ...savedAddressToShippingForm(saved),
            comment: form.comment,
            expectedDeliveryDate: form.expectedDeliveryDate,
        });
    };

    const selectedDate = parseIsoDate(form.expectedDeliveryDate);
    const deliveryWindowStart = form.expectedDeliveryDate
        ? getCheckoutDeliveryWindowStart(form.expectedDeliveryDate)
        : null;

    const invalid = (field: CheckoutShippingFieldId) => Boolean(fieldErrors[field]);

    const fieldClass = (field: CheckoutShippingFieldId, className: string) =>
        cn(className, invalid(field) && checkoutFieldInvalidClass);

    return (
        <div className="min-w-0 space-y-8 overflow-x-clip">
            <section>
                <p className={cn('mb-4', checkoutTextClass)}>
                    Enter or select a shipping address (<span className="font-bold">*Required</span>)
                </p>

                <div className="rounded-sm border border-[#e8dfd4] bg-white px-3 sm:px-4">
                    <CheckoutFormRow label="Address" required>
                        <select
                            className={checkoutSelectClass}
                            value={form.selectedAddressId === 'new' ? 'new' : String(form.selectedAddressId)}
                            onChange={(e) => handleAddressSelection(e.target.value)}
                        >
                            <option value="new">New Address</option>
                            {savedAddresses.map((address) => (
                                <option key={address.id} value={address.id}>
                                    {address.name || `${address.firstName} ${address.lastName}`.trim() || `Address ${address.id}`}
                                </option>
                            ))}
                        </select>
                    </CheckoutFormRow>

                    <CheckoutFormRow label="Address Name" required>
                        <input
                            className={fieldClass('addressName', checkoutFieldClass)}
                            value={form.addressName}
                            onChange={(e) => patch({ addressName: e.target.value })}
                            aria-invalid={invalid('addressName') || undefined}
                        />
                    </CheckoutFormRow>

                    <CheckoutFormRow label="First Name" required>
                        <input
                            className={fieldClass('firstName', checkoutFieldClass)}
                            value={form.firstName}
                            onChange={(e) => patch({ firstName: e.target.value })}
                            aria-invalid={invalid('firstName') || undefined}
                        />
                    </CheckoutFormRow>

                    <CheckoutFormRow label="Last Name" required>
                        <input
                            className={fieldClass('lastName', checkoutFieldClass)}
                            value={form.lastName}
                            onChange={(e) => patch({ lastName: e.target.value })}
                            aria-invalid={invalid('lastName') || undefined}
                        />
                    </CheckoutFormRow>

                    <CheckoutFormRow label="Company Name">
                        <input
                            className={checkoutFieldClass}
                            value={form.companyName}
                            onChange={(e) => patch({ companyName: e.target.value })}
                        />
                    </CheckoutFormRow>

                    <CheckoutFormRow label="Address" required>
                        <input
                            className={fieldClass('addressLine1', checkoutFieldClass)}
                            value={form.addressLine1}
                            onChange={(e) => patch({ addressLine1: e.target.value })}
                            aria-invalid={invalid('addressLine1') || undefined}
                        />
                    </CheckoutFormRow>

                    <CheckoutFormRow label="Address Line 2">
                        <input
                            className={checkoutFieldClass}
                            value={form.addressLine2}
                            onChange={(e) => patch({ addressLine2: e.target.value })}
                        />
                    </CheckoutFormRow>

                    <CheckoutFormRow label="City" required>
                        <input
                            className={fieldClass('city', checkoutFieldClass)}
                            value={form.city}
                            onChange={(e) => patch({ city: e.target.value })}
                            aria-invalid={invalid('city') || undefined}
                        />
                    </CheckoutFormRow>

                    <CheckoutFormRow label="State" required>
                        <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_7rem]">
                            <select
                                className={fieldClass('state', checkoutSelectClass)}
                                value={form.state}
                                onChange={(e) => patch({ state: e.target.value })}
                                aria-invalid={invalid('state') || undefined}
                            >
                                <option value="">Please Select</option>
                                {US_STATE_OPTIONS.map((state) => (
                                    <option key={state.abbr} value={state.abbr}>
                                        {state.name}
                                    </option>
                                ))}
                            </select>
                            <input
                                className={fieldClass('zipCode', cn(checkoutFieldClass, 'text-center'))}
                                value={form.zipCode}
                                onChange={(e) => patch({ zipCode: e.target.value })}
                                placeholder="Zip"
                                aria-label="Zip code"
                                aria-invalid={invalid('zipCode') || undefined}
                            />
                        </div>
                    </CheckoutFormRow>

                    <CheckoutFormRow label="Country" required>
                        <select
                            className={fieldClass('country', checkoutSelectClass)}
                            value={form.country}
                            onChange={(e) => patch({ country: e.target.value })}
                            aria-invalid={invalid('country') || undefined}
                        >
                            <option value="">Please Select</option>
                            {CHECKOUT_COUNTRIES.map((country) => (
                                <option key={country} value={country}>
                                    {country}
                                </option>
                            ))}
                        </select>
                    </CheckoutFormRow>

                    <CheckoutFormRow label="Email Address" required>
                        <div className="space-y-1">
                            <input
                                type="email"
                                className={fieldClass('emailAddress', checkoutFieldClass)}
                                value={form.emailAddress}
                                onChange={(e) => patch({ emailAddress: e.target.value })}
                                aria-invalid={invalid('emailAddress') || undefined}
                                aria-describedby={fieldErrors.emailAddress ? 'checkout-email-error' : undefined}
                            />
                            {fieldErrors.emailAddress ? (
                                <p id="checkout-email-error" className="text-sm text-red-600" role="alert">
                                    {fieldErrors.emailAddress}
                                </p>
                            ) : null}
                        </div>
                    </CheckoutFormRow>

                    <CheckoutFormRow label="Phone Number" required>
                        <input
                            type="tel"
                            className={fieldClass('phoneNumber', checkoutFieldClass)}
                            value={formatPhoneDisplay(form.phoneNumber)}
                            onChange={(e) => patch({ phoneNumber: normalizePhoneDigits(e.target.value) })}
                            inputMode="numeric"
                            autoComplete="tel"
                            maxLength={14}
                            aria-invalid={invalid('phoneNumber') || undefined}
                        />
                    </CheckoutFormRow>

                    <CheckoutFormRow label="Is Billing Address" required className="border-b-0">
                        <div className="flex items-center gap-6">
                            <label className={checkoutChoiceClass}>
                                <input
                                    type="radio"
                                    name="isBillingAddress"
                                    checked={form.isBillingAddress}
                                    onChange={() => patch({ isBillingAddress: true })}
                                />
                                Yes
                            </label>
                            <label className={checkoutChoiceClass}>
                                <input
                                    type="radio"
                                    name="isBillingAddress"
                                    checked={!form.isBillingAddress}
                                    onChange={() => patch({ isBillingAddress: false })}
                                />
                                No
                            </label>
                        </div>
                    </CheckoutFormRow>
                </div>
            </section>

            <section className="space-y-3 border-t border-[#d1b79a] pt-8">
                <CheckoutSectionTitle>Comment or Gift Message</CheckoutSectionTitle>
                <p className={checkoutTextClass}>
                    Please format your gift message or comment by entering up to {CHECKOUT_COMMENT_MAX_LENGTH} characters
                </p>
                <textarea
                    className={fieldClass('comment', cn(checkoutFieldClass, 'min-h-28 resize-y py-2'))}
                    maxLength={CHECKOUT_COMMENT_MAX_LENGTH}
                    value={form.comment}
                    onChange={(e) => patch({ comment: e.target.value })}
                    aria-invalid={invalid('comment') || undefined}
                />
                {fieldErrors.comment ? (
                    <p className="text-sm text-red-600" role="alert">
                        {fieldErrors.comment}
                    </p>
                ) : null}
                <p className={cn('text-right', checkoutTextClass)}>
                    {form.comment.length}/{CHECKOUT_COMMENT_MAX_LENGTH}
                </p>
            </section>

            <section className="space-y-3 border-t border-[#d1b79a] pt-8">
                <CheckoutSectionTitle>Shipping Options</CheckoutSectionTitle>
                <p className={checkoutTextClass}>
                    To ensure freshness, perishables cannot be delivered on Sat, Sun, or Holidays. Please select by what date
                    you would like to receive your order by clicking on the calendar icon. The default date is the first Friday
                    on or after today plus your account lead time ({shippingLeadTime} {shippingLeadTime === 1 ? 'day' : 'days'}).
                </p>

                <div className="rounded-sm border border-[#e8dfd4] bg-white px-3 py-2 sm:px-4">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <span className={cn(checkoutLabelClass, 'shrink-0 whitespace-nowrap')}>
                            Expected Delivery Date<span className="text-[#4a2518]">*</span>
                        </span>
                        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                            <PopoverTrigger asChild>
                                <button
                                    type="button"
                                    className={fieldClass(
                                        'expectedDeliveryDate',
                                        cn(
                                            checkoutCompactFieldClass,
                                            'inline-flex items-center justify-between gap-2 text-left whitespace-nowrap',
                                        ),
                                    )}
                                    aria-invalid={invalid('expectedDeliveryDate') || undefined}
                                >
                                    <span className="truncate">
                                        {selectedDate ? formatDisplayDate(form.expectedDeliveryDate) : 'Select date'}
                                    </span>
                                    <CalendarIcon className="size-3.5 shrink-0 text-[#4a2518]" aria-hidden />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={selectedDate ?? undefined}
                                    defaultMonth={selectedDate ?? minDeliveryDate}
                                    disabled={(date) => date < minDeliveryDate || isWeekendDate(date)}
                                    onSelect={(date) => {
                                        if (!date) return;
                                        patch({ expectedDeliveryDate: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` });
                                        setCalendarOpen(false);
                                    }}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    {fieldErrors.expectedDeliveryDate ? (
                        <p className="mt-2 text-sm text-red-600" role="alert">
                            {fieldErrors.expectedDeliveryDate}
                        </p>
                    ) : null}
                </div>
            </section>

            <section className="space-y-3 border-t border-[#d1b79a] pt-8">
                <CheckoutSectionTitle>By Shipping Method</CheckoutSectionTitle>

                <div className="rounded-sm border border-[#e8dfd4] bg-white px-3 py-3 sm:px-4">
                    <label className={cn(checkoutChoiceClass, 'items-start gap-3')}>
                        <input
                            type="radio"
                            name="shippingMethod"
                            className="mt-0.5"
                            checked={form.shippingMethod === CHECKOUT_SHIPPING_METHOD_FEDEX_GROUND}
                            readOnly
                            aria-label={`${CHECKOUT_SHIPPING_METHOD_LABEL} - ${formatCheckoutCurrency(shippingCost)}`}
                        />
                        <span className="space-y-1">
                            <span className="block text-sm font-bold uppercase tracking-[0.04em] text-[#4a2518]">
                                {CHECKOUT_SHIPPING_METHOD_LABEL} - {formatCheckoutCurrency(shippingCost)}
                            </span>
                            {deliveryWindowStart ? (
                                <span className={cn('block italic', checkoutTextClass)}>
                                    Delivery will be between {formatCheckoutLongDate(deliveryWindowStart)} and{' '}
                                    {formatCheckoutLongDate(form.expectedDeliveryDate)}
                                </span>
                            ) : null}
                        </span>
                    </label>
                </div>
            </section>
        </div>
    );
}
