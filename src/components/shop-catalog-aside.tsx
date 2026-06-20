import { getBrandBarNavCategories, WHOLESALE_SHOPPING_MENU_ID } from '@/lib/db-pg/actions/menu';
import { ShopCategoryNav } from '@/components/shop-category-nav';

type ShopCatalogAsideProps = {
    selectedCategoryId?: number | null;
};

export async function ShopCatalogAside({ selectedCategoryId }: ShopCatalogAsideProps) {
    const menuCategories = await getBrandBarNavCategories(WHOLESALE_SHOPPING_MENU_ID);

    return (
        <aside className="w-full shrink-0 lg:w-72">
            <ShopCategoryNav categories={menuCategories} selectedCategoryId={selectedCategoryId} />
        </aside>
    );
}
