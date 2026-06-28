import { requireAuthenticatedUserId } from '@/lib/auth-session';

export default async function AccountLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    await requireAuthenticatedUserId();
    return <>{children}</>;
}
