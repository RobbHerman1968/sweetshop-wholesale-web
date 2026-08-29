'use client';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    CheckoutFormRow,
    CheckoutSectionTitle,
    checkoutFieldInvalidClass,
    checkoutInputClass,
    checkoutSelectTriggerClass,
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
import type { CheckoutAccountDefaults, CheckoutBillingForm, CheckoutSavedAddress } from '@/lib/checkout-types';
import { cn } from '@/lib/utils';

type CheckoutStepBillingProps = {
    form: CheckoutBillingForm;
    savedBillingAddresses: CheckoutSavedAddress[];
    accountDefaults: CheckoutAccountDefaults;
    fieldErrors?: CheckoutBillingFieldErrors;
    onChange: (next: CheckoutBillingForm) => void;
};

export function CheckoutStepBilling({
    form,
    savedBillingAddresses,
    accountDefaults,
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

        onChange(savedAddressToBillingForm(saved, accountDefaults));
    };

    const invalid = (field: CheckoutBillingFieldId) => Boolean(fieldErrors[field]);

    const fieldClass = (field: CheckoutBillingFieldId, className: string) =>
        cn(className, invalid(field) && checkoutFieldInvalidClass);

    return (
        <div className="min-w-0 space-y-8 overflow-x-clip">
            <section>
                <CheckoutSectionTitle>Billing Address</CheckoutSectionTitle>
                <p className={cn('mt-3', checkoutTextClass)}>
                    Enter or select a billing address (<span className="font-bold">*Required</span>)
                </p>

                <div className="mt-4 rounded-sm border border-[#e8dfd4] bg-white px-3 sm:px-4">
                    <CheckoutFormRow label="Address" required>
                        <Select
                            value={form.selectedAddressId === 'new' ? 'new' : String(form.selectedAddressId)}
                            onValueChange={handleAddressSelection}
                        >
                            <SelectTrigger className={checkoutSelectTriggerClass}>
                                <SelectValue placeholder="New Address" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="new" className="normal-case">
                                    New Address
                                </SelectItem>
                                {savedBillingAddresses.map((address) => (
                                    <SelectItem key={address.id} value={String(address.id)} className="normal-case">
                                        {address.name || `${address.firstName} ${address.lastName}`.trim() || `Address ${address.id}`}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CheckoutFormRow>

                    <CheckoutFormRow label="Address Name" required>
                        <Input
                            className={fieldClass('addressName', checkoutInputClass)}
                            value={form.addressName}
                            onChange={(e) => patch({ addressName: e.target.value })}
                            aria-invalid={invalid('addressName') || undefined}
                        />
                    </CheckoutFormRow>

                    <CheckoutFormRow label="First Name" required>
                        <Input
                            className={fieldClass('firstName', checkoutInputClass)}
                            value={form.firstName}
                            onChange={(e) => patch({ firstName: e.target.value })}
                            aria-invalid={invalid('firstName') || undefined}
                        />
                    </CheckoutFormRow>

                    <CheckoutFormRow label="Last Name" required>
                        <Input
                            className={fieldClass('lastName', checkoutInputClass)}
                            value={form.lastName}
                            onChange={(e) => patch({ lastName: e.target.value })}
                            aria-invalid={invalid('lastName') || undefined}
                        />
                    </CheckoutFormRow>

                    <CheckoutFormRow label="Company Name">
                        <Input
                            className={checkoutInputClass}
                            value={form.companyName}
                            onChange={(e) => patch({ companyName: e.target.value })}
                        />
                    </CheckoutFormRow>

                    <CheckoutFormRow label="Address" required>
                        <Input
                            className={fieldClass('addressLine1', checkoutInputClass)}
                            value={form.addressLine1}
                            onChange={(e) => patch({ addressLine1: e.target.value })}
                            aria-invalid={invalid('addressLine1') || undefined}
                        />
                    </CheckoutFormRow>

                    <CheckoutFormRow label="Address Line 2">
                        <Input
                            className={checkoutInputClass}
                            value={form.addressLine2}
                            onChange={(e) => patch({ addressLine2: e.target.value })}
                        />
                    </CheckoutFormRow>

                    <CheckoutFormRow label="City" required>
                        <Input
                            className={fieldClass('city', checkoutInputClass)}
                            value={form.city}
                            onChange={(e) => patch({ city: e.target.value })}
                            aria-invalid={invalid('city') || undefined}
                        />
                    </CheckoutFormRow>

                    <CheckoutFormRow label="State" required>
                        <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_7rem]">
                            <Select
                                value={form.state || undefined}
                                onValueChange={(value) => patch({ state: value })}
                            >
                                <SelectTrigger
                                    className={fieldClass('state', checkoutSelectTriggerClass)}
                                    aria-invalid={invalid('state') || undefined}
                                >
                                    <SelectValue placeholder="Please Select" />
                                </SelectTrigger>
                                <SelectContent>
                                    {US_STATE_OPTIONS.map((state) => (
                                        <SelectItem key={state.abbr} value={state.abbr} className="normal-case">
                                            {state.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Input
                                className={fieldClass('zipCode', cn(checkoutInputClass, 'text-center'))}
                                value={form.zipCode}
                                onChange={(e) => patch({ zipCode: e.target.value })}
                                placeholder="Zip"
                                aria-label="Zip code"
                                aria-invalid={invalid('zipCode') || undefined}
                            />
                        </div>
                    </CheckoutFormRow>

                    <CheckoutFormRow label="Country" required>
                        <Select
                            value={form.country || undefined}
                            onValueChange={(value) => patch({ country: value })}
                        >
                            <SelectTrigger
                                className={fieldClass('country', checkoutSelectTriggerClass)}
                                aria-invalid={invalid('country') || undefined}
                            >
                                <SelectValue placeholder="Please Select" />
                            </SelectTrigger>
                            <SelectContent>
                                {CHECKOUT_COUNTRIES.map((country) => (
                                    <SelectItem key={country} value={country} className="normal-case">
                                        {country}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CheckoutFormRow>

                    <CheckoutFormRow label="Email Address" required>
                        <div className="space-y-1">
                            <Input
                                type="email"
                                className={fieldClass('emailAddress', checkoutInputClass)}
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
                        <Input
                            type="tel"
                            className={fieldClass('phoneNumber', checkoutInputClass)}
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
