'use client';

import { useId, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { submitWholesaleApplication } from '@/lib/wholesale-application-actions';
import {
    wholesaleApplicationSchema,
    type WholesaleApplicationField,
    type WholesaleApplicationInput,
} from '@/lib/validations/wholesale-application';
import { cn } from '@/lib/utils';

const EMPTY_FORM: WholesaleApplicationInput = {
    businessName: '',
    taxId: '',
    contactFirstName: '',
    contactLastName: '',
    billingAddress1: '',
    billingAddress2: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    fax: '',
    email: '',
};

type WholesaleApplicationFormProps = {
    className?: string;
    onSubmitted?: () => void;
};

const sectionTitleClass = 'text-[11px] font-semibold uppercase tracking-[0.3em] text-[#5c4032]';

function FormSection({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
    return (
        <section className={cn('space-y-4', className)}>
            <h3 className={sectionTitleClass}>{title}</h3>
            {children}
        </section>
    );
}

function FormField({
    id,
    label,
    required,
    error,
    children,
    className,
}: {
    id: string;
    label: string;
    required?: boolean;
    error?: string;
    children: React.ReactNode;
    className?: string;
}) {
    const errorId = `${id}-error`;

    return (
        <div className={cn('space-y-1.5', className)}>
            <Label htmlFor={id}>
                {label}
                {required ? <span className="text-[#a67c52]"> *</span> : null}
            </Label>
            {children}
            {error ? (
                <p id={errorId} className="text-xs text-red-600" role="alert">
                    {error}
                </p>
            ) : null}
        </div>
    );
}

export function WholesaleApplicationForm({ className, onSubmitted }: WholesaleApplicationFormProps) {
    const formId = useId();
    const [form, setForm] = useState<WholesaleApplicationInput>(EMPTY_FORM);
    const [fieldErrors, setFieldErrors] = useState<Partial<Record<WholesaleApplicationField, string>>>({});
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    function updateField<K extends WholesaleApplicationField>(key: K, value: WholesaleApplicationInput[K]) {
        setForm((prev) => ({ ...prev, [key]: value }));
        setFieldErrors((prev) => {
            if (!prev[key]) return prev;
            const next = { ...prev };
            delete next[key];
            return next;
        });
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSubmitError(null);

        const parsed = wholesaleApplicationSchema.safeParse(form);
        if (!parsed.success) {
            const nextErrors: Partial<Record<WholesaleApplicationField, string>> = {};
            for (const issue of parsed.error.issues) {
                const path = issue.path[0];
                if (typeof path === 'string' && !nextErrors[path as WholesaleApplicationField]) {
                    nextErrors[path as WholesaleApplicationField] = issue.message;
                }
            }
            setFieldErrors(nextErrors);
            return;
        }

        setIsLoading(true);
        try {
            const result = await submitWholesaleApplication(parsed.data);
            if (!result.ok) {
                if (result.fieldErrors) {
                    setFieldErrors(result.fieldErrors);
                }
                setSubmitError(result.error ?? 'Unable to submit your application. Please try again.');
                return;
            }

            setForm(EMPTY_FORM);
            setFieldErrors({});
            setIsSubmitted(true);
            onSubmitted?.();
        } catch {
            setSubmitError('Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }

    const inputClass = (field: WholesaleApplicationField) =>
        cn(fieldErrors[field] ? 'border-red-500 focus:ring-red-200' : undefined);

    if (isSubmitted) {
        return (
            <div className={cn('rounded-2xl border border-[#b89572] bg-[#fdf7ef] p-6 sm:p-8', className)}>
                <div className="mx-auto max-w-md text-center">
                    <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#4a2518]/10 text-[#4a2518]">
                        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <h2 className="mt-5 text-sm font-semibold uppercase tracking-[0.25em] text-[#7c5b44]">Request received</h2>
                    <p className="mt-3 text-sm leading-relaxed text-[#5c4032]">
                        Thank you for applying. We will review your request and email login credentials within 2 business days.
                    </p>
                    <Button type="button" variant="outline" className="mt-6" onClick={() => setIsSubmitted(false)}>
                        Submit another request
                    </Button>
                </div>
            </div>
        );
    }

    const businessNameId = `${formId}-business-name`;
    const taxIdFieldId = `${formId}-tax-id`;
    const firstNameId = `${formId}-first-name`;
    const lastNameId = `${formId}-last-name`;
    const address1Id = `${formId}-address-1`;
    const address2Id = `${formId}-address-2`;
    const cityId = `${formId}-city`;
    const stateId = `${formId}-state`;
    const zipId = `${formId}-zip`;
    const phoneId = `${formId}-phone`;
    const faxId = `${formId}-fax`;
    const emailId = `${formId}-email`;

    return (
        <form
            className={cn('rounded-2xl border border-[#b89572] bg-[#fdf7ef] p-6 sm:p-8', className)}
            onSubmit={handleSubmit}
            noValidate
        >
            <header className="border-b border-[#d1b79a]/50 pb-6">
                <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-[#7c5b44]">Account request</h2>
                <p className="mt-2 text-xs leading-relaxed text-[#8a7264]">
                    Complete the form below to request wholesale access. Fields marked with <span className="text-[#a67c52]">*</span> are required.
                </p>
            </header>

            {submitError ? (
                <p className="mt-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
                    {submitError}
                </p>
            ) : null}

            <div className="mt-6 space-y-8">
                <FormSection title="Business information">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <FormField id={businessNameId} label="Business name" required error={fieldErrors.businessName}>
                            <Input
                                id={businessNameId}
                                value={form.businessName}
                                onChange={(e) => updateField('businessName', e.target.value)}
                                className={inputClass('businessName')}
                                aria-invalid={fieldErrors.businessName ? true : undefined}
                                autoComplete="organization"
                            />
                        </FormField>
                        <FormField id={taxIdFieldId} label="Tax ID / Reseller permit #" required error={fieldErrors.taxId}>
                            <Input
                                id={taxIdFieldId}
                                value={form.taxId}
                                onChange={(e) => updateField('taxId', e.target.value)}
                                className={inputClass('taxId')}
                                aria-invalid={fieldErrors.taxId ? true : undefined}
                            />
                        </FormField>
                    </div>
                </FormSection>

                <FormSection title="Primary contact">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <FormField id={firstNameId} label="First name" required error={fieldErrors.contactFirstName}>
                            <Input
                                id={firstNameId}
                                value={form.contactFirstName}
                                onChange={(e) => updateField('contactFirstName', e.target.value)}
                                className={inputClass('contactFirstName')}
                                aria-invalid={fieldErrors.contactFirstName ? true : undefined}
                                autoComplete="given-name"
                            />
                        </FormField>
                        <FormField id={lastNameId} label="Last name" required error={fieldErrors.contactLastName}>
                            <Input
                                id={lastNameId}
                                value={form.contactLastName}
                                onChange={(e) => updateField('contactLastName', e.target.value)}
                                className={inputClass('contactLastName')}
                                aria-invalid={fieldErrors.contactLastName ? true : undefined}
                                autoComplete="family-name"
                            />
                        </FormField>
                    </div>
                </FormSection>

                <FormSection title="Billing address">
                    <div className="space-y-4">
                        <FormField id={address1Id} label="Street address" required error={fieldErrors.billingAddress1}>
                            <Input
                                id={address1Id}
                                value={form.billingAddress1}
                                onChange={(e) => updateField('billingAddress1', e.target.value)}
                                className={inputClass('billingAddress1')}
                                aria-invalid={fieldErrors.billingAddress1 ? true : undefined}
                                autoComplete="address-line1"
                            />
                        </FormField>
                        <FormField id={address2Id} label="Address line 2">
                            <Input
                                id={address2Id}
                                value={form.billingAddress2 ?? ''}
                                onChange={(e) => updateField('billingAddress2', e.target.value)}
                                autoComplete="address-line2"
                                placeholder="Suite, unit, etc. (optional)"
                            />
                        </FormField>
                        <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1.2fr]">
                            <FormField id={cityId} label="City" required error={fieldErrors.city}>
                                <Input
                                    id={cityId}
                                    value={form.city}
                                    onChange={(e) => updateField('city', e.target.value)}
                                    className={inputClass('city')}
                                    aria-invalid={fieldErrors.city ? true : undefined}
                                    autoComplete="address-level2"
                                />
                            </FormField>
                            <FormField id={stateId} label="State" required error={fieldErrors.state}>
                                <Input
                                    id={stateId}
                                    value={form.state}
                                    onChange={(e) => updateField('state', e.target.value)}
                                    className={inputClass('state')}
                                    aria-invalid={fieldErrors.state ? true : undefined}
                                    autoComplete="address-level1"
                                />
                            </FormField>
                            <FormField id={zipId} label="Zip code" required error={fieldErrors.zipCode}>
                                <Input
                                    id={zipId}
                                    value={form.zipCode}
                                    onChange={(e) => updateField('zipCode', e.target.value)}
                                    className={inputClass('zipCode')}
                                    aria-invalid={fieldErrors.zipCode ? true : undefined}
                                    autoComplete="postal-code"
                                />
                            </FormField>
                        </div>
                    </div>
                </FormSection>

                <FormSection title="Contact details">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <FormField id={phoneId} label="Phone number" required error={fieldErrors.phone}>
                            <Input
                                id={phoneId}
                                type="tel"
                                value={form.phone}
                                onChange={(e) => updateField('phone', e.target.value)}
                                className={inputClass('phone')}
                                aria-invalid={fieldErrors.phone ? true : undefined}
                                autoComplete="tel"
                            />
                        </FormField>
                        <FormField id={faxId} label="Fax number">
                            <Input
                                id={faxId}
                                type="tel"
                                value={form.fax ?? ''}
                                onChange={(e) => updateField('fax', e.target.value)}
                                autoComplete="tel-extension"
                                placeholder="Optional"
                            />
                        </FormField>
                        <FormField id={emailId} label="Email address" required error={fieldErrors.email} className="sm:col-span-2">
                            <Input
                                id={emailId}
                                type="email"
                                value={form.email}
                                onChange={(e) => updateField('email', e.target.value)}
                                className={inputClass('email')}
                                aria-invalid={fieldErrors.email ? true : undefined}
                                autoComplete="email"
                            />
                        </FormField>
                    </div>
                </FormSection>
            </div>

            <div className="mt-8 flex flex-col gap-3 border-t border-[#d1b79a]/50 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[11px] leading-relaxed text-[#8a7264]">
                    By submitting, you confirm the information provided is accurate for wholesale account review.
                </p>
                <Button type="submit" variant="primary" className="shrink-0 sm:min-w-40" disabled={isLoading} aria-busy={isLoading}>
                    {isLoading ? 'Submitting…' : 'Submit request'}
                </Button>
            </div>
        </form>
    );
}
