'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckoutOrderSummary } from '@/components/checkout/checkout-order-summary';
import { CheckoutStepBilling } from '@/components/checkout/checkout-step-billing';
import { CheckoutStepIndicator } from '@/components/checkout/checkout-step-indicator';
import { CheckoutStepPayment } from '@/components/checkout/checkout-step-payment';
import { CheckoutStepReview } from '@/components/checkout/checkout-step-review';
import { CheckoutStepShipping } from '@/components/checkout/checkout-step-shipping';
import { checkoutTextClass } from '@/components/checkout/checkout-form-row';
import { toast } from '@/hooks/use-toast';
import {
    checkoutNeedsBillingStep,
    getCheckoutFlowSteps,
    getNextCheckoutStep,
    getPreviousCheckoutStep,
    getCheckoutStepIndex,
    isCheckoutReviewStep,
} from '@/lib/checkout-flow';
import type {
    CheckoutAccountDefaults,
    CheckoutBillingForm,
    CheckoutFlowStepId,
    CheckoutPaymentForm,
    CheckoutPaymentSummary,
    CheckoutSavedAddress,
    CheckoutShippingForm,
} from '@/lib/checkout-types';
import {
    buildEmptyBillingForm,
    buildEmptyShippingForm,
    billingFormToSavedAddress,
    buildPaymentSummary,
    getBillingFieldErrors,
    getCheckoutBillingEmailAddress,
    getShippingFieldErrors,
    mergeCheckoutSavedAddress,
    normalizePhoneDigits,
    pruneBillingFieldErrors,
    pruneShippingFieldErrors,
    savedAddressToBillingForm,
    shippingFormToBillingForm,
    shippingFormToSavedAddress,
    selectFirstEmailAddress,
    validatePaymentStep,
    type CheckoutBillingFieldErrors,
    type CheckoutShippingFieldErrors,
} from '@/lib/checkout-utils';
import {
    calculateCheckoutEstimatedTotal,
    calculateCheckoutShippingCost,
    calculateCheckoutTax,
    type CheckoutShippingOptions,
} from '@/lib/checkout-shipping-cost';
import { saveCheckoutAccountAddress, saveCheckoutBillingAddress } from '@/lib/db-pg/actions/account-address';
import type { ShopCartView } from '@/lib/shop-cart-view';
import { cn } from '@/lib/utils';

type CheckoutContentProps = {
    cart: ShopCartView;
    savedAddresses: CheckoutSavedAddress[];
    accountDefaults: CheckoutAccountDefaults;
    shippingLeadTime: number;
    defaultExpectedDeliveryDate: string;
    shippingOptions: CheckoutShippingOptions;
};

function buildInitialPaymentForm(defaults: CheckoutAccountDefaults): CheckoutPaymentForm {
    return {
        payByTerms: defaults.isTerms,
        terms: defaults.terms,
        cardName: '',
        cardType: '',
        cardNumber: '',
        cardMonth: '',
        cardYear: '',
        cardCcv: '',
    };
}

function buildPaymentSummaryForAccount(form: CheckoutPaymentForm, accountIsTerms: boolean): CheckoutPaymentSummary {
    if (accountIsTerms) {
        return {
            payByTerms: true,
            terms: form.terms,
            cardName: '',
            cardType: '',
            cardLast4: '',
            cardMonth: '',
            cardYear: '',
        };
    }

    return buildPaymentSummary(form);
}

export function CheckoutContent({
    cart,
    savedAddresses,
    accountDefaults,
    shippingLeadTime,
    defaultExpectedDeliveryDate,
    shippingOptions,
}: CheckoutContentProps) {
    const [checkoutSavedAddresses, setCheckoutSavedAddresses] = useState(savedAddresses);

    const savedBillingAddresses = useMemo(
        () => checkoutSavedAddresses.filter((address) => address.isBillingAddress),
        [checkoutSavedAddresses],
    );

    const defaultDeliveryDate = defaultExpectedDeliveryDate;

    const initialShipping = useMemo(() => {
        if (checkoutSavedAddresses.length > 0) {
            const first = checkoutSavedAddresses.find((address) => !address.isBillingAddress) ?? checkoutSavedAddresses[0];
            return {
                ...buildEmptyShippingForm(accountDefaults, defaultDeliveryDate),
                selectedAddressId: first.id as number | 'new',
                updateAddressId: first.id,
                addressName: first.name,
                firstName: first.firstName || accountDefaults.firstName,
                lastName: first.lastName || accountDefaults.lastName,
                companyName: first.companyName || accountDefaults.companyName,
                addressLine1: first.addressLine1 || accountDefaults.addressLine1,
                addressLine2: first.addressLine2 || accountDefaults.addressLine2,
                city: first.city || accountDefaults.city,
                state: first.state || accountDefaults.state,
                zipCode: first.postalCode || accountDefaults.zipCode,
                country: first.country || 'United States',
                emailAddress: selectFirstEmailAddress(first.emailAddress) || accountDefaults.emailAddress,
                phoneNumber: normalizePhoneDigits(first.phoneNumber || accountDefaults.phoneNumber),
                isBillingAddress: first.isBillingAddress,
            } satisfies CheckoutShippingForm;
        }

        return buildEmptyShippingForm(accountDefaults, defaultDeliveryDate);
    }, [accountDefaults, defaultDeliveryDate, checkoutSavedAddresses]);

    const initialBilling = useMemo(() => {
        if (savedBillingAddresses.length > 0) {
            return savedAddressToBillingForm(savedBillingAddresses[0]);
        }
        return buildEmptyBillingForm(accountDefaults);
    }, [accountDefaults, savedBillingAddresses]);

    const [currentStep, setCurrentStep] = useState<CheckoutFlowStepId>('shipping');
    const [shippingForm, setShippingForm] = useState<CheckoutShippingForm>(initialShipping);
    const [billingForm, setBillingForm] = useState<CheckoutBillingForm>(initialBilling);
    const [shippingFieldErrors, setShippingFieldErrors] = useState<CheckoutShippingFieldErrors>({});
    const [billingFieldErrors, setBillingFieldErrors] = useState<CheckoutBillingFieldErrors>({});
    const [paymentForm, setPaymentForm] = useState<CheckoutPaymentForm>(() => buildInitialPaymentForm(accountDefaults));
    const [paymentSummary, setPaymentSummary] = useState<CheckoutPaymentSummary | null>(null);
    const [billingEmailAddress, setBillingEmailAddress] = useState(() =>
        getCheckoutBillingEmailAddress(initialShipping, accountDefaults, checkoutSavedAddresses, initialBilling),
    );
    const [savingAddress, setSavingAddress] = useState(false);

    const needsBillingStep = checkoutNeedsBillingStep(shippingForm.isBillingAddress);
    const flowSteps = useMemo(() => getCheckoutFlowSteps(needsBillingStep), [needsBillingStep]);

    useEffect(() => {
        if (!flowSteps.some((step) => step.id === currentStep)) {
            setCurrentStep('payment');
        }
    }, [currentStep, flowSteps]);

    const checkoutShipping = useMemo(
        () =>
            calculateCheckoutShippingCost({
                subTotal: cart.subTotal,
                shipToState: shippingForm.state,
                freeShippingThreshold: shippingOptions.freeShippingThreshold,
                isSkipShipping: shippingOptions.isSkipShipping,
                isFreeGroundShipping: shippingOptions.isFreeGroundShipping,
                stateShippingRates: shippingOptions.stateShippingRates,
            }),
        [cart.subTotal, shippingForm.state, shippingOptions],
    );

    const checkoutTax = useMemo(
        () =>
            calculateCheckoutTax({
                subTotal: cart.subTotal,
                shipToState: shippingForm.state,
                isSkipTax: shippingOptions.isSkipTax,
                stateShippingRates: shippingOptions.stateShippingRates,
            }),
        [cart.subTotal, shippingForm.state, shippingOptions],
    );

    const estimatedTotal = useMemo(
        () => calculateCheckoutEstimatedTotal(cart.subTotal, checkoutTax, cart.discounts, checkoutShipping),
        [cart.discounts, cart.subTotal, checkoutShipping, checkoutTax],
    );

    const goToNextStep = async () => {
        if (currentStep === 'shipping') {
            const fieldErrors = getShippingFieldErrors(shippingForm);
            if (Object.keys(fieldErrors).length > 0) {
                setShippingFieldErrors(fieldErrors);
                toast({
                    variant: 'destructive',
                    title: 'Shipping details incomplete',
                    description: Object.values(fieldErrors)[0],
                });
                return;
            }

            setShippingFieldErrors({});
            setSavingAddress(true);
            try {
                const result = await saveCheckoutAccountAddress(shippingForm, accountDefaults, checkoutSavedAddresses);
                if (!result.ok) {
                    toast({ variant: 'destructive', title: 'Unable to save address', description: result.error });
                    return;
                }

                const savedShipping = shippingFormToSavedAddress(shippingForm, result.addressId);
                const nextSavedAddresses = (() => {
                    let next = mergeCheckoutSavedAddress(checkoutSavedAddresses, savedShipping);
                    if (shippingForm.isBillingAddress) {
                        const existingBilling = checkoutSavedAddresses.find((address) => address.isBillingAddress);
                        next = mergeCheckoutSavedAddress(
                            next,
                            billingFormToSavedAddress(
                                shippingFormToBillingForm({
                                    ...shippingForm,
                                    selectedAddressId: result.addressId,
                                    updateAddressId: existingBilling?.id ?? result.addressId,
                                }),
                                existingBilling?.id ?? result.addressId,
                            ),
                        );
                    }
                    return next;
                })();

                setCheckoutSavedAddresses(nextSavedAddresses);
                setShippingForm((current) => ({
                    ...current,
                    selectedAddressId: result.addressId,
                    updateAddressId: result.addressId,
                }));
                setBillingEmailAddress(
                    getCheckoutBillingEmailAddress(
                        { ...shippingForm, selectedAddressId: result.addressId, updateAddressId: result.addressId },
                        accountDefaults,
                        nextSavedAddresses,
                        needsBillingStep ? billingForm : null,
                    ),
                );

                const nextStep = getNextCheckoutStep(flowSteps, 'shipping');
                if (nextStep) {
                    setCurrentStep(nextStep);
                }
            } finally {
                setSavingAddress(false);
            }
            return;
        }

        if (currentStep === 'billing') {
            const fieldErrors = getBillingFieldErrors(billingForm);
            if (Object.keys(fieldErrors).length > 0) {
                setBillingFieldErrors(fieldErrors);
                toast({
                    variant: 'destructive',
                    title: 'Billing details incomplete',
                    description: Object.values(fieldErrors)[0],
                });
                return;
            }

            setBillingFieldErrors({});
            setSavingAddress(true);
            try {
                const result = await saveCheckoutBillingAddress(billingForm);
                if (!result.ok) {
                    toast({ variant: 'destructive', title: 'Unable to save billing address', description: result.error });
                    return;
                }

                setCheckoutSavedAddresses((current) =>
                    mergeCheckoutSavedAddress(current, billingFormToSavedAddress(billingForm, result.addressId)),
                );

                setBillingForm((current) => ({
                    ...current,
                    selectedAddressId: result.addressId,
                    updateAddressId: result.addressId,
                }));
                setBillingEmailAddress(result.billingEmailAddress);

                const nextStep = getNextCheckoutStep(flowSteps, 'billing');
                if (nextStep) {
                    setCurrentStep(nextStep);
                }
            } finally {
                setSavingAddress(false);
            }
            return;
        }

        if (currentStep === 'payment') {
            const error = validatePaymentStep(paymentForm, accountDefaults.isTerms);
            if (error) {
                toast({ variant: 'destructive', title: 'Payment details incomplete', description: error });
                return;
            }

            // PCI: payment data stays in the browser — only a redacted summary advances to review.
            setPaymentSummary(buildPaymentSummaryForAccount(paymentForm, accountDefaults.isTerms));

            const nextStep = getNextCheckoutStep(flowSteps, 'payment');
            if (nextStep) {
                setCurrentStep(nextStep);
            }
        }
    };

    const goToPreviousStep = () => {
        const previousStep = getPreviousCheckoutStep(flowSteps, currentStep);
        if (previousStep) {
            setCurrentStep(previousStep);
        }
    };

    const currentStepIndex = getCheckoutStepIndex(flowSteps, currentStep);
    const isReviewStep = isCheckoutReviewStep(currentStep);

    return (
        <div className="min-w-0 space-y-8 overflow-x-clip">
            <CheckoutStepIndicator
                steps={flowSteps}
                currentStep={currentStep}
                onStepClick={(step) => {
                    const stepIndex = getCheckoutStepIndex(flowSteps, step);
                    if (stepIndex < currentStepIndex) {
                        setCurrentStep(step);
                    }
                }}
            />

            <div className="grid gap-8 xl:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] xl:items-start">
                <div className="min-w-0 space-y-8">
                    {currentStep === 'shipping' ? (
                        <CheckoutStepShipping
                            form={shippingForm}
                            savedAddresses={checkoutSavedAddresses.filter((address) => !address.isBillingAddress)}
                            shippingLeadTime={shippingLeadTime}
                            defaultExpectedDeliveryDate={defaultExpectedDeliveryDate}
                            shippingCost={checkoutShipping}
                            fieldErrors={shippingFieldErrors}
                            onChange={(next) => {
                                const switchedToNew =
                                    next.selectedAddressId === 'new' && shippingForm.selectedAddressId !== 'new';
                                setShippingForm(next);
                                if (switchedToNew) {
                                    setShippingFieldErrors({});
                                } else {
                                    setShippingFieldErrors((current) => pruneShippingFieldErrors(current, next));
                                }
                            }}
                        />
                    ) : null}

                    {currentStep === 'billing' ? (
                        <CheckoutStepBilling
                            form={billingForm}
                            savedBillingAddresses={savedBillingAddresses}
                            fieldErrors={billingFieldErrors}
                            onChange={(next) => {
                                const switchedToNew =
                                    next.selectedAddressId === 'new' && billingForm.selectedAddressId !== 'new';
                                setBillingForm(next);
                                if (switchedToNew) {
                                    setBillingFieldErrors({});
                                } else {
                                    setBillingFieldErrors((current) => pruneBillingFieldErrors(current, next));
                                }
                            }}
                        />
                    ) : null}

                    {currentStep === 'payment' ? (
                        <CheckoutStepPayment
                            form={paymentForm}
                            accountIsTerms={accountDefaults.isTerms}
                            accountTerms={accountDefaults.terms}
                            onChange={setPaymentForm}
                        />
                    ) : null}

                    {isReviewStep && paymentSummary ? (
                        <CheckoutStepReview
                            cart={cart}
                            shipping={shippingForm}
                            billing={needsBillingStep ? billingForm : shippingFormToBillingForm(shippingForm)}
                            billingSameAsShipping={!needsBillingStep}
                            payment={paymentSummary}
                            billingEmailAddress={billingEmailAddress}
                            shippingCost={checkoutShipping}
                            tax={checkoutTax}
                            estimatedTotal={estimatedTotal}
                        />
                    ) : null}

                    <div className="flex flex-wrap items-center gap-3 border-t border-[#d1b79a] pt-6">
                        {currentStep === 'shipping' ? (
                            <Link
                                href="/cart"
                                className={cn(
                                    'inline-flex items-center justify-center rounded-md border border-[#c49a78] px-5 py-2.5',
                                    'text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6e4a34] transition-colors hover:bg-[#f3e0cf]',
                                )}
                            >
                                Back to cart
                            </Link>
                        ) : (
                            <button
                                type="button"
                                onClick={goToPreviousStep}
                                className={cn(
                                    'inline-flex items-center justify-center rounded-md border border-[#c49a78] px-5 py-2.5',
                                    'text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6e4a34] transition-colors hover:bg-[#f3e0cf]',
                                )}
                            >
                                Back
                            </button>
                        )}

                        {!isReviewStep ? (
                            <button
                                type="button"
                                disabled={savingAddress}
                                onClick={() => void goToNextStep()}
                                className={cn(
                                    'inline-flex items-center justify-center rounded-md bg-[#4a2518] px-5 py-2.5',
                                    'text-[11px] font-semibold uppercase tracking-[0.18em] text-[#fdf7ef] transition-colors hover:bg-[#3a1b11]',
                                    savingAddress && 'cursor-not-allowed opacity-60',
                                )}
                            >
                                {savingAddress ? 'Saving…' : 'Continue'}
                            </button>
                        ) : (
                            <p className={cn('text-sm text-[#6e4a34]', checkoutTextClass)}>
                                Order placement is not available yet. Review your details above; submission will be enabled in a future update.
                            </p>
                        )}
                    </div>
                </div>

                <div className="min-w-0 xl:sticky xl:top-24">
                    <CheckoutOrderSummary
                        cart={cart}
                        shipping={checkoutShipping}
                        tax={checkoutTax}
                        estimatedTotal={estimatedTotal}
                    />
                </div>
            </div>
        </div>
    );
}
