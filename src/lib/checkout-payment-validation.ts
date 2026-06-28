import type { CheckoutCardType, SupportedCheckoutCardType } from '@/lib/checkout-types';
import { SUPPORTED_CHECKOUT_CARD_LABELS, SUPPORTED_CHECKOUT_CARD_TYPES } from '@/lib/checkout-types';

export function isSupportedCardType(cardType: CheckoutCardType): cardType is SupportedCheckoutCardType {
    return SUPPORTED_CHECKOUT_CARD_TYPES.includes(cardType as SupportedCheckoutCardType);
}

export function detectCardType(cardNumber: string): CheckoutCardType {
    const digits = normalizeCardDigits(cardNumber);
    if (!digits) {
        return '';
    }

    if (/^3[47]/.test(digits)) {
        return 'amex';
    }

    if (/^4/.test(digits)) {
        return 'visa';
    }

    if (/^5[1-5]/.test(digits) || /^(222[1-9]|22[3-9]\d|2[3-6]\d{2}|27[01]\d|2720)/.test(digits)) {
        return 'mastercard';
    }

    if (/^6(?:011|5|4[4-9]|22)/.test(digits)) {
        return 'discover';
    }

    return '';
}

export function isRecognizedUnsupportedCardPrefix(cardNumber: string): boolean {
    const digits = normalizeCardDigits(cardNumber);
    if (!digits.length || detectCardType(digits)) {
        return false;
    }

    const first = digits[0];
    if (first === '0' || first === '1' || first === '7' || first === '8' || first === '9') {
        return true;
    }

    if (first === '3' && digits.length >= 2 && !/^3[47]/.test(digits)) {
        return true;
    }

    if (first === '5' && digits.length >= 2 && !/^5[1-5]/.test(digits)) {
        return true;
    }

    if (first === '6') {
        if (digits.length >= 2 && !/^6[0245]/.test(digits)) {
            return true;
        }

        if (digits.length >= 3 && /^60/.test(digits) && !/^601/.test(digits)) {
            return true;
        }

        if (digits.length >= 4 && /^601/.test(digits) && !/^6011/.test(digits)) {
            return true;
        }

        if (digits.length >= 3 && /^64/.test(digits) && digits[2] !== '4') {
            return true;
        }

        if (digits.length >= 4 && /^644/.test(digits) && (digits[3] ?? '') < '4') {
            return true;
        }
    }

    if (first === '2' && digits.length >= 4) {
        const prefix4 = Number.parseInt(digits.slice(0, 4), 10);
        if (!Number.isFinite(prefix4) || prefix4 < 2221 || prefix4 > 2720) {
            return true;
        }
    }

    return false;
}

export function getInlineCardNumberError(cardNumber: string, cardType: CheckoutCardType): string | null {
    const digits = normalizeCardDigits(cardNumber);
    if (!digits) {
        return null;
    }

    if (isRecognizedUnsupportedCardPrefix(cardNumber)) {
        return `We only accept ${SUPPORTED_CHECKOUT_CARD_LABELS}.`;
    }

    if (isSupportedCardType(cardType)) {
        const expectedLength = getCardDigitLimit(cardType);
        if (digits.length === expectedLength && !isValidLuhnCardNumber(digits)) {
            return 'Enter a valid card number.';
        }
    }

    return null;
}

export function getCardTypeLabel(cardType: CheckoutCardType): string {
    switch (cardType) {
        case 'visa':
            return 'Visa';
        case 'mastercard':
            return 'Mastercard';
        case 'amex':
            return 'American Express';
        case 'discover':
            return 'Discover';
        default:
            return '';
    }
}

export function getCardTypeDisplayLabel(cardNumber: string, cardType: CheckoutCardType): string {
    if (cardType) {
        return getCardTypeLabel(cardType);
    }

    if (isRecognizedUnsupportedCardPrefix(cardNumber)) {
        return 'Unsupported card';
    }

    return '';
}

export function getCardDigitLimit(cardType: CheckoutCardType): number {
    return cardType === 'amex' ? 15 : 16;
}

export function limitCardDigits(cardNumber: string, cardType: CheckoutCardType): string {
    return normalizeCardDigits(cardNumber).slice(0, getCardDigitLimit(cardType || detectCardType(cardNumber)));
}

export function formatCardNumberDisplay(cardNumber: string, cardType?: CheckoutCardType): string {
    const digits = normalizeCardDigits(cardNumber);
    if (!digits) {
        return '';
    }

    const resolvedType = cardType || detectCardType(digits);

    if (resolvedType === 'amex') {
        const part1 = digits.slice(0, 4);
        const part2 = digits.slice(4, 10);
        const part3 = digits.slice(10, 15);
        return [part1, part2, part3].filter(Boolean).join(' ');
    }

    return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

export function normalizeCardDigits(value: string): string {
    return value.replace(/\D/g, '');
}

export function isValidLuhnCardNumber(value: string): boolean {
    const digits = normalizeCardDigits(value);
    if (digits.length < 13 || digits.length > 19) {
        return false;
    }

    let sum = 0;
    let alternate = false;

    for (let index = digits.length - 1; index >= 0; index -= 1) {
        let digit = Number.parseInt(digits[index] ?? '', 10);
        if (Number.isNaN(digit)) {
            return false;
        }

        if (alternate) {
            digit *= 2;
            if (digit > 9) {
                digit -= 9;
            }
        }

        sum += digit;
        alternate = !alternate;
    }

    return sum % 10 === 0;
}

export function isValidCardExpiry(month: string, year: string): boolean {
    const monthValue = Number.parseInt(month, 10);
    const yearValue = Number.parseInt(year, 10);
    if (!Number.isFinite(monthValue) || monthValue < 1 || monthValue > 12) {
        return false;
    }
    if (!Number.isFinite(yearValue) || yearValue < 2000) {
        return false;
    }

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const expiryMonthStart = new Date(yearValue, monthValue - 1, 1);

    return expiryMonthStart >= currentMonthStart;
}

export function isValidCardCvv(cvv: string, cardNumber: string, cardType?: CheckoutCardType): boolean {
    const cvvDigits = normalizeCardDigits(cvv);
    const cardDigits = normalizeCardDigits(cardNumber);
    const resolvedType = cardType || detectCardType(cardDigits);
    const isAmex = resolvedType === 'amex';

    return isAmex ? cvvDigits.length === 4 : cvvDigits.length === 3;
}
