import { getBrandBarNavCategories } from '@/lib/db-pg/actions/menu';
import { PublicSiteShellClient } from '@/components/public-site-shell-client';
import type { ReactNode } from 'react';

type PublicSiteShellProps = {
    children: ReactNode;
};

export async function PublicSiteShell({ children }: PublicSiteShellProps) {
    const brandBarCategories = await getBrandBarNavCategories();

    return <PublicSiteShellClient brandBarCategories={brandBarCategories}>{children}</PublicSiteShellClient>;
}
