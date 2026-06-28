'use client';

import type { CheckoutFlowStep, CheckoutFlowStepId } from '@/lib/checkout-types';
import { getCheckoutStepIndex } from '@/lib/checkout-flow';
import { cn } from '@/lib/utils';

type CheckoutStepIndicatorProps = {
    steps: CheckoutFlowStep[];
    currentStep: CheckoutFlowStepId;
    onStepClick?: (step: CheckoutFlowStepId) => void;
};

export function CheckoutStepIndicator({ steps, currentStep, onStepClick }: CheckoutStepIndicatorProps) {
    const currentIndex = getCheckoutStepIndex(steps, currentStep);

    return (
        <nav aria-label="Checkout progress" className="border-b border-[#d1b79a] pb-4">
            <ol className="flex flex-wrap items-center gap-2 sm:gap-4">
                {steps.map((step, index) => {
                    const isActive = step.id === currentStep;
                    const isComplete = index < currentIndex;
                    const canNavigate = onStepClick != null && index < currentIndex;

                    return (
                        <li key={step.id} className="flex items-center gap-2 sm:gap-4">
                            {index > 0 ? (
                                <span className="hidden h-px w-6 bg-[#c49a78] sm:block" aria-hidden />
                            ) : null}
                            {canNavigate ? (
                                <button
                                    type="button"
                                    onClick={() => onStepClick(step.id)}
                                    className={cn(
                                        'inline-flex items-center gap-2 rounded-md px-2 py-1 text-left transition-colors hover:bg-[#f3e0cf]',
                                        isComplete && 'text-[#4a2518]',
                                    )}
                                >
                                    <StepBadge step={index + 1} isActive={isActive} isComplete={isComplete} />
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">{step.label}</span>
                                </button>
                            ) : (
                                <div className="inline-flex items-center gap-2 px-2 py-1">
                                    <StepBadge step={index + 1} isActive={isActive} isComplete={isComplete} />
                                    <span
                                        className={cn(
                                            'text-[11px] font-semibold uppercase tracking-[0.14em]',
                                            isActive ? 'text-[#4a2518]' : 'text-[#8b6b4a]',
                                        )}
                                    >
                                        {step.label}
                                    </span>
                                </div>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}

function StepBadge({
    step,
    isActive,
    isComplete,
}: {
    step: number;
    isActive: boolean;
    isComplete: boolean;
}) {
    return (
        <span
            className={cn(
                'inline-flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold',
                isActive && 'border-[#4a2518] bg-[#4a2518] text-[#fdf7ef]',
                isComplete && !isActive && 'border-[#4a2518] bg-[#f6ebdd] text-[#4a2518]',
                !isActive && !isComplete && 'border-[#c49a78] bg-white text-[#8b6b4a]',
            )}
        >
            {step}
        </span>
    );
}
