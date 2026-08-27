'use server';

import * as argon2 from 'argon2';
import { and, eq, gt, sql } from 'drizzle-orm';
import { db } from '@/lib/db-pg';
import { user, userReset } from '@/lib/drizzle/schema';
import { buildPasswordResetEmailContent } from '@/lib/email/password-reset-email-template';
import { sendEmailViaResend } from '@/lib/resend-email';
import { getSendEmailFromAddress } from '@/lib/db-pg/actions/site-setting';
import { DEFAULT_SEND_EMAIL_FROM } from '@/lib/site-setting-constants';

const CODE_EXPIRY_MINUTES = 15;
const MIN_PASSWORD_LENGTH = 6;

export type PasswordResetResult = { ok: true; message: string } | { ok: false; error: string };

function normalizeLoginId(value: string): string {
    return value.trim().toLowerCase();
}

function generateSixDigitCode(): number {
    return Math.floor(100000 + Math.random() * 900000);
}

function parseResetCode(raw: string): number | null {
    const digits = raw.replace(/\D/g, '');
    if (digits.length !== 6) {
        return null;
    }
    const code = Number.parseInt(digits, 10);
    return Number.isFinite(code) ? code : null;
}

async function findActiveUserByLoginId(loginId: string) {
    const normalized = normalizeLoginId(loginId);
    if (!normalized) {
        return null;
    }

    const [found] = await db
        .select({
            id: user.id,
            userName: user.userName,
            isActive: user.isActive,
        })
        .from(user)
        .where(sql`lower(trim(${user.userName})) = ${normalized}`)
        .limit(1);

    if (!found || !found.isActive) {
        return null;
    }

    return found;
}

async function resolveFromAddress(): Promise<string | null> {
    const configured = await getSendEmailFromAddress();
    const from = configured?.trim() || DEFAULT_SEND_EMAIL_FROM.trim();
    return from || null;
}

/** Step 1: email a 6-digit reset code. Always returns a generic success message when the request is valid. */
export async function requestPasswordResetCode(email: string): Promise<PasswordResetResult> {
    const loginId = email.trim();
    if (!loginId) {
        return { ok: false, error: 'Enter the email associated with your wholesale account.' };
    }

    const found = await findActiveUserByLoginId(loginId);
    const genericSuccess = {
        ok: true as const,
        message: 'If an account exists for that email, we sent a 6-digit reset code. Check your inbox.',
    };

    if (!found) {
        return genericSuccess;
    }

    const from = await resolveFromAddress();
    if (!from) {
        return { ok: false, error: 'Password reset email is not configured. Please contact support.' };
    }

    const code = generateSixDigitCode();
    const validUntil = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000).toISOString();

    await db.delete(userReset).where(eq(userReset.userId, found.id));
    await db.insert(userReset).values({
        userId: found.id,
        resetValue: code,
        validUntil,
    });

    const content = buildPasswordResetEmailContent({
        code: String(code),
        recipientEmail: found.userName,
        expiresInMinutes: CODE_EXPIRY_MINUTES,
    });

    const sendResult = await sendEmailViaResend({
        from,
        to: found.userName,
        subject: content.subject,
        html: content.html,
        text: content.text,
    });

    if (!sendResult.ok) {
        console.error('[requestPasswordResetCode] email failed', sendResult.error);
        return { ok: false, error: 'Unable to send the reset email right now. Please try again shortly.' };
    }

    return genericSuccess;
}

/** Step 2: verify the 6-digit code for the email from step 1. */
export async function verifyPasswordResetCode(email: string, code: string): Promise<PasswordResetResult> {
    const found = await findActiveUserByLoginId(email);
    if (!found) {
        return { ok: false, error: 'Invalid or expired reset code.' };
    }

    const resetCode = parseResetCode(code);
    if (resetCode == null) {
        return { ok: false, error: 'Enter the 6-digit code from your email.' };
    }

    const nowIso = new Date().toISOString();
    const [row] = await db
        .select({ id: userReset.id })
        .from(userReset)
        .where(
            and(
                eq(userReset.userId, found.id),
                eq(userReset.resetValue, resetCode),
                gt(userReset.validUntil, nowIso),
            ),
        )
        .limit(1);

    if (!row) {
        return { ok: false, error: 'Invalid or expired reset code.' };
    }

    return { ok: true, message: 'Code verified. Choose a new password.' };
}

/** Step 3: set a new password using the verified email + code (no current password required). */
export async function completePasswordReset(input: {
    email: string;
    code: string;
    password: string;
    confirmPassword: string;
}): Promise<PasswordResetResult> {
    const password = input.password;
    const confirmPassword = input.confirmPassword;

    if (password.length < MIN_PASSWORD_LENGTH) {
        return { ok: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
    }

    if (password !== confirmPassword) {
        return { ok: false, error: 'Passwords do not match.' };
    }

    const found = await findActiveUserByLoginId(input.email);
    if (!found) {
        return { ok: false, error: 'Invalid or expired reset code.' };
    }

    const resetCode = parseResetCode(input.code);
    if (resetCode == null) {
        return { ok: false, error: 'Enter the 6-digit code from your email.' };
    }

    const nowIso = new Date().toISOString();
    const [row] = await db
        .select({ id: userReset.id })
        .from(userReset)
        .where(
            and(
                eq(userReset.userId, found.id),
                eq(userReset.resetValue, resetCode),
                gt(userReset.validUntil, nowIso),
            ),
        )
        .limit(1);

    if (!row) {
        return { ok: false, error: 'Invalid or expired reset code. Request a new code and try again.' };
    }

    const passwordHash = await argon2.hash(password);
    await db.update(user).set({ passwordHash }).where(eq(user.id, found.id));
    await db.delete(userReset).where(eq(userReset.userId, found.id));

    return { ok: true, message: 'Your password has been updated. You can sign in with your new password.' };
}
