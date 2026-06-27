import { getServerSession } from 'next-auth';
import { AccountPageClient } from '@/app/account/account-page-client';
import { authOptions } from '@/auth';
import { getBrandBarNavCategoriesForSiteHeader } from '@/lib/db-pg/actions/menu';
import { getShopCartItemCount } from '@/lib/shop-cart-actions';

export default async function AccountPage() {
    const [brandBarCategories, session] = await Promise.all([
        getBrandBarNavCategoriesForSiteHeader(),
        getServerSession(authOptions),
    ]);
    const initialCartItemCount = session?.user ? await getShopCartItemCount() : 0;

    return (
        <AccountPageClient brandBarCategories={brandBarCategories} initialCartItemCount={initialCartItemCount} />
    );
}
