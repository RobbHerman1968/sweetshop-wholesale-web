'use client';

import type { Session } from 'next-auth';
import { SessionProvider } from 'next-auth/react';

type AuthSessionProviderProps = {
    children: React.ReactNode;
    /** From `getServerSession` in the root layout so client hooks see the same session during hydration. */
    session?: Session | null;
};

export function AuthSessionProvider({ children, session }: AuthSessionProviderProps) {
    return <SessionProvider session={session}>{children}</SessionProvider>;
}
