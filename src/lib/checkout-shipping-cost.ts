/** Site setting id for the order subtotal above which ground shipping is free. */
export const FREE_SHIPPING_THRESHOLD_SETTING_ID = 1;

export type CheckoutStateShippingRate = {
    stateAbbr: string;
    shippingRate: number;
    taxRate: number;
};

export type CheckoutShippingOptions = {
    freeShippingThreshold: number | null;
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

/** Shipping is a percent of the subtotal. It is $0 when the account skips shipping, has free ground, or subtotal exceeds the threshold. */
export function calculateCheckoutShippingCost(params: {
    subTotal: number;
    shipToState: string;
    freeShippingThreshold: number | null;
    isSkipShipping: boolean;
    isFreeGroundShipping: boolean;
    stateShippingRates: CheckoutStateShippingRate[];
}): number {
    if (params.isSkipShipping || params.isFreeGroundShipping) {
        return 0;
    }

    if (params.freeShippingThreshold != null && params.subTotal > params.freeShippingThreshold) {
        return 0;
    }

    const rate = lookupStateShippingRate(params.shipToState, params.stateShippingRates);
    return roundMoney(params.subTotal * rate);
}

/** Tax is based on the ship-to state rate applied to the subtotal. */
export function calculateCheckoutTax(params: {
    subTotal: number;
    shipToState: string;
    isSkipTax: boolean;
    stateShippingRates: CheckoutStateShippingRate[];
}): number {
    if (params.isSkipTax) {
        return 0;
    }

    const rate = lookupStateTaxRate(params.shipToState, params.stateShippingRates);
    return roundMoney(params.subTotal * rate);
}

export function calculateCheckoutEstimatedTotal(
    subTotal: number,
    tax: number,
    discounts: number,
    shipping: number,
): number {
    return roundMoney(subTotal - discounts + tax + shipping);
}
