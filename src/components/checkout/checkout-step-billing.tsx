'use client';

import {
    CheckoutFormRow,
    CheckoutSectionTitle,
    checkoutFieldClass,
    checkoutFieldInvalidClass,
    checkoutSelectClass,
    checkoutTextClass,
} from '@/components/checkout/checkout-form-row';
import {
    CHECKOUT_COUNTRIES,
    US_STATE_OPTIONS,
    formatPhoneDisplay,
    normalizePhoneDigits,
    savedAddressToBillingForm,
    buildNewBillingAddressForm,
    type CheckoutBillingFieldErrors,
    type CheckoutBillingFieldId,
} from '@/lib/checkout-utils';
import type { CheckoutBillingForm, CheckoutSavedAddress } from '@/lib/checkout-types';
import { cn } from '@/lib/utils';

type CheckoutStepBillingProps = {
    form: CheckoutBillingForm;
    savedBillingAddresses: CheckoutSavedAddress[];
    fieldErrors?: CheckoutBillingFieldErrors;
    onChange: (next: CheckoutBillingForm) => void;
};

export function CheckoutStepBilling({
    form,
    savedBillingAddresses,
    fieldErrors = {},
    onChange,
}: CheckoutStepBillingProps) {
    const patch = (partial: Partial<CheckoutBillingForm>) => {
        onChange({ ...form, ...partial });
    };

    const handleAddressSelection = (value: string) => {
        if (value === 'new') {
            onChange(buildNewBillingAddressForm());
            return;
        }

        const addressId = Number.parseInt(value, 10);
        const saved = savedBillingAddresses.find((address) => address.id === addressId);
        if (!saved) return;

        onChange(savedAddressToBillingForm(saved));
    };

    const invalid = (field: CheckoutBillingFieldId) => Boolean(fieldErrors[field]);

    const fieldClass = (field: CheckoutBillingFieldId, className: string) =>
        cn(className, invalid(field) && checkoutFieldInvalidClass);

    return (
        <div className="space-y-8">
            <section>
                <CheckoutSectionTitle>Billing Address</CheckoutSectionTitle>
                <p className={cn('mt-3', checkoutTextClass)}>
                    Enter or select a billing address (<span className="font-bold">*Required</span>)
                </p>

                <div className="mt-4 rounded-sm border border-[#e8dfd4] bg-white px-3 sm:px-4">
                    <CheckoutFormRow label="Address" required>
                        <select
                            className={checkoutSelectClass}
                            value={form.selectedAddressId === 'new' ? 'new' : String(form.selectedAddressId)}
                            onChange={(e) => handleAddressSelection(e.target.value)}
                        >
                            <option value="new">New Address</option>
                            {savedBillingAddresses.map((address) => (
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
                        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_7rem]">
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
                                aria-describedby={fieldErrors.emailAddress ? 'checkout-billing-email-error' : undefined}
                            />
                            {fieldErrors.emailAddress ? (
                                <p id="checkout-billing-email-error" className="text-sm text-red-600" role="alert">
                                    {fieldErrors.emailAddress}
                                </p>
                            ) : null}
                        </div>
                    </CheckoutFormRow>

                    <CheckoutFormRow label="Phone Number" required className="border-b-0">
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
                </div>
            </section>
        </div>
    );
}
