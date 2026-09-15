import NextAuth, { type NextAuthOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import * as argon2 from 'argon2';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db-pg';
import { user } from '@/lib/drizzle/schema';
import { insertLog } from '@/lib/db-pg/actions/log';
import { loginSchema } from '@/lib/validations/auth';
import { parseUserId } from '@/lib/user-id';
import { syncUserAccountFromAccountMate } from '@/lib/db-pg/actions/account';
import { isHebAccountMateId } from '@/lib/shop-shopping-menu';

export { loginSchema } from '@/lib/validations/auth';

type SignInBlockReason =
    | 'invalid_credentials_format'
    | 'user_not_found'
    | 'ambiguous_accountmate_id'
    | 'user_inactive'
    | 'invalid_password';

type FindUserForLoginResult =
    | { status: 'found'; user: typeof user.$inferSelect }
    | { status: 'not_found' }
    | { status: 'ambiguous_accountmate_id' };

/** Never log plaintext passwords — length only is enough for support debugging. */
async function logBlockedSignIn(input: {
    loginId: string;
    reason: SignInBlockReason;
    passwordLength: number;
    userId?: number | null;
    accountMateId?: string | null;
}) {
    const detail = {
        loginId: input.loginId,
        reason: input.reason,
        passwordLength: input.passwordLength,
        userId: input.userId ?? null,
        accountMateId: input.accountMateId ?? null,
    };

    console.warn('[sign-in blocked]', detail);

    await insertLog({
        outcome: 'failure',
        stage: 'sign-in',
        message: `Sign-in blocked for "${input.loginId}"`,
        userId: input.userId ?? null,
        accountMateId: input.accountMateId ?? null,
        error: `${input.reason} (passwordLength=${input.passwordLength})`,
    });
}

async function findUserForLogin(loginId: string): Promise<FindUserForLoginResult> {
    const normalized = loginId.trim().toLowerCase();
    if (!normalized) {
        return { status: 'not_found' };
    }

    const [byUserName] = await db
        .select()
        .from(user)
        .where(sql`lower(trim(${user.userName})) = ${normalized}`)
        .limit(1);

    if (byUserName) {
        return { status: 'found', user: byUserName };
    }

    const byAccountMateId = await db
        .select()
        .from(user)
        .where(
            and(
                sql`lower(trim(coalesce(${user.accountMateId}, ''))) = ${normalized}`,
                eq(user.isActive, true),
            ),
        )
        .limit(2);

    // Ambiguous AccountMate IDs should not authenticate.
    if (byAccountMateId.length === 1) {
        return { status: 'found', user: byAccountMateId[0] };
    }

    if (byAccountMateId.length > 1) {
        return { status: 'ambiguous_accountmate_id' };
    }

    return { status: 'not_found' };
}

const authOptions: NextAuthOptions = {
    providers: [
        Credentials({
            name: 'Email and Password',
            credentials: {
                email: { label: 'Email', type: 'text' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(raw) {
                const rawLoginId = typeof raw?.email === 'string' ? raw.email : '';
                const rawPassword = typeof raw?.password === 'string' ? raw.password : '';

                const parsed = loginSchema.safeParse(raw);
                if (!parsed.success) {
                    await logBlockedSignIn({
                        loginId: rawLoginId.trim() || '(empty)',
                        reason: 'invalid_credentials_format',
                        passwordLength: rawPassword.length,
                    });
                    return null;
                }

                const { email: loginId, password } = parsed.data;
                const lookup = await findUserForLogin(loginId);

                if (lookup.status === 'not_found') {
                    await logBlockedSignIn({
                        loginId,
                        reason: 'user_not_found',
                        passwordLength: password.length,
                    });
                    return null;
                }

                if (lookup.status === 'ambiguous_accountmate_id') {
                    await logBlockedSignIn({
                        loginId,
                        reason: 'ambiguous_accountmate_id',
                        passwordLength: password.length,
                        accountMateId: loginId,
                    });
                    return null;
                }

                const found = lookup.user;

                if (!found.isActive) {
                    await logBlockedSignIn({
                        loginId,
                        reason: 'user_inactive',
                        passwordLength: password.length,
                        userId: found.id,
                        accountMateId: found.accountMateId,
                    });
                    return null;
                }

                let valid = false;
                try {
                    valid = await argon2.verify(found.passwordHash, password);
                } catch {
                    valid = false;
                }
                if (!valid) {
                    await logBlockedSignIn({
                        loginId,
                        reason: 'invalid_password',
                        passwordLength: password.length,
                        userId: found.id,
                        accountMateId: found.accountMateId,
                    });
                    return null;
                }

                if (found.accountMateId?.trim()) {
                    try {
                        await syncUserAccountFromAccountMate(found.id);
                    } catch (err) {
                        console.error('[sign-in account sync]', err);
                    }
                }

                return {
                    id: String(found.id),
                    email: found.userName,
                    name: [found.firstName, found.lastName].filter(Boolean).join(' ') || found.userName,
                    isAdmin: found.isAdmin,
                    isHEB: isHebAccountMateId(found.accountMateId),
                    needsProfileCompletion: !found.firstName?.trim() || !found.lastName?.trim(),
                };
            },
        }),
    ],
    session: {
        strategy: 'jwt' as const,
    },
    pages: {
        signIn: '/',
    },
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user) {
                const userId = parseUserId(user.id);
                if (userId != null) {
                    token.id = userId;
                }
                token.email = user.email ?? undefined;
                token.name = user.name ?? undefined;
                token.isAdmin = user.isAdmin;
                token.isHEB = user.isHEB ?? false;
                token.needsProfileCompletion = user.needsProfileCompletion ?? false;
            }

            if (trigger === 'update' && session) {
                const updateSession = session as { needsProfileCompletion?: boolean; name?: string };
                if (updateSession.name != null) {
                    token.name = updateSession.name;
                }
                if (updateSession.needsProfileCompletion != null) {
                    token.needsProfileCompletion = updateSession.needsProfileCompletion;
                }
            }

            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = parseUserId(token.id) ?? 0;
                session.user.email = token.email ?? undefined;
                session.user.name = token.name ?? undefined;
                session.user.isAdmin = token.isAdmin;
                session.user.isHEB = token.isHEB ?? false;
                session.user.needsProfileCompletion = token.needsProfileCompletion ?? false;
            }
            return session;
        },
    },
};

export const handler = NextAuth(authOptions);
export { authOptions };
