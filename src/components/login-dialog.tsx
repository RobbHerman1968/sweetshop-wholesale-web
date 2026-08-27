'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { X } from 'lucide-react';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ForgotPasswordDialog } from '@/components/forgot-password-dialog';
import { clearWholesaleShopAsSelection } from '@/lib/wholesale-account-switcher-actions';
import { loginSchema } from '@/lib/validations/auth';

type LoginDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
    const router = useRouter();
    const emailErrorId = useId();
    const passwordErrorId = useId();
    const [forgotOpen, setForgotOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSubmitError(null);
        setErrors({});

        const parsed = loginSchema.safeParse({ email, password });
        if (!parsed.success) {
            const fieldErrors: { email?: string; password?: string } = {};
            for (const issue of parsed.error.issues) {
                const path = issue.path[0];
                if (path === 'email' || path === 'password') {
                    if (!fieldErrors[path]) fieldErrors[path] = issue.message;
                }
            }
            setErrors(fieldErrors);
            return;
        }

        setIsLoading(true);
        try {
            const result = await signIn('credentials', {
                email: parsed.data.email,
                password: parsed.data.password,
                redirect: false,
            });

            if (result?.error) {
                setSubmitError('Invalid email, AccountMate ID, or password.');
                return;
            }
            if (result?.ok) {
                await clearWholesaleShopAsSelection();
                setEmail('');
                setPassword('');
                onOpenChange(false);
                router.refresh();
            }
        } catch {
            setSubmitError('Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent
                    hideCloseButton
                    className="border-[#d1b79a] bg-[#fdf7ef] p-0 px-3 pb-6 pt-3 text-[#4a2b1f] sm:max-w-md"
                >
                    <DialogHeader className="space-y-0">
                        <div className="flex items-center justify-between gap-3">
                            <DialogTitle className="text-sm font-semibold uppercase tracking-[0.25em] text-[#7c5b44]">
                                Wholesale Login
                            </DialogTitle>
                            <DialogClose
                                type="button"
                                className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-[#5c4032] opacity-80 ring-offset-white transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a78] focus-visible:ring-offset-2"
                                aria-label="Close dialog"
                            >
                                <X className="size-4" strokeWidth={1.75} aria-hidden />
                            </DialogClose>
                        </div>
                        <DialogDescription className="mt-2 text-xs text-[#7c5b44]">
                            Enter your email or AccountMate ID and password to access your wholesale account.
                        </DialogDescription>
                    </DialogHeader>
                    <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
                        {submitError && (
                            <p className="text-xs text-red-600" role="alert">
                                {submitError}
                            </p>
                        )}
                        <div className="space-y-1">
                            <Label htmlFor="login-email">Email / AccountMate ID</Label>
                            <Input
                                id="login-email"
                                type="text"
                                autoComplete="username"
                                placeholder="you@example.com or AccountMate ID"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className={errors.email ? 'border-red-500' : ''}
                                aria-invalid={errors.email ? true : undefined}
                                aria-describedby={errors.email ? emailErrorId : undefined}
                            />
                            {errors.email ? (
                                <p id={emailErrorId} className="text-xs text-red-600" role="alert">
                                    {errors.email}
                                </p>
                            ) : null}
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="login-password">Password</Label>
                            <Input
                                id="login-password"
                                type="password"
                                autoComplete="current-password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={errors.password ? 'border-red-500' : ''}
                                aria-invalid={errors.password ? true : undefined}
                                aria-describedby={errors.password ? passwordErrorId : undefined}
                            />
                            {errors.password ? (
                                <p id={passwordErrorId} className="text-xs text-red-600" role="alert">
                                    {errors.password}
                                </p>
                            ) : null}
                        </div>
                        <Button type="submit" className="mt-2 w-full" disabled={isLoading} aria-busy={isLoading}>
                            {isLoading ? 'Signing in…' : 'Sign In'}
                        </Button>
                    </form>
                    <button
                        type="button"
                        className="mt-3 rounded-sm text-[11px] uppercase tracking-[0.2em] text-[#a67c52] hover:text-[#4a2b1f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a78] focus-visible:ring-offset-2"
                        onClick={() => {
                            onOpenChange(false);
                            setForgotOpen(true);
                        }}
                    >
                        Forgot your password?
                    </button>
                </DialogContent>
            </Dialog>

            <ForgotPasswordDialog open={forgotOpen} onOpenChange={setForgotOpen} onBackToLogin={() => onOpenChange(true)} />
        </>
    );
}
