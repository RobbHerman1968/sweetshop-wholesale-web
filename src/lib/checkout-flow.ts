import type { CheckoutFlowStep, CheckoutFlowStepId } from '@/lib/checkout-types';

export function checkoutNeedsBillingStep(isShippingBillingAddress: boolean): boolean {
    return !isShippingBillingAddress;
}

export function getCheckoutFlowSteps(includeBilling: boolean): CheckoutFlowStep[] {
    const steps: CheckoutFlowStep[] = [{ id: 'shipping', label: 'Shipping' }];
    if (includeBilling) {
        steps.push({ id: 'billing', label: 'Billing' });
    }
    steps.push({ id: 'payment', label: 'Payment' }, { id: 'review', label: 'Review' });
    return steps;
}

export function getCheckoutStepIndex(steps: CheckoutFlowStep[], stepId: CheckoutFlowStepId): number {
    return steps.findIndex((step) => step.id === stepId);
}

export function getNextCheckoutStep(steps: CheckoutFlowStep[], stepId: CheckoutFlowStepId): CheckoutFlowStepId | null {
    const index = getCheckoutStepIndex(steps, stepId);
    if (index < 0 || index >= steps.length - 1) {
        return null;
    }
    return steps[index + 1].id;
}

export function getPreviousCheckoutStep(steps: CheckoutFlowStep[], stepId: CheckoutFlowStepId): CheckoutFlowStepId | null {
    const index = getCheckoutStepIndex(steps, stepId);
    if (index <= 0) {
        return null;
    }
    return steps[index - 1].id;
}

export function isCheckoutReviewStep(stepId: CheckoutFlowStepId): boolean {
    return stepId === 'review';
}
