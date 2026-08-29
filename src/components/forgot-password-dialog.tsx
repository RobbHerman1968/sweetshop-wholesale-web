'use client';

import { useEffect, useId, useState } from 'react';
import { X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import {
    completePasswordReset,
    requestPasswordResetCode,
    verifyPasswordResetCode,
} from '@/lib/db-pg/actions/password-reset';

type ForgotPasswordDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onBackToLogin?: () => void;
};

type Step = 'email' | 'code' | 'password' | 'done';

export function ForgotPasswordDialog({ open, onOpenChange, onBackToLogin }: ForgotPasswordDialogProps) {
    const emailFieldId = useId();
    const codeFieldId = useId();
    const passwordFieldId = useId();
    const confirmPasswordFieldId = useId();

    const [step, setStep] = useState<Step>('email');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!open) {
            setStep('email');
            setEmail('');
            setCode('');
            setPassword('');
            setConfirmPassword('');
            setError(null);
            setInfo(null);
            setIsLoading(false);
        }
    }, [open]);

    async function handleRequestCode(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setInfo(null);
        setIsLoading(true);

        const result = await requestPasswordResetCode(email);
        setIsLoading(false);

        if (!result.ok) {
            setError(result.error);
            return;
        }

        setInfo(result.message);
        setStep('code');
    }

    async function handleVerifyCode(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setInfo(null);
        setIsLoading(true);

        const result = await verifyPasswordResetCode(email, code);
        setIsLoading(false);

        if (!result.ok) {
            setError(result.error);
            return;
        }

        setInfo(result.message);
        setStep('password');
    }

    async function handleSetPassword(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setInfo(null);
        setIsLoading(true);

        const result = await completePasswordReset({
            email,
            code,
            password,
            confirmPassword,
        });
        setIsLoading(false);

        if (!result.ok) {
            setError(result.error);
            return;
        }

        setInfo(result.message);
        setStep('done');
    }

    async function handleResendCode() {
        setError(null);
        setInfo(null);
        setIsLoading(true);
        const result = await requestPasswordResetCode(email);
        setIsLoading(false);
        if (!result.ok) {
            setError(result.error);
            return;
        }
        setInfo(result.message);
    }

    function goBackToLogin() {
        onOpenChange(false);
        onBackToLogin?.();
    }

    const title =
        step === 'email'
            ? 'Reset Password'
            : step === 'code'
              ? 'Enter Reset Code'
              : step === 'password'
                ? 'Choose New Password'
                : 'Password Updated';

    const description =
        step === 'email'
            ? "Enter the email associated with your wholesale account and we'll send you a 6-digit reset code."
            : step === 'code'
              ? `Enter the 6-digit code we sent to ${email.trim() || 'your email'}.`
              : step === 'password'
                ? 'Create a new password for your account. You do not need your old password.'
                : 'Your password has been updated. Sign in with your new password.';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                hideCloseButton
                className="gap-0 overflow-hidden border-[#d1b79a] bg-[#fdf7ef] p-0 pt-0 text-[#4a2b1f] sm:max-w-md"
            >
                <DialogClose
                    type="button"
                    className="absolute right-2 top-2 z-10 inline-flex size-9 items-center justify-center rounded-md text-[#5c4032] opacity-80 ring-offset-white transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a78] focus-visible:ring-offset-2"
                    aria-label="Close dialog"
                >
                    <X className="size-4" strokeWidth={1.75} aria-hidden />
                </DialogClose>
                <DialogHeader className="space-y-2 border-b border-[#d1b79a] bg-[#f3e0cf] px-6 py-4 pr-14">
                    <DialogTitle className="text-sm font-semibold uppercase tracking-[0.25em] text-[#7c5b44]">{title}</DialogTitle>
                    <DialogDescription className="text-xs text-[#7c5b44]">{description}</DialogDescription>
                </DialogHeader>

                {error ? (
                    <div className="px-6 pt-3">
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    </div>
                ) : null}
                {info ? (
                    <div className="px-6 pt-3">
                        <Alert>
                            <AlertDescription>{info}</AlertDescription>
                        </Alert>
                    </div>
                ) : null}

                {step === 'email' ? (
                    <form className="space-y-3 px-6 pt-3" onSubmit={handleRequestCode}>
                        <div className="space-y-1">
                            <Label htmlFor={emailFieldId}>Email</Label>
                            <Input
                                id={emailFieldId}
                                type="email"
                                name="email"
                                autoComplete="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <Button type="submit" className="mt-2 w-full" disabled={isLoading} aria-busy={isLoading}>
                            {isLoading ? 'Sending…' : 'Send reset code'}
                        </Button>
                    </form>
                ) : null}

                {step === 'code' ? (
                    <form className="space-y-3 px-6 pt-3" onSubmit={handleVerifyCode}>
                        <div className="space-y-1">
                            <Label htmlFor={codeFieldId}>6-digit code</Label>
                            <Input
                                id={codeFieldId}
                                type="text"
                                name="code"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                placeholder="123456"
                                maxLength={6}
                                value={code}
                                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                required
                            />
                        </div>
                        <Button type="submit" className="mt-2 w-full" disabled={isLoading || code.length !== 6} aria-busy={isLoading}>
                            {isLoading ? 'Verifying…' : 'Verify code'}
                        </Button>
                    </form>
                ) : null}

                {step === 'password' ? (
                    <form className="space-y-3 px-6 pt-3" onSubmit={handleSetPassword}>
                        <div className="space-y-1">
                            <Label htmlFor={passwordFieldId}>New password</Label>
                            <PasswordInput
                                id={passwordFieldId}
                                name="password"
                                autoComplete="new-password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor={confirmPasswordFieldId}>Confirm new password</Label>
                            <PasswordInput
                                id={confirmPasswordFieldId}
                                name="confirmPassword"
                                autoComplete="new-password"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>
                        <Button type="submit" className="mt-2 w-full" disabled={isLoading} aria-busy={isLoading}>
                            {isLoading ? 'Updating…' : 'Update password'}
                        </Button>
                    </form>
                ) : null}

                {step === 'done' ? (
                    <div className="px-6 pt-3 pb-6">
                        <Button type="button" className="w-full" onClick={goBackToLogin}>
                            Back to login
                        </Button>
                    </div>
                ) : (
                    <DialogFooter className="flex-col gap-3 px-6 pt-4 pb-6 sm:flex-col sm:justify-center">
                        {step === 'code' ? (
                            <Button
                                type="button"
                                variant="outline"
                                className="text-[#4a2518]"
                                disabled={isLoading}
                                onClick={() => void handleResendCode()}
                            >
                                Resend code
                            </Button>
                        ) : null}
                        <Button type="button" variant="outline" className="text-[#4a2518]" onClick={goBackToLogin}>
                            Back to login
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}
