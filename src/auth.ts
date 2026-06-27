import NextAuth from 'next-auth';
import type { Session } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import Credentials from 'next-auth/providers/credentials';
import * as argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db-pg';
import { user } from '@/lib/drizzle/schema';
import { loginSchema } from '@/lib/validations/auth';
import { parseUserId } from '@/lib/user-id';
import { syncUserAccountFromAccountMate } from '@/lib/db-pg/actions/account';
import { isHebAccountMateId } from '@/lib/shop-shopping-menu';

export { loginSchema } from '@/lib/validations/auth';

const authOptions = {
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

                const [found] = await db.select().from(user).where(eq(user.userName, loginId)).limit(1);

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
                };
            },
        }),
    ],
    session: {
        strategy: 'jwt' as const,
    },
    callbacks: {
        async jwt({
            token,
            user,
        }: {
            token: JWT;
            user?: { id: string; email?: string | null; name?: string | null; isAdmin?: boolean; isHEB?: boolean };
        }) {
            if (user) {
                const userId = parseUserId(user.id);
                if (userId != null) {
                    token.id = userId;
                }
                token.email = user.email ?? undefined;
                token.name = user.name ?? undefined;
                token.isAdmin = user.isAdmin;
                token.isHEB = user.isHEB ?? false;
            }
            return token;
        },
        async session({ session, token }: { session: Session; token: JWT }) {
            if (token && session.user) {
                session.user.id = parseUserId(token.id) ?? 0;
                session.user.email = token.email ?? undefined;
                session.user.name = token.name ?? undefined;
                session.user.isAdmin = token.isAdmin;
                session.user.isHEB = token.isHEB ?? false;
            }
            return session;
        },
    },
};

export const handler = NextAuth(authOptions);
export { authOptions };
