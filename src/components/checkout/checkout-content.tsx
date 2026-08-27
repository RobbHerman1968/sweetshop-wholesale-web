'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
    pruneBillingFieldErrors,
    pruneShippingFieldErrors,
    savedAddressToBillingForm,
    shippingFormToBillingForm,
    shippingFormToSavedAddress,
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
import { placeCheckoutOrder } from '@/lib/db-pg/actions/place-checkout-order';
import type { ShopCartView } from '@/lib/shop-cart-view';
import { cn } from '@/lib/utils';

type CheckoutContentProps = {
    cart: ShopCartView;
    savedAddresses: CheckoutSavedAddress[];
    savedShippingAddresses: CheckoutSavedAddress[];
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
    savedShippingAddresses,
    accountDefaults,
    shippingLeadTime,
    defaultExpectedDeliveryDate,
    shippingOptions,
}: CheckoutContentProps) {
    const [checkoutSavedAddresses, setCheckoutSavedAddresses] = useState(savedAddresses);
    const [checkoutSavedShippingAddresses, setCheckoutSavedShippingAddresses] = useState(savedShippingAddresses);

    const savedBillingAddresses = useMemo(
        () => checkoutSavedAddresses.filter((address) => address.isBillingAddress),
        [checkoutSavedAddresses],
    );

    const defaultDeliveryDate = defaultExpectedDeliveryDate;

    const initialShipping = useMemo(
        () => buildEmptyShippingForm(accountDefaults, defaultDeliveryDate),
        [accountDefaults, defaultDeliveryDate],
    );

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
    const [placingOrder, setPlacingOrder] = useState(false);
    const router = useRouter();
    const hasRecordedInitialStep = useRef(false);

    const needsBillingStep = checkoutNeedsBillingStep(shippingForm.isBillingAddress);
    const flowSteps = useMemo(() => getCheckoutFlowSteps(needsBillingStep), [needsBillingStep]);

    useEffect(() => {
        if (!flowSteps.some((step) => step.id === currentStep)) {
            setCurrentStep('payment');
        }
    }, [currentStep, flowSteps]);

    useEffect(() => {
        if (!hasRecordedInitialStep.current) {
            hasRecordedInitialStep.current = true;
            return;
        }

        if (window.matchMedia('(max-width: 639px)').matches) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [currentStep]);

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
                setCheckoutSavedShippingAddresses((current) =>
                    mergeCheckoutSavedAddress(current, savedShipping),
                );
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

    const handlePlaceOrder = async () => {
        if (!paymentSummary) {
            return;
        }

        setPlacingOrder(true);
        try {
            const result = await placeCheckoutOrder({
                shipping: shippingForm,
                billing: needsBillingStep ? billingForm : shippingFormToBillingForm(shippingForm),
                billingSameAsShipping: !needsBillingStep,
                payment: paymentForm,
                shippingCost: checkoutShipping,
                tax: checkoutTax,
                estimatedTotal,
            });

            if (!result.ok) {
                toast({
                    variant: 'destructive',
                    title: 'Unable to place order',
                    description: result.error,
                });
                return;
            }

            toast({
                title: 'Order placed',
                description: result.orderNumber ? `Order #${result.orderNumber} was submitted.` : 'Your order was submitted.',
            });
            router.push(`/account/orders/${result.orderId}`);
            router.refresh();
        } finally {
            setPlacingOrder(false);
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
                            savedAddresses={checkoutSavedShippingAddresses}
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
                            <button
                                type="button"
                                disabled={placingOrder}
                                onClick={() => void handlePlaceOrder()}
                                className={cn(
                                    'inline-flex items-center justify-center rounded-md bg-[#4a2518] px-5 py-2.5',
                                    'text-[11px] font-semibold uppercase tracking-[0.18em] text-[#fdf7ef] transition-colors hover:bg-[#3a1b11]',
                                    placingOrder && 'cursor-not-allowed opacity-60',
                                )}
                            >
                                {placingOrder ? 'Placing order…' : 'Place order'}
                            </button>
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
