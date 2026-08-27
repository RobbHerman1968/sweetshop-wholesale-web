'use client';

import { useEffect, useId, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
            <DialogContent className="border-[#d1b79a] bg-[#fdf7ef] text-[#4a2b1f]">
                <DialogHeader>
                    <DialogTitle className="text-sm font-semibold uppercase tracking-[0.25em] text-[#7c5b44]">{title}</DialogTitle>
                    <DialogDescription className="mt-2 text-xs text-[#7c5b44]">{description}</DialogDescription>
                </DialogHeader>

                {error ? (
                    <p className="mt-3 text-xs text-red-600" role="alert">
                        {error}
                    </p>
                ) : null}
                {info ? (
                    <p className="mt-3 text-xs text-[#5c4032]" role="status">
                        {info}
                    </p>
                ) : null}

                {step === 'email' ? (
                    <form className="mt-4 space-y-3" onSubmit={handleRequestCode}>
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
                    <form className="mt-4 space-y-3" onSubmit={handleVerifyCode}>
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
                        <button
                            type="button"
                            className="w-full rounded-sm text-[11px] uppercase tracking-[0.2em] text-[#a67c52] hover:text-[#4a2b1f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a78] focus-visible:ring-offset-2 disabled:opacity-60"
                            disabled={isLoading}
                            onClick={() => {
                                void (async () => {
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
                                })();
                            }}
                        >
                            Resend code
                        </button>
                    </form>
                ) : null}

                {step === 'password' ? (
                    <form className="mt-4 space-y-3" onSubmit={handleSetPassword}>
                        <div className="space-y-1">
                            <Label htmlFor={passwordFieldId}>New password</Label>
                            <Input
                                id={passwordFieldId}
                                type="password"
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
                            <Input
                                id={confirmPasswordFieldId}
                                type="password"
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
                    <Button type="button" className="mt-4 w-full" onClick={goBackToLogin}>
                        Back to login
                    </Button>
                ) : (
                    <button
                        type="button"
                        className="mt-3 rounded-sm text-[11px] uppercase tracking-[0.2em] text-[#a67c52] hover:text-[#4a2b1f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a78] focus-visible:ring-offset-2"
                        onClick={goBackToLogin}
                    >
                        Back to login
                    </button>
                )}
            </DialogContent>
        </Dialog>
    );
}
