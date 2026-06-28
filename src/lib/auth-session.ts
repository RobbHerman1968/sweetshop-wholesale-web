import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import type { Session } from 'next-auth';
import { authOptions } from '@/auth';
import { parseUserId } from '@/lib/user-id';

export async function getAuthenticatedUserId(): Promise<number | null> {
    const session = await getServerSession(authOptions);
    return parseUserId(session?.user?.id);
}

/** Redirects to `/` when there is no valid signed-in user id. */
export async function requireAuthenticatedUserId(): Promise<number> {
    const userId = await getAuthenticatedUserId();
    if (userId == null) {
        redirect('/');
    }
    return userId;
}

export async function requireAuthenticatedSession(): Promise<Session> {
    const session = await getServerSession(authOptions);
    const userId = parseUserId(session?.user?.id);
    if (!session?.user || userId == null) {
        redirect('/');
    }
    return session;
}
