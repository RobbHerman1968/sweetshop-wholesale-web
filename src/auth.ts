import NextAuth, { type NextAuthOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import * as argon2 from 'argon2';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db-pg';
import { user } from '@/lib/drizzle/schema';
import { loginSchema } from '@/lib/validations/auth';
import { parseUserId } from '@/lib/user-id';
import { syncUserAccountFromAccountMate } from '@/lib/db-pg/actions/account';
import { isHebAccountMateId } from '@/lib/shop-shopping-menu';

export { loginSchema } from '@/lib/validations/auth';

async function findUserForLogin(loginId: string) {
    const normalized = loginId.trim().toLowerCase();
    if (!normalized) {
        return null;
    }

    const [byUserName] = await db
        .select()
        .from(user)
        .where(sql`lower(trim(${user.userName})) = ${normalized}`)
        .limit(1);

    if (byUserName) {
        return byUserName;
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
        return byAccountMateId[0];
    }

    return null;
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
                const parsed = loginSchema.safeParse(raw);
                if (!parsed.success) {
                    return null;
                }

                const { email: loginId, password } = parsed.data;
                const found = await findUserForLogin(loginId);

                if (!found || !found.isActive) {
                    return null;
                }

                let valid = false;
                try {
                    valid = await argon2.verify(found.passwordHash, password);
                } catch {
                    valid = false;
                }
                if (!valid) {
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
