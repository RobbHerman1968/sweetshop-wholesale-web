import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
    interface Session {
        user: {
            id: number;
            isAdmin?: boolean;
            isHEB?: boolean;
            needsProfileCompletion?: boolean;
        } & DefaultSession['user'];
    }

    interface User {
        isAdmin?: boolean;
        isHEB?: boolean;
        needsProfileCompletion?: boolean;
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        id?: number;
        isAdmin?: boolean;
        isHEB?: boolean;
        needsProfileCompletion?: boolean;
    }
}
