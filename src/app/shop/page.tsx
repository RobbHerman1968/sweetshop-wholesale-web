import Link from 'next/link';
import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { PublicSiteShell } from '@/components/public-site-shell';
import { resolveShopCatalogProductGroupIds } from '@/lib/db-pg/actions/account';
import { getEffectiveWholesaleAccountIdForShopCatalog } from '@/lib/wholesale-account-switcher-actions';
import { getPaginatedProductsFromDB, getShopFacetAvailability } from '@/lib/db-pg/actions/product';
import { ShopFacetFilters } from '@/components/shop-facet-filters';
import { ShopProductCatalogGrid } from '@/components/shop-product-catalog-grid';
import { ShopStripQueryAfterChromeNav } from '@/components/shop-strip-query-after-chrome-nav';
import { parseShopFacetParams, SHOP_PRODUCT_FACETS } from '@/lib/shop-product-facets';
import { SITE_MAIN_FOCUS_CLASS, SITE_MAIN_ID } from '@/lib/site-main';
import { cn } from '@/lib/utils';

const PER_PAGE = 24;

/** Default catalog when no account→productGroup rows exist, or signed-out preview. */
const PUBLIC_SHOP_PRODUCT_GROUP_IDS = [1];

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
    const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
    const search = params.search?.trim() ?? '';
    const facetIds = parseShopFacetParams(params.facet);

    let productGroupIdsForShop: number[];
    if (isLoggedIn) {
        const userId = session?.user?.id?.trim() ?? '';
        if (userId) {
            const effectiveAccountId = await getEffectiveWholesaleAccountIdForShopCatalog(userId);
            if (effectiveAccountId != null) {
                /**
                 * user → account (userId) → accountGroup (per account) → productGroupId(s) →
                 * productGroupProduct links those groups to products (see getPaginatedProductsFromDB).
                 */
                productGroupIdsForShop = await resolveShopCatalogProductGroupIds(userId, effectiveAccountId);
            } else {
                productGroupIdsForShop = [];
            }
            /** No accountGroup / group rows: avoid empty `productGroupIds` (that would match zero products). */
            if (productGroupIdsForShop.length === 0) {
                productGroupIdsForShop = PUBLIC_SHOP_PRODUCT_GROUP_IDS;
            }
        } else {
            productGroupIdsForShop = PUBLIC_SHOP_PRODUCT_GROUP_IDS;
        }
    } else {
        productGroupIdsForShop = PUBLIC_SHOP_PRODUCT_GROUP_IDS;
    }

    const [result, facetAvailability, facetScopeAvailability] = await Promise.all([
        getPaginatedProductsFromDB({
            page,
            limit: PER_PAGE,
            search: search || undefined,
            shopFacetIds: facetIds.length ? facetIds : undefined,
            productGroupIds: productGroupIdsForShop,
            isActive: true,
        }),
        getShopFacetAvailability({
            search: search || undefined,
            selectedFacetIds: facetIds,
            productGroupIds: productGroupIdsForShop,
        }),
        /** Keywords that match at least one product in this catalog scope (groups + search only). */
        getShopFacetAvailability({
            search: search || undefined,
            selectedFacetIds: [],
            productGroupIds: productGroupIdsForShop,
        }),
    ]);

    const selectedSet = new Set(facetIds);
    const visibleFacetIds = SHOP_PRODUCT_FACETS.filter((f) => facetScopeAvailability[f.id] || selectedSet.has(f.id)).map((f) => f.id);

    const catalog: { data: ProductRow[]; pagination: { total: number; page: number; limit: number; totalPages: number } } = {
        data: result.data as ProductRow[],
        pagination: result.pagination,
    };

    const { page: currentPage, totalPages } = catalog?.pagination ?? { page: 1, totalPages: 1 };
    const pageNumbers: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
    } else {
        pageNumbers.push(1);
        if (currentPage > 3) pageNumbers.push('ellipsis');
        for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
            if (!pageNumbers.includes(i)) pageNumbers.push(i);
        }
        if (currentPage < totalPages - 2) pageNumbers.push('ellipsis');
        if (totalPages > 1) pageNumbers.push(totalPages);
    }

    const queryBase = { search, facetIds };

    return (
        <PublicSiteShell>
            <Suspense fallback={null}>
                <ShopStripQueryAfterChromeNav />
            </Suspense>
            <main id={SITE_MAIN_ID} tabIndex={-1} className={cn('mx-auto max-w-6xl px-3 pb-14 pt-2 sm:px-4 sm:pb-16 sm:pt-3', SITE_MAIN_FOCUS_CLASS)}>
                <header className="mb-8 rounded-2xl border border-[#b89572] bg-linear-to-r from-[#3d2518] via-[#5c3820] to-[#3d2518] px-5 py-8 text-[#fdf7ef] shadow-lg sm:rounded-3xl sm:px-10 sm:py-10">
                    <h1 className="text-xl font-semibold uppercase tracking-[0.28em] text-[#f5d9b8] sm:text-2xl sm:tracking-[0.32em]">Wholesale shop</h1>
                    <p className="mt-3 max-w-2xl text-xs leading-relaxed text-[#fdf7ef]/90 sm:text-sm">
                        {isLoggedIn
                            ? 'You’re viewing products for your wholesale account. Filter by keywords or search by product name or item number.'
                            : 'Preview a selection of wholesale products. Sign in to see pricing and shop your full catalog.'}
                    </p>
                </header>

                <section className="space-y-8">
                    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
                        <aside className="w-full shrink-0 space-y-4 lg:sticky lg:top-24 lg:w-72 lg:self-start">
                            <h2 className="hidden text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5c4032] lg:block">Filters</h2>
                            <details
                                open
                                className="rounded-2xl border border-[#b89572] bg-[#fdf7ef] p-4 shadow-sm lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none [&_summary::-webkit-details-marker]:hidden"
                            >
                                <summary className="mb-0 cursor-pointer text-[11px] font-semibold uppercase tracking-[0.28em] text-[#6e4a34] lg:hidden">
                                    Filters
                                </summary>
                                <div className="mt-6 space-y-6 lg:mt-0">
                                    <ShopFacetFilters
                                        key={`${visibleFacetIds.join(',')}__${[...facetIds].sort().join(',')}__${search}`}
                                        search={search}
                                        facetIds={facetIds}
                                        visibleFacetIds={visibleFacetIds}
                                        facetAvailability={facetAvailability}
                                    />

                                    {hasActiveFilters(facetIds, search) && (
                                        <div>
                                            <Link
                                                href="/shop"
                                                className="inline-flex items-center justify-center text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6e4a34] underline-offset-4 hover:underline"
                                            >
                                                Clear all
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </details>
                        </aside>

                        <div className="min-w-0 flex-1 space-y-6">
                                <form
                                    key={`${search}__${[...facetIds].sort().join(',')}`}
                                    action="/shop"
                                    method="get"
                                    className="rounded-2xl border border-[#b89572] bg-[#fdf7ef] p-4 sm:p-5"
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
                                    {totalPages > 1 && (
                                        <nav className="flex flex-row flex-wrap items-center justify-end gap-1" aria-label="Pagination">
                                            <ul className="flex flex-row flex-wrap items-center gap-1">
                                                {pageNumbers.map((n, i) =>
                                                    n === 'ellipsis' ? (
                                                        <li key={`ellipsis-${i}`} className="flex h-9 w-9 items-center justify-center text-[#6e4a34]" aria-hidden>
                                                            …
                                                        </li>
                                                    ) : (
                                                        <li key={n}>
                                                            <Link
                                                                href={`/shop${buildShopQuery({ ...queryBase, page: n })}`}
                                                                aria-current={currentPage === n ? 'page' : undefined}
                                                                className={cn(
                                                                    'inline-flex h-9 w-9 items-center justify-center rounded-md text-xs font-semibold uppercase tracking-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a78] focus-visible:ring-offset-2',
                                                                    currentPage === n
                                                                        ? 'bg-[#6e4a34] text-[#fdf7ef] hover:bg-[#5d3b29]'
                                                                        : 'border border-[#c49a78] text-[#6e4a34] bg-transparent hover:bg-[#f3e0cf]',
                                                                )}
                                                            >
                                                                {n}
                                                            </Link>
                                                        </li>
                                                    ),
                                                )}
                                            </ul>
                                        </nav>
                                    )}
                                </div>

                                {catalog.data.length === 0 ? (
                                    <p className="rounded-2xl border border-[#b89572] bg-[#f6ebdd] p-8 text-center text-sm text-[#5c4032]">
                                        No products match your filters. Try clearing keywords or adjusting your search.
                                    </p>
                                ) : (
                                    <ShopProductCatalogGrid products={catalog.data} isLoggedIn={isLoggedIn} />
                                )}
                            </div>
                        </div>
                    </section>
            </main>
        </PublicSiteShell>
    );
}
