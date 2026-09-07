import {
    FIXED_SHIPPING_AMOUNT_SETTING_ID,
    FIXED_SHIPPING_PERCENT_SETTING_ID,
} from '@/lib/site-setting-constants';

export { FIXED_SHIPPING_AMOUNT_SETTING_ID, FIXED_SHIPPING_PERCENT_SETTING_ID };

export type CheckoutStateShippingRate = {
    stateAbbr: string;
    shippingRate: number;
    taxRate: number;
};

export type CheckoutShippingOptions = {
    fixedShippingAmount: number | null;
    fixedShippingPercent: number | null;
    isSkipShipping: boolean;
    isFreeGroundShipping: boolean;
    isSkipTax: boolean;
    stateShippingRates: CheckoutStateShippingRate[];
};

function roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
}

function findStateRate(stateAbbr: string, rates: CheckoutStateShippingRate[]): CheckoutStateShippingRate | undefined {
    const normalized = stateAbbr.trim().toUpperCase();
    if (!normalized) {
        return undefined;
    }

    return rates.find((rate) => rate.stateAbbr.trim().toUpperCase() === normalized);
}

export function lookupStateShippingRate(stateAbbr: string, rates: CheckoutStateShippingRate[]): number {
    return findStateRate(stateAbbr, rates)?.shippingRate ?? 0;
}

export function lookupStateTaxRate(stateAbbr: string, rates: CheckoutStateShippingRate[]): number {
    return findStateRate(stateAbbr, rates)?.taxRate ?? 0;
}

/**
 * Shipping is always a percent of the subtotal (never free from these thresholds).
 * Under Fixed Shipping Amount → Fixed Shipping Percent.
 * At/above Fixed Shipping Amount → state shippingRate.
 * Account skip-shipping / free-ground flags still force $0.
 */
export function calculateCheckoutShippingCost(params: {
    subTotal: number;
    shipToState: string;
    fixedShippingAmount: number | null;
    fixedShippingPercent: number | null;
    isSkipShipping: boolean;
    isFreeGroundShipping: boolean;
    stateShippingRates: CheckoutStateShippingRate[];
}): number {
    if (params.isSkipShipping || params.isFreeGroundShipping) {
        return 0;
    }

    const amount = params.fixedShippingAmount;
    const useFixedPercent = amount != null && params.subTotal < amount;

    if (useFixedPercent) {
        const rate = params.fixedShippingPercent ?? 0;
        return roundMoney(params.subTotal * rate);
    }

    const rate = lookupStateShippingRate(params.shipToState, params.stateShippingRates);
    return roundMoney(params.subTotal * rate);
}

/** Wholesale orders do not charge sales tax (matches legacy wholesale behavior). */
export function calculateCheckoutTax(_params: {
    subTotal: number;
    shipToState: string;
    isSkipTax: boolean;
    stateShippingRates: CheckoutStateShippingRate[];
}): number {
    return 0;
}

export function calculateCheckoutEstimatedTotal(
    subTotal: number,
    tax: number,
    discounts: number,
    shipping: number,
): number {
    return roundMoney(subTotal - discounts + tax + shipping);
}
