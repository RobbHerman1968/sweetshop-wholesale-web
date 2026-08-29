import type {
    CheckoutAccountDefaults,
    CheckoutBillingForm,
    CheckoutPaymentForm,
    CheckoutPaymentSummary,
    CheckoutSavedAddress,
    CheckoutShippingForm,
} from '@/lib/checkout-types';
import {
    getInlineCardNumberError,
    isSupportedCardType,
    isValidCardCvv,
    isValidCardExpiry,
    isValidLuhnCardNumber,
    normalizeCardDigits,
} from '@/lib/checkout-payment-validation';
import { SUPPORTED_CHECKOUT_CARD_LABELS } from '@/lib/checkout-types';
import { z } from 'zod';

export const US_STATE_OPTIONS = [
    { abbr: 'AL', name: 'Alabama' },
    { abbr: 'AK', name: 'Alaska' },
    { abbr: 'AZ', name: 'Arizona' },
    { abbr: 'AR', name: 'Arkansas' },
    { abbr: 'CA', name: 'California' },
    { abbr: 'CO', name: 'Colorado' },
    { abbr: 'CT', name: 'Connecticut' },
    { abbr: 'DE', name: 'Delaware' },
    { abbr: 'DC', name: 'District of Columbia' },
    { abbr: 'FL', name: 'Florida' },
    { abbr: 'GA', name: 'Georgia' },
    { abbr: 'HI', name: 'Hawaii' },
    { abbr: 'ID', name: 'Idaho' },
    { abbr: 'IL', name: 'Illinois' },
    { abbr: 'IN', name: 'Indiana' },
    { abbr: 'IA', name: 'Iowa' },
    { abbr: 'KS', name: 'Kansas' },
    { abbr: 'KY', name: 'Kentucky' },
    { abbr: 'LA', name: 'Louisiana' },
    { abbr: 'ME', name: 'Maine' },
    { abbr: 'MD', name: 'Maryland' },
    { abbr: 'MA', name: 'Massachusetts' },
    { abbr: 'MI', name: 'Michigan' },
    { abbr: 'MN', name: 'Minnesota' },
    { abbr: 'MS', name: 'Mississippi' },
    { abbr: 'MO', name: 'Missouri' },
    { abbr: 'MT', name: 'Montana' },
    { abbr: 'NE', name: 'Nebraska' },
    { abbr: 'NV', name: 'Nevada' },
    { abbr: 'NH', name: 'New Hampshire' },
    { abbr: 'NJ', name: 'New Jersey' },
    { abbr: 'NM', name: 'New Mexico' },
    { abbr: 'NY', name: 'New York' },
    { abbr: 'NC', name: 'North Carolina' },
    { abbr: 'ND', name: 'North Dakota' },
    { abbr: 'OH', name: 'Ohio' },
    { abbr: 'OK', name: 'Oklahoma' },
    { abbr: 'OR', name: 'Oregon' },
    { abbr: 'PA', name: 'Pennsylvania' },
    { abbr: 'RI', name: 'Rhode Island' },
    { abbr: 'SC', name: 'South Carolina' },
    { abbr: 'SD', name: 'South Dakota' },
    { abbr: 'TN', name: 'Tennessee' },
    { abbr: 'TX', name: 'Texas' },
    { abbr: 'UT', name: 'Utah' },
    { abbr: 'VT', name: 'Vermont' },
    { abbr: 'VA', name: 'Virginia' },
    { abbr: 'WA', name: 'Washington' },
    { abbr: 'WV', name: 'West Virginia' },
    { abbr: 'WI', name: 'Wisconsin' },
    { abbr: 'WY', name: 'Wyoming' },
] as const;

export const CHECKOUT_COUNTRIES = ['United States', 'Canada'] as const;

export const CHECKOUT_COMMENT_MAX_LENGTH = 180;

export const CHECKOUT_DEFAULT_ADDRESS_NAME = 'DEFAULT';
export const CHECKOUT_SHIPPING_ADDRESS_NAME = 'Shipping Address';
export const CHECKOUT_BILLING_ADDRESS_NAME = 'Billing Address';

export function normalizeAddressName(value: string): string {
    return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

export function isDefaultAddressName(value: string | null | undefined): boolean {
    const normalized = normalizeAddressName(value ?? '');
    return (
        normalized === normalizeAddressName(CHECKOUT_DEFAULT_ADDRESS_NAME) ||
        normalized === normalizeAddressName(CHECKOUT_SHIPPING_ADDRESS_NAME)
    );
}

export function isDefaultBillingAddressName(value: string | null | undefined): boolean {
    const normalized = normalizeAddressName(value ?? '');
    return (
        normalized === normalizeAddressName(CHECKOUT_DEFAULT_ADDRESS_NAME) ||
        normalized === normalizeAddressName(CHECKOUT_BILLING_ADDRESS_NAME)
    );
}

export function findDefaultSavedAddress(addresses: CheckoutSavedAddress[]): CheckoutSavedAddress | null {
    return (
        addresses.find((address) => normalizeAddressName(address.name) === normalizeAddressName(CHECKOUT_SHIPPING_ADDRESS_NAME)) ??
        addresses.find((address) => isDefaultAddressName(address.name)) ??
        null
    );
}

export function findDefaultBillingAddress(addresses: CheckoutSavedAddress[]): CheckoutSavedAddress | null {
    return (
        addresses.find((address) => isDefaultAddressName(address.name)) ??
        addresses.find((address) => isDefaultBillingAddressName(address.name)) ??
        null
    );
}

export function findDuplicateAddressName(
    name: string,
    addresses: CheckoutSavedAddress[],
    excludeId?: number | null,
): CheckoutSavedAddress | null {
    const normalized = normalizeAddressName(name);
    if (!normalized) {
        return null;
    }

    return (
        addresses.find(
            (address) =>
                normalizeAddressName(address.name) === normalized && (excludeId == null || address.id !== excludeId),
        ) ?? null
    );
}

/** Strip non-digits and cap at 10 characters (US phone). */
export function normalizePhoneDigits(value: string): string {
    return value.replace(/\D/g, '').slice(0, 10);
}

/** Format digits as (xxx)-xxx-xxxx for display. */
export function formatPhoneDisplay(digits: string): string {
    const d = normalizePhoneDigits(digits);
    if (d.length === 0) return '';
    if (d.length <= 3) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0, 3)})-${d.slice(3)}`;
    return `(${d.slice(0, 3)})-${d.slice(3, 6)}-${d.slice(6)}`;
}

/** When contact email contains multiple values (comma/semicolon separated), use the first. */
export function selectFirstEmailAddress(value: string | null | undefined): string {
    const trimmed = value?.trim() ?? '';
    if (!trimmed) return '';
    return trimmed.split(/[,;]/)[0]?.trim() ?? '';
}

export function isValidCheckoutEmail(value: string): boolean {
    return z.string().trim().email().safeParse(value).success;
}

export function getShippingEmailError(form: Pick<CheckoutShippingForm, 'emailAddress'>): string | null {
    if (!form.emailAddress.trim()) return 'Email address is required.';
    if (!isValidCheckoutEmail(form.emailAddress)) return 'Enter a valid email address.';
    return null;
}

function pad2(value: number): string {
    return String(value).padStart(2, '0');
}

/** Business calendar dates for checkout (perishables / delivery scheduling). */
export const CHECKOUT_BUSINESS_TIMEZONE = 'America/Chicago';

type CalendarDateParts = {
    year: number;
    month: number;
    day: number;
};

function parseIsoDateToParts(value: string): CalendarDateParts | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
        return null;
    }

    return { year, month, day };
}

function calendarDateToIso(parts: CalendarDateParts): string {
    return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

function calendarPartsToLocalDate(parts: CalendarDateParts): Date {
    return new Date(parts.year, parts.month - 1, parts.day);
}

function localDateToCalendarParts(date: Date): CalendarDateParts {
    return {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
    };
}

function getCalendarDatePartsInTimeZone(date: Date, timeZone: string): CalendarDateParts {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
    const parts = formatter.formatToParts(date);
    const year = Number(parts.find((part) => part.type === 'year')?.value);
    const month = Number(parts.find((part) => part.type === 'month')?.value);
    const day = Number(parts.find((part) => part.type === 'day')?.value);

    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
        throw new Error(`Unable to resolve calendar date for timezone ${timeZone}.`);
    }

    return { year, month, day };
}

function addCalendarDays(parts: CalendarDateParts, days: number): CalendarDateParts {
    const utc = Date.UTC(parts.year, parts.month - 1, parts.day + days);
    const date = new Date(utc);
    return {
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
        day: date.getUTCDate(),
    };
}

function getDayOfWeek(parts: CalendarDateParts): number {
    return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
}

function getFirstFridayOnOrAfterFromParts(parts: CalendarDateParts): CalendarDateParts {
    const daysUntilFriday = (5 - getDayOfWeek(parts) + 7) % 7;
    return daysUntilFriday === 0 ? parts : addCalendarDays(parts, daysUntilFriday);
}

export function formatIsoDate(date: Date): string {
    return calendarDateToIso(localDateToCalendarParts(date));
}

export function parseIsoDate(value: string): Date | null {
    const parts = parseIsoDateToParts(value);
    if (!parts) return null;

    const date = calendarPartsToLocalDate(parts);
    if (date.getFullYear() !== parts.year || date.getMonth() + 1 !== parts.month || date.getDate() !== parts.day) {
        return null;
    }

    return date;
}

export function formatDisplayDate(value: string): string {
    const parts = parseIsoDateToParts(value);
    if (!parts) return value;
    return `${pad2(parts.month)}/${pad2(parts.day)}/${parts.year}`;
}

export function formatCheckoutLongDate(value: string | Date): string {
    const parts = value instanceof Date ? localDateToCalendarParts(value) : parseIsoDateToParts(value);
    if (!parts) return '';

    const date = calendarPartsToLocalDate(parts);
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });
}

/** AccountMate ship-via for FedEx Ground and free ground shipping. */
export const CHECKOUT_SHIPPING_METHOD_FEDEX_GROUND = 'FEDEX-G' as const;
export const CHECKOUT_SHIPPING_METHOD_LABEL = 'FedEx Ground';

const FEDEX_GROUND_SHIP_VIA_ALIASES = new Set([
    'FEDEX-G',
    'FEDEX-GROUND',
    'FEDEX_GROUND',
    'FEDEX GROUND',
    'FEDEXGROUND',
]);

export function toAccountMateShipVia(method: string | null | undefined): string {
    const trimmed = method?.trim() ?? '';
    const normalized = trimmed.toUpperCase().replace(/[\s_]+/g, '-');
    if (!trimmed || FEDEX_GROUND_SHIP_VIA_ALIASES.has(trimmed.toUpperCase()) || FEDEX_GROUND_SHIP_VIA_ALIASES.has(normalized)) {
        return CHECKOUT_SHIPPING_METHOD_FEDEX_GROUND;
    }
    return trimmed;
}

export function getDateAfterLeadDays(shippingLeadTimeDays: number, from = new Date()): Date {
    const today = getCalendarDatePartsInTimeZone(from, CHECKOUT_BUSINESS_TIMEZONE);
    const afterLead = addCalendarDays(today, Math.max(0, Math.round(shippingLeadTimeDays)));
    return calendarPartsToLocalDate(afterLead);
}

export function getFirstFridayOnOrAfter(date: Date): Date {
    return calendarPartsToLocalDate(getFirstFridayOnOrAfterFromParts(localDateToCalendarParts(date)));
}

/** Default delivery date: business today + lead days, then the first Friday on or after that date. */
export function getDefaultExpectedDeliveryDate(shippingLeadTimeDays: number, from = new Date()): string {
    const today = getCalendarDatePartsInTimeZone(from, CHECKOUT_BUSINESS_TIMEZONE);
    const afterLead = addCalendarDays(today, Math.max(0, Math.round(shippingLeadTimeDays)));
    return calendarDateToIso(getFirstFridayOnOrAfterFromParts(afterLead));
}

/** Start of the FedEx Ground delivery window: expected delivery date minus calendar days. */
export function getCheckoutDeliveryWindowStart(expectedDeliveryDate: string, daysBefore = 7): string | null {
    const parts = parseIsoDateToParts(expectedDeliveryDate);
    if (!parts) return null;
    return calendarDateToIso(addCalendarDays(parts, -Math.max(0, Math.round(daysBefore))));
}

export function isWeekendDate(date: Date): boolean {
    const day = getDayOfWeek(localDateToCalendarParts(date));
    return day === 0 || day === 6;
}

export function resolveCheckoutSaveAddressId(form: {
    selectedAddressId: number | 'new';
    updateAddressId: number | null;
}): number | null {
    if (form.updateAddressId != null && Number.isFinite(form.updateAddressId) && form.updateAddressId > 0) {
        return form.updateAddressId;
    }

    if (form.selectedAddressId !== 'new' && Number.isFinite(form.selectedAddressId) && form.selectedAddressId > 0) {
        return form.selectedAddressId;
    }

    return null;
}

export function shippingFormToSavedAddress(form: CheckoutShippingForm, addressId: number): CheckoutSavedAddress {
    return {
        id: addressId,
        name: form.addressName,
        companyName: form.companyName,
        firstName: form.firstName,
        lastName: form.lastName,
        addressLine1: form.addressLine1,
        addressLine2: form.addressLine2,
        city: form.city,
        state: form.state,
        postalCode: form.zipCode,
        country: form.country,
        emailAddress: form.emailAddress,
        phoneNumber: form.phoneNumber,
        isBillingAddress: false,
    };
}

export function billingFormToSavedAddress(form: CheckoutBillingForm, addressId: number): CheckoutSavedAddress {
    return {
        id: addressId,
        name: form.addressName || 'Billing Address',
        companyName: form.companyName,
        firstName: form.firstName,
        lastName: form.lastName,
        addressLine1: form.addressLine1,
        addressLine2: form.addressLine2,
        city: form.city,
        state: form.state,
        postalCode: form.zipCode,
        country: form.country,
        emailAddress: form.emailAddress,
        phoneNumber: form.phoneNumber,
        isBillingAddress: true,
    };
}

export function mergeCheckoutSavedAddress(
    addresses: CheckoutSavedAddress[],
    saved: CheckoutSavedAddress,
): CheckoutSavedAddress[] {
    const index = addresses.findIndex((address) => address.id === saved.id);
    if (index >= 0) {
        const next = [...addresses];
        next[index] = saved;
        return next;
    }

    return [...addresses, saved];
}

export function shouldPersistCheckoutAddressToAccount(addressName: string): boolean {
    return !isDefaultAddressName(addressName);
}

export function shouldPersistCheckoutBillingAddressToAccount(addressName: string): boolean {
    return !isDefaultBillingAddressName(addressName);
}

export function savedAddressToShippingForm(
    address: CheckoutSavedAddress,
    accountDefaults?: CheckoutAccountDefaults,
): CheckoutShippingForm {
    if (isDefaultAddressName(address.name) && accountDefaults) {
        return {
            ...buildEmptyShippingForm(accountDefaults, ''),
            selectedAddressId: address.id,
            updateAddressId: address.id,
        };
    }

    return {
        selectedAddressId: address.id,
        updateAddressId: address.id,
        addressName: address.name,
        firstName: address.firstName,
        lastName: address.lastName,
        companyName: address.companyName,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        state: address.state,
        zipCode: address.postalCode,
        country: address.country || 'United States',
        emailAddress: selectFirstEmailAddress(address.emailAddress),
        phoneNumber: normalizePhoneDigits(address.phoneNumber),
        isBillingAddress: address.isBillingAddress,
        comment: '',
        expectedDeliveryDate: '',
        shippingMethod: CHECKOUT_SHIPPING_METHOD_FEDEX_GROUND,
    };
}

export function buildEmptyShippingForm(
    defaults: CheckoutAccountDefaults,
    expectedDeliveryDate: string,
): CheckoutShippingForm {
    return {
        selectedAddressId: 'new',
        updateAddressId: null,
        addressName: CHECKOUT_SHIPPING_ADDRESS_NAME,
        firstName: defaults.firstName,
        lastName: defaults.lastName,
        companyName: defaults.companyName,
        addressLine1: defaults.addressLine1,
        addressLine2: defaults.addressLine2,
        city: defaults.city,
        state: defaults.state,
        zipCode: defaults.zipCode,
        country: 'United States',
        emailAddress: defaults.emailAddress,
        phoneNumber: normalizePhoneDigits(defaults.phoneNumber),
        isBillingAddress: false,
        comment: '',
        expectedDeliveryDate,
        shippingMethod: CHECKOUT_SHIPPING_METHOD_FEDEX_GROUND,
    };
}

export function buildDefaultShippingForm(
    defaults: CheckoutAccountDefaults,
    expectedDeliveryDate: string,
    defaultAddress?: CheckoutSavedAddress | null,
): CheckoutShippingForm {
    return {
        ...buildEmptyShippingForm(defaults, expectedDeliveryDate),
        selectedAddressId: defaultAddress?.id ?? 'new',
        updateAddressId: defaultAddress?.id ?? null,
        addressName: CHECKOUT_SHIPPING_ADDRESS_NAME,
    };
}

export function buildNewShippingAddressForm(current: CheckoutShippingForm): CheckoutShippingForm {
    return {
        ...current,
        selectedAddressId: 'new',
        updateAddressId: null,
        addressName: '',
        firstName: '',
        lastName: '',
        companyName: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
        emailAddress: '',
        phoneNumber: '',
        isBillingAddress: false,
    };
}

export function buildNewBillingAddressForm(): CheckoutBillingForm {
    return {
        selectedAddressId: 'new',
        updateAddressId: null,
        addressName: '',
        firstName: '',
        lastName: '',
        companyName: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
        emailAddress: '',
        phoneNumber: '',
    };
}

export function getCheckoutBillingEmailAddress(
    shippingForm: CheckoutShippingForm,
    accountDefaults: CheckoutAccountDefaults,
    savedAddresses: CheckoutSavedAddress[],
    billingForm?: CheckoutBillingForm | null,
): string {
    if (shippingForm.isBillingAddress) {
        return selectFirstEmailAddress(shippingForm.emailAddress);
    }

    if (billingForm?.emailAddress.trim()) {
        return selectFirstEmailAddress(billingForm.emailAddress);
    }

    const billingFromSaved = savedAddresses.find((address) => address.isBillingAddress && address.emailAddress.trim());
    if (billingFromSaved) {
        return billingFromSaved.emailAddress;
    }

    return accountDefaults.emailAddress;
}

export function shippingFormToBillingForm(shipping: CheckoutShippingForm): CheckoutBillingForm {
    return {
        selectedAddressId: shipping.selectedAddressId,
        updateAddressId: shipping.updateAddressId,
        addressName: shipping.addressName,
        firstName: shipping.firstName,
        lastName: shipping.lastName,
        companyName: shipping.companyName,
        addressLine1: shipping.addressLine1,
        addressLine2: shipping.addressLine2,
        city: shipping.city,
        state: shipping.state,
        zipCode: shipping.zipCode,
        country: shipping.country,
        emailAddress: shipping.emailAddress,
        phoneNumber: shipping.phoneNumber,
    };
}

export function savedAddressToBillingForm(
    address: CheckoutSavedAddress,
    accountDefaults?: CheckoutAccountDefaults,
): CheckoutBillingForm {
    if (isDefaultBillingAddressName(address.name) && accountDefaults) {
        return {
            ...buildEmptyBillingForm(accountDefaults),
            selectedAddressId: address.id,
            updateAddressId: address.id,
            addressName: address.name || CHECKOUT_BILLING_ADDRESS_NAME,
        };
    }

    return {
        selectedAddressId: address.id,
        updateAddressId: address.id,
        addressName: address.name,
        firstName: address.firstName,
        lastName: address.lastName,
        companyName: address.companyName,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        state: address.state,
        zipCode: address.postalCode,
        country: address.country || 'United States',
        emailAddress: selectFirstEmailAddress(address.emailAddress),
        phoneNumber: normalizePhoneDigits(address.phoneNumber),
    };
}

export function buildEmptyBillingForm(defaults: CheckoutAccountDefaults): CheckoutBillingForm {
    return {
        selectedAddressId: 'new',
        updateAddressId: null,
        addressName: CHECKOUT_BILLING_ADDRESS_NAME,
        firstName: defaults.firstName,
        lastName: defaults.lastName,
        companyName: defaults.companyName,
        addressLine1: defaults.addressLine1,
        addressLine2: defaults.addressLine2,
        city: defaults.city,
        state: defaults.state,
        zipCode: defaults.zipCode,
        country: 'United States',
        emailAddress: defaults.emailAddress,
        phoneNumber: normalizePhoneDigits(defaults.phoneNumber),
    };
}

export function buildDefaultBillingForm(
    defaults: CheckoutAccountDefaults,
    defaultAddress?: CheckoutSavedAddress | null,
): CheckoutBillingForm {
    return {
        ...buildEmptyBillingForm(defaults),
        selectedAddressId: defaultAddress?.id ?? 'new',
        updateAddressId: defaultAddress?.id ?? null,
        addressName: defaultAddress?.name || CHECKOUT_BILLING_ADDRESS_NAME,
    };
}

export type CheckoutBillingFieldId =
    | 'addressName'
    | 'firstName'
    | 'lastName'
    | 'addressLine1'
    | 'city'
    | 'state'
    | 'zipCode'
    | 'country'
    | 'emailAddress'
    | 'phoneNumber';

export type CheckoutBillingFieldErrors = Partial<Record<CheckoutBillingFieldId, string>>;

export function getBillingFieldErrors(
    form: CheckoutBillingForm,
    savedAddresses: CheckoutSavedAddress[] = [],
): CheckoutBillingFieldErrors {
    const errors: CheckoutBillingFieldErrors = {};

    if (!form.addressName.trim()) {
        errors.addressName = 'Address name is required.';
    } else if (resolveCheckoutSaveAddressId(form) == null && findDuplicateAddressName(form.addressName, savedAddresses)) {
        errors.addressName = 'An address with this name already exists.';
    }
    if (!form.firstName.trim()) errors.firstName = 'First name is required.';
    if (!form.lastName.trim()) errors.lastName = 'Last name is required.';
    if (!form.addressLine1.trim()) errors.addressLine1 = 'Address is required.';
    if (!form.city.trim()) errors.city = 'City is required.';
    if (!form.state.trim()) errors.state = 'State is required.';
    if (!form.zipCode.trim()) errors.zipCode = 'Zip code is required.';
    if (!form.country.trim()) errors.country = 'Country is required.';

    if (!form.emailAddress.trim()) {
        errors.emailAddress = 'Email address is required.';
    } else if (!isValidCheckoutEmail(form.emailAddress)) {
        errors.emailAddress = 'Enter a valid email address.';
    }

    if (!form.phoneNumber.trim()) errors.phoneNumber = 'Phone number is required.';

    return errors;
}

export function pruneBillingFieldErrors(
    shownErrors: CheckoutBillingFieldErrors,
    form: CheckoutBillingForm,
    savedAddresses: CheckoutSavedAddress[] = [],
): CheckoutBillingFieldErrors {
    if (Object.keys(shownErrors).length === 0) {
        return shownErrors;
    }

    const currentErrors = getBillingFieldErrors(form, savedAddresses);
    const next: CheckoutBillingFieldErrors = {};

    for (const key of Object.keys(shownErrors) as CheckoutBillingFieldId[]) {
        if (currentErrors[key]) {
            next[key] = currentErrors[key];
        }
    }

    return next;
}

export function buildPaymentSummary(form: CheckoutPaymentForm): CheckoutPaymentSummary {
    const digits = form.cardNumber.replace(/\D/g, '');
    return {
        payByTerms: form.payByTerms,
        terms: form.terms,
        cardName: form.cardName,
        cardType: form.cardType,
        cardLast4: digits.slice(-4),
        cardMonth: form.cardMonth,
        cardYear: form.cardYear,
    };
}

export function validatePaymentStep(form: CheckoutPaymentForm, accountIsTerms: boolean): string | null {
    if (accountIsTerms || form.payByTerms) {
        if (!form.terms.trim()) return 'Account terms are not configured.';
        return null;
    }

    if (!form.cardName.trim()) return 'Name on card is required.';

    const cardDigits = normalizeCardDigits(form.cardNumber);
    if (!cardDigits) return 'Card number is required.';

    const inlineCardError = getInlineCardNumberError(form.cardNumber, form.cardType);
    if (inlineCardError) return inlineCardError;

    if (!isSupportedCardType(form.cardType)) {
        return `We only accept ${SUPPORTED_CHECKOUT_CARD_LABELS}.`;
    }
    if (!isValidLuhnCardNumber(cardDigits)) return 'Enter a valid card number.';

    if (!form.cardMonth.trim()) return 'Expiration month is required.';
    if (!form.cardYear.trim()) return 'Expiration year is required.';
    if (!isValidCardExpiry(form.cardMonth, form.cardYear)) return 'Enter a valid expiration date.';

    if (!form.cardCcv.trim()) return 'Security code is required.';
    if (!isValidCardCvv(form.cardCcv, cardDigits, form.cardType)) {
        return form.cardType === 'amex' ? 'Enter a valid 4-digit security code.' : 'Enter a valid 3-digit security code.';
    }

    return null;
}

export type CheckoutShippingFieldId =
    | 'addressName'
    | 'firstName'
    | 'lastName'
    | 'addressLine1'
    | 'city'
    | 'state'
    | 'zipCode'
    | 'country'
    | 'emailAddress'
    | 'phoneNumber'
    | 'expectedDeliveryDate'
    | 'comment';

export type CheckoutShippingFieldErrors = Partial<Record<CheckoutShippingFieldId, string>>;

export function getShippingFieldErrors(
    form: CheckoutShippingForm,
    savedAddresses: CheckoutSavedAddress[] = [],
): CheckoutShippingFieldErrors {
    const errors: CheckoutShippingFieldErrors = {};

    if (!form.addressName.trim()) {
        errors.addressName = 'Address name is required.';
    } else if (resolveCheckoutSaveAddressId(form) == null && findDuplicateAddressName(form.addressName, savedAddresses)) {
        errors.addressName = 'An address with this name already exists.';
    }
    if (!form.firstName.trim()) errors.firstName = 'First name is required.';
    if (!form.lastName.trim()) errors.lastName = 'Last name is required.';
    if (!form.addressLine1.trim()) errors.addressLine1 = 'Address is required.';
    if (!form.city.trim()) errors.city = 'City is required.';
    if (!form.state.trim()) errors.state = 'State is required.';
    if (!form.zipCode.trim()) errors.zipCode = 'Zip code is required.';
    if (!form.country.trim()) errors.country = 'Country is required.';

    const emailError = getShippingEmailError(form);
    if (emailError) errors.emailAddress = emailError;

    if (!form.phoneNumber.trim()) errors.phoneNumber = 'Phone number is required.';
    if (!form.expectedDeliveryDate.trim()) errors.expectedDeliveryDate = 'Expected delivery date is required.';
    if (form.comment.length > CHECKOUT_COMMENT_MAX_LENGTH) {
        errors.comment = `Comment must be ${CHECKOUT_COMMENT_MAX_LENGTH} characters or fewer.`;
    }

    return errors;
}

export function pruneShippingFieldErrors(
    shownErrors: CheckoutShippingFieldErrors,
    form: CheckoutShippingForm,
    savedAddresses: CheckoutSavedAddress[] = [],
): CheckoutShippingFieldErrors {
    if (Object.keys(shownErrors).length === 0) {
        return shownErrors;
    }

    const currentErrors = getShippingFieldErrors(form, savedAddresses);
    const next: CheckoutShippingFieldErrors = {};

    for (const key of Object.keys(shownErrors) as CheckoutShippingFieldId[]) {
        if (currentErrors[key]) {
            next[key] = currentErrors[key];
        }
    }

    return next;
}

export function validateShippingStep(
    form: CheckoutShippingForm,
    savedAddresses: CheckoutSavedAddress[] = [],
): string | null {
    const errors = getShippingFieldErrors(form, savedAddresses);
    const firstError = Object.values(errors)[0];
    return firstError ?? null;
}

export function formatCheckoutCurrency(value: number): string {
    return `$${value.toFixed(2)}`;
}
