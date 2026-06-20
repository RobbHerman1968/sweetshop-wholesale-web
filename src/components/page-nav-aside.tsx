import { getBrandBarNavCategories, WHOLESALE_PAGE_MENU_ID } from '@/lib/db-pg/actions/menu';
import { ShopCategoryNav } from '@/components/shop-category-nav';

type PageNavAsideProps = {
    selectedPageId?: number | null;
};

export async function PageNavAside({ selectedPageId }: PageNavAsideProps) {
    const menuCategories = await getBrandBarNavCategories(WHOLESALE_PAGE_MENU_ID);

    return (
        <aside className="w-full shrink-0 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:w-72 lg:self-start lg:overflow-y-auto">
            <ShopCategoryNav
                categories={menuCategories}
                selectedPageId={selectedPageId}
                showAllProductsLink={false}
                ariaLabel="Pages"
                mobileNavVariant="page"
            />
        </aside>
    );
}
