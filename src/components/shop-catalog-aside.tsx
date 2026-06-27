import { getShopNavCategories } from '@/lib/db-pg/actions/menu';
import { ShopCategoryNav } from '@/components/shop-category-nav';
import { getShoppingMenuIdFromSession } from '@/lib/shop-shopping-menu';

type ShopCatalogAsideProps = {
    selectedCategoryId?: number | null;
};

export async function ShopCatalogAside({ selectedCategoryId }: ShopCatalogAsideProps) {
    const menuId = await getShoppingMenuIdFromSession();
    const menuCategories = await getShopNavCategories(menuId);

    return (
        <aside className="w-full shrink-0 lg:w-72">
            <ShopCategoryNav categories={menuCategories} selectedCategoryId={selectedCategoryId} />
        </aside>
    );
}
