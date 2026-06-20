import Link from 'next/link';
import type { BrandBarNavCategory } from '@/assets/brand-bar-nav';
import { MenuNavLink } from '@/components/menu-nav-link';
import { ShopCategoryNavMobileSelect } from '@/components/shop-category-nav-mobile-select';
import { cn } from '@/lib/utils';

type ShopCategoryNavProps = {
    categories: BrandBarNavCategory[];
    selectedCategoryId?: number | null;
    selectedPageId?: number | null;
    showAllProductsLink?: boolean;
    ariaLabel?: string;
    /** Controls which links appear in the mobile select. */
    mobileNavVariant?: 'shop' | 'page';
};

const navBaseClass = 'text-[12px] uppercase tracking-normal text-[#5c4032]';

const navBoldClass = cn(navBaseClass, 'font-bold');

const navLinkClass = cn(
    navBaseClass,
    'font-normal',
    'block rounded-md py-1.5 text-left transition-colors hover:bg-[#f3e0cf] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a78] focus-visible:ring-offset-1',
);

const navInteractiveClass = cn(
    navBoldClass,
    'block rounded-md py-1.5 text-left transition-colors hover:bg-[#f3e0cf] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a78] focus-visible:ring-offset-1',
);

function activeNavClass(isActive: boolean) {
    return isActive ? 'bg-[#ede0d4] text-[#3c251a]' : undefined;
}

export function ShopCategoryNav({
    categories,
    selectedCategoryId,
    selectedPageId,
    showAllProductsLink = true,
    ariaLabel = 'Shop categories',
    mobileNavVariant = 'shop',
}: ShopCategoryNavProps) {
    if (categories.length === 0) return null;

    return (
        <>
            <ShopCategoryNavMobileSelect
                categories={categories}
                selectedCategoryId={selectedCategoryId}
                selectedPageId={selectedPageId}
                showAllProductsLink={showAllProductsLink}
                ariaLabel={ariaLabel}
                navVariant={mobileNavVariant}
            />
            <nav
                aria-label={ariaLabel}
                className="hidden rounded-lg border border-[#b89572] bg-[#fdf7ef] p-4 shadow-sm lg:block"
            >
            <ul className="space-y-1">
                {showAllProductsLink ? (
                    <li>
                        <Link
                            href="/shop"
                            aria-current={selectedCategoryId == null ? 'page' : undefined}
                            className={cn(navInteractiveClass, 'px-2', activeNavClass(selectedCategoryId == null))}
                        >
                            All products
                        </Link>
                    </li>
                ) : null}
                {categories.map((group) => (
                    <li key={group.label}>
                        <p className={cn(navBoldClass, 'px-2 py-1.5')}>{group.label}</p>
                        <div className="mt-1 space-y-2">
                            {group.sections.map((section) => (
                                <div key={`${group.label}-${section.title || 'links'}`} className="space-y-0.5">
                                    {section.title ? (
                                        <p className={cn(navBoldClass, 'px-6 py-1')}>{section.title}</p>
                                    ) : null}
                                    <ul className="space-y-0.5">
                                        {section.links.map((link) => {
                                            const isActive =
                                                (selectedCategoryId != null && link.categoryId === selectedCategoryId) ||
                                                (selectedPageId != null && link.pageId === selectedPageId);

                                            return (
                                                <li key={`${group.label}-${section.title}-${link.title}`}>
                                                    <MenuNavLink
                                                        link={link}
                                                        ariaCurrent={isActive ? 'page' : undefined}
                                                        className={cn(
                                                            navLinkClass,
                                                            'px-8',
                                                            activeNavClass(isActive),
                                                        )}
                                                    />
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </li>
                ))}
            </ul>
            </nav>
        </>
    );
}
