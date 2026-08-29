'use client';

import { useId, useRef, useState } from 'react';
import { Check, Paperclip, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { formatPhoneDisplay, normalizePhoneDigits, US_STATE_OPTIONS } from '@/lib/checkout-utils';
import { submitWholesaleApplication } from '@/lib/wholesale-application-actions';
import {
    APPLICATION_ATTACHMENT_ACCEPT,
    validateApplicationAttachment,
} from '@/lib/wholesale-application-attachment';
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
                <Alert variant="destructive" className="px-3 py-2" id={errorId}>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            ) : null}
        </div>
    );
}

export function WholesaleApplicationForm({ className, onSubmitted }: WholesaleApplicationFormProps) {
    const formId = useId();
    const attachmentInputRef = useRef<HTMLInputElement>(null);
    const [form, setForm] = useState<WholesaleApplicationInput>(EMPTY_FORM);
    const [attachment, setAttachment] = useState<File | null>(null);
    const [attachmentError, setAttachmentError] = useState<string | null>(null);
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

        const attachmentCheck = validateApplicationAttachment(attachment);
        if (!attachmentCheck.ok) {
            setAttachmentError(attachmentCheck.error);
            return;
        }

        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.set('businessName', parsed.data.businessName);
            formData.set('taxId', parsed.data.taxId);
            formData.set('contactFirstName', parsed.data.contactFirstName);
            formData.set('contactLastName', parsed.data.contactLastName);
            formData.set('billingAddress1', parsed.data.billingAddress1);
            formData.set('billingAddress2', parsed.data.billingAddress2 ?? '');
            formData.set('city', parsed.data.city);
            formData.set('state', parsed.data.state);
            formData.set('zipCode', parsed.data.zipCode);
            formData.set('phone', parsed.data.phone);
            formData.set('fax', parsed.data.fax ?? '');
            formData.set('email', parsed.data.email);
            if (attachment) {
                formData.set('attachment', attachment);
            }

            const result = await submitWholesaleApplication(formData);
            if (!result.ok) {
                if (result.fieldErrors) {
                    setFieldErrors(result.fieldErrors);
                }
                setSubmitError(result.error ?? 'Unable to submit your application. Please try again.');
                return;
            }

            setForm(EMPTY_FORM);
            setAttachment(null);
            setAttachmentError(null);
            if (attachmentInputRef.current) {
                attachmentInputRef.current.value = '';
            }
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
            <Card className={cn('p-6 sm:p-8', className)}>
                <CardHeader className="items-center p-0 text-center">
                    <div className="flex size-12 items-center justify-center rounded-full bg-[#4a2518]/10 text-[#4a2518]">
                        <Check className="size-6" strokeWidth={2} aria-hidden />
                    </div>
                    <CardTitle className="pt-2">Request received</CardTitle>
                    <CardDescription className="text-sm text-[#5c4032]">
                        Thank you for applying. We will review your request and email login credentials within 2 business days.
                    </CardDescription>
                </CardHeader>
            </Card>
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
    const attachmentId = `${formId}-attachment`;

    function handleAttachmentChange(file: File | null) {
        if (!file) {
            setAttachment(null);
            setAttachmentError(null);
            if (attachmentInputRef.current) {
                attachmentInputRef.current.value = '';
            }
            return;
        }

        const check = validateApplicationAttachment(file);
        if (!check.ok) {
            setAttachment(null);
            setAttachmentError(check.error);
            if (attachmentInputRef.current) {
                attachmentInputRef.current.value = '';
            }
            return;
        }

        setAttachment(file);
        setAttachmentError(null);
    }

    return (
        <Card className={className}>
            <form onSubmit={handleSubmit} noValidate>
            <CardHeader className="border-b border-[#d1b79a]/50">
                <CardTitle>Account request</CardTitle>
                <CardDescription>
                    Complete the form below to request wholesale access. Fields marked with <span className="text-[#a67c52]">*</span> are required.
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-8 pt-6">
            {submitError ? (
                <Alert variant="destructive">
                    <AlertDescription>{submitError}</AlertDescription>
                </Alert>
            ) : null}
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
                        <div className="space-y-4">
                            <FormField id={taxIdFieldId} label="Tax ID / Reseller permit #" required error={fieldErrors.taxId}>
                                <Input
                                    id={taxIdFieldId}
                                    value={form.taxId}
                                    onChange={(e) => updateField('taxId', e.target.value)}
                                    className={inputClass('taxId')}
                                    aria-invalid={fieldErrors.taxId ? true : undefined}
                                />
                            </FormField>
                            <FormField id={attachmentId} label="Reseller permit or tax certificate" error={attachmentError ?? undefined}>
                                <input
                                    ref={attachmentInputRef}
                                    id={attachmentId}
                                    type="file"
                                    accept={APPLICATION_ATTACHMENT_ACCEPT}
                                    className="sr-only"
                                    onChange={(e) => handleAttachmentChange(e.target.files?.[0] ?? null)}
                                />
                                <div className="flex flex-wrap items-center gap-3">
                                    <Button
                                        type="button"
                                        variant="sweet"
                                        onClick={() => attachmentInputRef.current?.click()}
                                    >
                                        <Paperclip className="mr-2 size-3.5" aria-hidden />
                                        {attachment ? 'Replace file' : 'Choose file'}
                                    </Button>
                                    {attachment ? (
                                        <div className="flex min-w-0 items-center gap-2 text-sm text-[#4a2b1f]">
                                            <span className="truncate">{attachment.name}</span>
                                            <span className="shrink-0 text-[#8a7264]">
                                                ({attachment.size < 1024 * 1024
                                                    ? `${Math.max(1, Math.round(attachment.size / 1024))} KB`
                                                    : `${(attachment.size / (1024 * 1024)).toFixed(1)} MB`}
                                                )
                                            </span>
                                            <button
                                                type="button"
                                                className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-[#8a7264] hover:bg-[#f3e0cf] hover:text-[#4a2518]"
                                                onClick={() => handleAttachmentChange(null)}
                                                aria-label="Remove file"
                                            >
                                                <X className="size-3.5" aria-hidden />
                                            </button>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-[#8a7264]">PDF, JPG, PNG, or WebP · up to 8 MB</p>
                                    )}
                                </div>
                            </FormField>
                        </div>
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
                                <Select
                                    value={form.state || undefined}
                                    onValueChange={(value) => updateField('state', value)}
                                >
                                    <SelectTrigger
                                        id={stateId}
                                        className={cn(
                                            'border-[#d1b79a] bg-white text-sm font-normal normal-case tracking-normal text-[#4a2b1f] shadow-none',
                                            inputClass('state'),
                                        )}
                                        aria-invalid={fieldErrors.state ? true : undefined}
                                    >
                                        <SelectValue placeholder="Select state" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {US_STATE_OPTIONS.map((state) => (
                                            <SelectItem key={state.abbr} value={state.abbr} className="normal-case">
                                                {state.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
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
                                inputMode="numeric"
                                value={formatPhoneDisplay(form.phone)}
                                onChange={(e) => updateField('phone', normalizePhoneDigits(e.target.value))}
                                className={inputClass('phone')}
                                aria-invalid={fieldErrors.phone ? true : undefined}
                                autoComplete="tel"
                                placeholder="(xxx)-xxx-xxxx"
                            />
                        </FormField>
                        <FormField id={faxId} label="Fax number" error={fieldErrors.fax}>
                            <Input
                                id={faxId}
                                type="tel"
                                inputMode="numeric"
                                value={formatPhoneDisplay(form.fax ?? '')}
                                onChange={(e) => updateField('fax', normalizePhoneDigits(e.target.value))}
                                className={inputClass('fax')}
                                autoComplete="tel-extension"
                                placeholder="(xxx)-xxx-xxxx (optional)"
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
            </CardContent>

            <Separator className="mx-6 w-auto" />

            <CardFooter className="flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[11px] leading-relaxed text-[#8a7264]">
                    By submitting, you confirm the information provided is accurate for wholesale account review.
                </p>
                <Button type="submit" variant="primary" className="shrink-0 sm:min-w-40" disabled={isLoading} aria-busy={isLoading}>
                    {isLoading ? 'Submitting…' : 'Submit request'}
                </Button>
            </CardFooter>
            </form>
        </Card>
    );
}
