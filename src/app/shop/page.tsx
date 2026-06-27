import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { PublicSiteShell } from '@/components/public-site-shell';
import { ShopCatalogAside } from '@/components/shop-catalog-aside';
import { ShopCatalogPagination } from '@/components/shop-catalog-pagination';
import { getShopMenuCategoryIds } from '@/lib/db-pg/actions/menu';
import { getPaginatedProductsFromDB } from '@/lib/db-pg/actions/product';
import { ShopProductCatalogGrid } from '@/components/shop-product-catalog-grid';
import { ShopStripQueryAfterChromeNav } from '@/components/shop-strip-query-after-chrome-nav';
import { parseShopFacetParams } from '@/lib/shop-product-facets';
import { SITE_MAIN_FOCUS_CLASS, SITE_MAIN_ID } from '@/lib/site-main';
import { getEffectiveWholesaleAccountIdForShopCatalog } from '@/lib/wholesale-account-switcher-actions';
import { parseUserId } from '@/lib/user-id';
import { getShoppingMenuIdFromSession } from '@/lib/shop-shopping-menu';
import { cn } from '@/lib/utils';

const PER_PAGE = 24;

type ProductRow = {
    id: number;
    name: string | null;
    itemNumber: string | null;
    price: string;
    isActive: boolean;
    description?: string | null;
    nutrition?: string | null;
    ingredients?: string | null;
    download?: string | null;
    pieces?: string | null;
    weightInOunces?: string | null;
    shippingBoxFactor?: string | null;
    productImages?: Array<{ vercelImage: { path: string; name: string } | null }>;
};

function buildShopQuery(params: {
    page?: number;
    search?: string;
    facetIds?: string[];
}) {
    const q = new URLSearchParams();
    if (params.page != null && params.page > 1) q.set('page', String(params.page));
    if (params.search?.trim()) q.set('search', params.search.trim());
    for (const id of params.facetIds ?? []) q.append('facet', id);
    return q.toString() ? `?${q.toString()}` : '';
}

function hasActiveFilters(facetIds: string[], search: string) {
    return Boolean(search.trim() || facetIds.length);
}

type Props = {
    searchParams: Promise<{
        page?: string;
        search?: string;
        facet?: string | string[];
    }>;
};

export default async function ShopPage({ searchParams }: Props) {
    const [session, params] = await Promise.all([getServerSession(authOptions), searchParams]);
    const isLoggedIn = Boolean(session?.user);
    const userId = parseUserId(session?.user?.id);
    const shoppingAccountId =
        userId != null ? await getEffectiveWholesaleAccountIdForShopCatalog(userId, session?.user?.isAdmin ?? false) : null;
    const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
    const search = params.search?.trim() ?? '';
    const facetIds = parseShopFacetParams(params.facet);
    const shoppingMenuId = await getShoppingMenuIdFromSession();
    const menuCategoryIds = await getShopMenuCategoryIds(shoppingMenuId);

    const result = await getPaginatedProductsFromDB({
        page,
        limit: PER_PAGE,
        search: search || undefined,
        shopFacetIds: facetIds.length ? facetIds : undefined,
        categoryIds: menuCategoryIds,
        isActive: true,
    });

    const catalog: { data: ProductRow[]; pagination: { total: number; page: number; limit: number; totalPages: number } } = {
        data: result.data as ProductRow[],
        pagination: result.pagination,
    };

    const { page: currentPage, totalPages } = catalog?.pagination ?? { page: 1, totalPages: 1 };

    const queryBase = { search, facetIds };

    return (
        <PublicSiteShell>
            <Suspense fallback={null}>
                <ShopStripQueryAfterChromeNav />
            </Suspense>
            <main id={SITE_MAIN_ID} tabIndex={-1} className={cn('mx-auto max-w-6xl px-3 pb-14 pt-2 sm:px-4 sm:pb-16 sm:pt-3', SITE_MAIN_FOCUS_CLASS)}>
                <h1 className="sr-only">Wholesale shop</h1>

                <section className="space-y-8">
                    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
                        <ShopCatalogAside key={shoppingAccountId ?? 'guest'} />

                        <div className="min-w-0 flex-1 space-y-6">
                                <form
                                    key={`${search}__${[...facetIds].sort().join(',')}`}
                                    action="/shop"
                                    method="get"
                                    className="rounded-lg border border-[#b89572] bg-[#fdf7ef] p-4 sm:p-5"
                                >
                                    {facetIds.map((id) => (
                                        <input key={id} type="hidden" name="facet" value={id} />
                                    ))}
                                    <label className="block">
                                        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Search catalog</span>
                                        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
                                            <input
                                                name="search"
                                                type="search"
                                                placeholder="Product name or item number"
                                                defaultValue={search}
                                                className="min-h-10 min-w-0 flex-1 rounded-md border border-[#d1b79a] bg-white px-3 py-2 text-sm text-[#4a2b1f] outline-none ring-amber-300 focus:ring"
                                            />
                                            <button
                                                type="submit"
                                                className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md bg-[#4a2518] px-6 py-2.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#fdf7ef] transition-colors hover:bg-[#3a1b11] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a78] focus-visible:ring-offset-2"
                                            >
                                                Search
                                            </button>
                                        </div>
                                    </label>
                                </form>

                                <div className="flex flex-col gap-2 text-xs font-medium text-[#5b3a2a] sm:flex-row sm:items-center sm:justify-between">
                                    <p>
                                        Showing {catalog.data.length} of {catalog.pagination.total} active products
                                        {hasActiveFilters(facetIds, search) ? ' (filtered)' : ''}.
                                    </p>
                                    <ShopCatalogPagination
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        getPageHref={(n) => `/shop${buildShopQuery({ ...queryBase, page: n })}`}
                                    />
                                </div>

                                {catalog.data.length === 0 ? (
                                    <p className="rounded-2xl border border-[#b89572] bg-[#f6ebdd] p-8 text-center text-sm text-[#5c4032]">
                                        No products match your filters. Try clearing keywords or adjusting your search.
                                    </p>
                                ) : (
                                    <>
                                        <ShopProductCatalogGrid
                                            products={catalog.data}
                                            isLoggedIn={isLoggedIn}
                                            shoppingAccountId={shoppingAccountId}
                                        />
                                        <ShopCatalogPagination
                                            className="pt-2"
                                            currentPage={currentPage}
                                            totalPages={totalPages}
                                            getPageHref={(n) => `/shop${buildShopQuery({ ...queryBase, page: n })}`}
                                        />
                                    </>
                                )}
                            </div>
                        </div>
                    </section>
            </main>
        </PublicSiteShell>
    );
}
