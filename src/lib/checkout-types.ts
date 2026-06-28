export type CheckoutSavedAddress = {
    id: number;
    name: string;
    companyName: string;
    firstName: string;
    lastName: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    emailAddress: string;
    phoneNumber: string;
    isBillingAddress: boolean;
};

export type CheckoutShippingForm = {
    selectedAddressId: number | 'new';
    updateAddressId: number | null;
    addressName: string;
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
    isBillingAddress: boolean;
    comment: string;
    expectedDeliveryDate: string;
    shippingMethod: 'fedex-ground';
};

export type CheckoutCardType = '' | 'visa' | 'mastercard' | 'amex' | 'discover';

export const SUPPORTED_CHECKOUT_CARD_TYPES = ['visa', 'mastercard', 'amex', 'discover'] as const satisfies readonly CheckoutCardType[];

export type SupportedCheckoutCardType = (typeof SUPPORTED_CHECKOUT_CARD_TYPES)[number];

export const SUPPORTED_CHECKOUT_CARD_LABELS = 'Visa, Mastercard, American Express, and Discover';

export type CheckoutPaymentForm = {
    payByTerms: boolean;
    terms: string;
    cardName: string;
    cardType: CheckoutCardType;
    cardNumber: string;
    cardMonth: string;
    cardYear: string;
    cardCcv: string;
};

export type CheckoutBillingForm = {
    selectedAddressId: number | 'new';
    updateAddressId: number | null;
    addressName: string;
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
};

/** Safe payment details for review display — no full PAN or CVV. */
export type CheckoutPaymentSummary = {
    payByTerms: boolean;
    terms: string;
    cardName: string;
    cardType: CheckoutCardType;
    cardLast4: string;
    cardMonth: string;
    cardYear: string;
};

export type CheckoutFlowStepId = 'shipping' | 'billing' | 'payment' | 'review';

export type CheckoutFlowStep = {
    id: CheckoutFlowStepId;
    label: string;
};

export type CheckoutAccountDefaults = {
    firstName: string;
    lastName: string;
    companyName: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    zipCode: string;
    emailAddress: string;
    phoneNumber: string;
    terms: string;
    isTerms: boolean;
};

/** @deprecated Use getCheckoutFlowSteps() for dynamic step lists. */
export const CHECKOUT_STEPS = [
    { id: 1, label: 'Shipping & delivery' },
    { id: 2, label: 'Payment' },
    { id: 3, label: 'Review & place order' },
] as const;

export type CheckoutStepId = (typeof CHECKOUT_STEPS)[number]['id'];
