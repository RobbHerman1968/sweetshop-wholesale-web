import { withAuth } from 'next-auth/middleware';

export default withAuth({
    pages: {
        signIn: '/',
    },
    callbacks: {
        authorized: ({ token }) => {
            if (token?.id == null) {
                return false;
            }
            const id = typeof token.id === 'number' ? token.id : Number.parseInt(String(token.id), 10);
            return Number.isFinite(id) && id > 0;
        },
    },
});

export const config = {
    matcher: ['/account', '/account/:path*'],
};
