import { HomePageClient } from '@/app/home-page-client';
import { getBrandBarNavCategories } from '@/lib/db-pg/actions/menu';

export default async function Home() {
    const brandBarCategories = await getBrandBarNavCategories();

    return <HomePageClient brandBarCategories={brandBarCategories} />;
}
