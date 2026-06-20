import { AccountPageClient } from '@/app/account/account-page-client';
import { getBrandBarNavCategories } from '@/lib/db-pg/actions/menu';

export default async function AccountPage() {
    const brandBarCategories = await getBrandBarNavCategories();

    return <AccountPageClient brandBarCategories={brandBarCategories} />;
}
