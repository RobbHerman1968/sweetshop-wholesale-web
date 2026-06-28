'use client';

import { Fragment, type ComponentPropsWithoutRef } from 'react';
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
    const currentStepLabel = steps[currentIndex]?.label ?? '';

    return (
        <nav aria-label="Checkout progress" className="border-b border-[#d1b79a] pb-4">
            {/* Mobile: current step headline + connected progress rail */}
            <div className="space-y-3 sm:hidden">
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                        Step {currentIndex + 1} of {steps.length}
                    </p>
                    <p className="mt-0.5 text-lg font-bold uppercase tracking-[0.12em] text-[#4a2518]">
                        {currentStepLabel}
                    </p>
                </div>

                <ol className="flex w-full min-w-0 list-none items-center p-0">
                    {steps.map((step, index) => {
                        const isActive = step.id === currentStep;
                        const isComplete = index < currentIndex;
                        const canNavigate = onStepClick != null && index < currentIndex;
                        const lineComplete = index > 0 && index <= currentIndex;

                        return (
                            <Fragment key={step.id}>
                                {index > 0 ? (
                                    <li
                                        className={cn(
                                            'h-0.5 min-w-2 flex-1 rounded-full',
                                            lineComplete ? 'bg-[#4a2518]' : 'bg-[#e3cbb0]',
                                        )}
                                        aria-hidden
                                    />
                                ) : null}
                                <li className="shrink-0">
                                    {canNavigate ? (
                                        <button
                                            type="button"
                                            onClick={() => onStepClick(step.id)}
                                            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a78] focus-visible:ring-offset-2"
                                            aria-label={`Go back to ${step.label}`}
                                        >
                                            <StepBadge
                                                step={index + 1}
                                                isActive={isActive}
                                                isComplete={isComplete}
                                            />
                                        </button>
                                    ) : (
                                        <StepBadge
                                            step={index + 1}
                                            isActive={isActive}
                                            isComplete={isComplete}
                                            aria-current={isActive ? 'step' : undefined}
                                            aria-label={step.label}
                                        />
                                    )}
                                </li>
                            </Fragment>
                        );
                    })}
                </ol>

                {currentIndex > 0 && onStepClick ? (
                    <div className="flex flex-wrap gap-2">
                        {steps.slice(0, currentIndex).map((step) => (
                            <button
                                key={step.id}
                                type="button"
                                onClick={() => onStepClick(step.id)}
                                className="rounded-full border border-[#c49a78] bg-[#fdf7ef] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#4a2518] transition-colors hover:bg-[#f3e0cf]"
                            >
                                ← {step.label}
                            </button>
                        ))}
                    </div>
                ) : null}
            </div>

            {/* Desktop / tablet: full labeled stepper */}
            <ol className="hidden list-none flex-wrap items-center gap-2 p-0 sm:flex sm:gap-4">
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
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">
                                        {step.label}
                                    </span>
                                </button>
                            ) : (
                                <div className="inline-flex items-center gap-2 px-2 py-1">
                                    <StepBadge
                                        step={index + 1}
                                        isActive={isActive}
                                        isComplete={isComplete}
                                        aria-current={isActive ? 'step' : undefined}
                                    />
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
    ...props
}: {
    step: number;
    isActive: boolean;
    isComplete: boolean;
} & ComponentPropsWithoutRef<'span'>) {
    return (
        <span
            className={cn(
                'inline-flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold',
                isActive && 'border-[#4a2518] bg-[#4a2518] text-[#fdf7ef]',
                isComplete && !isActive && 'border-[#4a2518] bg-[#f6ebdd] text-[#4a2518]',
                !isActive && !isComplete && 'border-[#c49a78] bg-white text-[#8b6b4a]',
            )}
            {...props}
        >
            {step}
        </span>
    );
}
