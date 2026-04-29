import Image from 'next/image';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { PublicSiteShell } from '@/components/public-site-shell';
import { getPaginatedProductsFromDB } from '@/lib/db-pg/actions/product';
import { SITE_MAIN_FOCUS_CLASS, SITE_MAIN_ID } from '@/lib/site-main';
import { cn } from '@/lib/utils';

const PER_PAGE = 24;

const RETAIL_COLLECTIONS = [
    {
        id: 'gourmet-chocolates' as const,
        title: 'Gourmet chocolates',
        blurb: 'Gift sets, seasonal bestsellers, and corporate programs—ideal anchors for your wholesale assortment.',
        href: 'https://www.sweetshopusa.com/collections/truffles',
        imageSrc: 'https://www.sweetshopusa.com/cdn/shop/collections/TrufflesHangTag.jpg?v=1767393989&width=952',
        imageAlt: 'Sweet Shop USA truffles collection',
    },
    {
        id: 'handcrafted-clusters' as const,
        title: 'Handcrafted clusters',
        blurb: 'Almond clusters, pecan turtles, and mixed assortments for grab-and-go retail.',
        href: 'https://www.sweetshopusa.com/collections/all',
        imageSrc: 'https://www.sweetshopusa.com/cdn/shop/collections/The_Great_Divide.jpg?v=1767042852&width=1800',
        imageAlt: 'Big Little Fudge and cluster-style confections',
    },
    {
        id: 'buttery-small-batch-toffee' as const,
        title: 'Small-batch toffee',
        blurb: 'English toffee, chocolate-covered pieces, and gift tins with long counter appeal.',
        href: 'https://www.sweetshopusa.com/collections/mrs-weinsteins-toffee',
        imageSrc: 'https://www.sweetshopusa.com/cdn/shop/collections/weinsteinbanner.jpg?v=1767393970&width=1500',
        imageAlt: 'Mrs. Weinstein’s toffee collection',
    },
];

type ProductRow = {
    id: number;
    name: string | null;
    itemNumber: string | null;
    price: string;
    isActive: boolean;
    productImages?: Array<{ vercelImage: { path: string; name: string } | null }>;
};

function buildQuery(params: { page?: number; name?: string; itemNumber?: string }) {
    const q = new URLSearchParams();
    if (params.page != null && params.page > 1) q.set('page', String(params.page));
    if (params.name?.trim()) q.set('name', params.name.trim());
    if (params.itemNumber?.trim()) q.set('itemNumber', params.itemNumber.trim());
    return q.toString() ? `?${q.toString()}` : '';
}

type Props = {
    searchParams: Promise<{ page?: string; name?: string; itemNumber?: string }>;
};

export default async function ShopPage({ searchParams }: Props) {
    const [session, params] = await Promise.all([getServerSession(authOptions), searchParams]);
    const isLoggedIn = Boolean(session?.user);
    const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
    const name = params.name?.trim() ?? '';
    const itemNumber = params.itemNumber?.trim() ?? '';

    let catalog: { data: ProductRow[]; pagination: { total: number; page: number; limit: number; totalPages: number } } | null = null;

    if (isLoggedIn) {
        const result = await getPaginatedProductsFromDB({
            page,
            limit: PER_PAGE,
            name: name || undefined,
            itemNumber: itemNumber || undefined,
            isActive: true,
        });
        catalog = {
            data: result.data as ProductRow[],
            pagination: result.pagination,
        };
    }

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

    return (
        <PublicSiteShell>
            <main id={SITE_MAIN_ID} tabIndex={-1} className={cn('mx-auto max-w-6xl px-3 pb-14 pt-2 sm:px-4 sm:pb-16 sm:pt-3', SITE_MAIN_FOCUS_CLASS)}>
                <header className="mb-8 rounded-2xl border border-[#b89572] bg-linear-to-r from-[#3d2518] via-[#5c3820] to-[#3d2518] px-5 py-8 text-[#fdf7ef] shadow-lg sm:rounded-3xl sm:px-10 sm:py-10">
                    <h1 className="text-xl font-semibold uppercase tracking-[0.28em] text-[#f5d9b8] sm:text-2xl sm:tracking-[0.32em]">Wholesale shop</h1>
                    <p className="mt-3 max-w-2xl text-xs leading-relaxed text-[#fdf7ef]/90 sm:text-sm">
                        {isLoggedIn
                            ? 'Search active SKUs by name or item number. Pricing shown is your wholesale catalog.'
                            : 'Explore our family of brands below. Sign in with your wholesale account to browse the live catalog, pricing, and SKUs.'}
                    </p>
                </header>

                {isLoggedIn && catalog ? (
                    <section className="space-y-8">
                        <form action="/shop" method="get" className="flex flex-wrap items-end gap-3 rounded-2xl border border-[#b89572] bg-[#fdf7ef] p-4 sm:p-5">
                            <label className="flex min-w-0 flex-col gap-1">
                                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Name</span>
                                <input
                                    name="name"
                                    type="search"
                                    placeholder="Search by name"
                                    defaultValue={name}
                                    className="flex h-9 w-48 min-w-0 rounded-md border border-[#d1b79a] bg-white px-3 py-2 text-sm text-[#4a2b1f] outline-none ring-amber-300 focus:ring sm:w-56"
                                />
                            </label>
                            <label className="flex min-w-0 flex-col gap-1">
                                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Item number</span>
                                <input
                                    name="itemNumber"
                                    type="search"
                                    placeholder="Item #"
                                    defaultValue={itemNumber}
                                    className="flex h-9 w-36 min-w-0 rounded-md border border-[#d1b79a] bg-white px-3 py-2 text-sm text-[#4a2b1f] outline-none ring-amber-300 focus:ring sm:w-40"
                                />
                            </label>
                            <button
                                type="submit"
                                className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md bg-[#6e4a34] px-5 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#fdf7ef] transition-colors hover:bg-[#5d3b29] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a78] focus-visible:ring-offset-2"
                            >
                                Search
                            </button>
                        </form>

                        <div className="flex flex-col gap-2 text-xs font-medium text-[#5b3a2a] sm:flex-row sm:items-center sm:justify-between">
                            <p>
                                Showing {catalog.data.length} of {catalog.pagination.total} active products
                                {(name || itemNumber) && ' (filtered)'}.
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
                                                        href={`/shop${buildQuery({
                                                            page: n,
                                                            name: name || undefined,
                                                            itemNumber: itemNumber || undefined,
                                                        })}`}
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
                            <p className="rounded-2xl border border-[#b89572] bg-[#f6ebdd] p-8 text-center text-sm text-[#5c4032]">No products match your search.</p>
                        ) : (
                            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {catalog.data.map((p) => {
                                    const firstImage = p.productImages?.[0]?.vercelImage?.path;
                                    return (
                                        <li key={p.id}>
                                            <article className="overflow-hidden rounded-2xl border border-[#b89572] bg-[#fdf7ef] shadow-sm transition-shadow hover:shadow-md">
                                                <div className="aspect-square w-full bg-white">
                                                    {firstImage ? (
                                                        // eslint-disable-next-line @next/next/no-img-element -- remote blob URLs; matches manage products grid
                                                        <img src={firstImage} alt="" className="h-full w-full object-cover" />
                                                    ) : (
                                                        <div className="flex h-full items-center justify-center text-[11px] font-medium uppercase tracking-wider text-[#8b6b4a]">No image</div>
                                                    )}
                                                </div>
                                                <div className="p-4">
                                                    <h2 className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#4a2518]">{p.name ?? '—'}</h2>
                                                    <p className="mt-1 text-[11px] text-[#6e4a34]">{p.itemNumber ? `Item #${p.itemNumber}` : '—'}</p>
                                                    <p className="mt-2 text-sm font-semibold text-[#4a2518]">${Number(p.price).toFixed(2)}</p>
                                                    <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-[#8b6b4a]">Add to cart coming soon</p>
                                                </div>
                                            </article>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </section>
                ) : (
                    <>
                        <section className="mb-10 rounded-2xl border border-[#b89572] bg-[#f6ebdd] p-6 sm:p-8">
                            <h2 className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#5c4032]">Wholesale catalog</h2>
                            <p className="mt-3 max-w-2xl text-xs leading-relaxed text-[#5c4032] sm:text-sm">
                                Your live product list, images, and wholesale pricing are available after sign-in. Use <span className="font-semibold">Login</span> in the
                                header, or apply for a new wholesale account.
                            </p>
                            <div className="mt-5 flex flex-wrap gap-3">
                                <Link
                                    href="/apply"
                                    className="inline-flex items-center justify-center rounded-md bg-[#4a2518] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#fdf7ef] transition-colors hover:bg-[#3a1b11] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a78] focus-visible:ring-offset-2"
                                >
                                    Apply for wholesale
                                </Link>
                                <Link
                                    href="https://www.sweetshopusa.com/collections/all"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center justify-center rounded-md border border-[#5c4032] bg-transparent px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5c4032] transition-colors hover:bg-[#f3e0cf] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a78] focus-visible:ring-offset-2"
                                >
                                    Retail store
                                </Link>
                            </div>
                        </section>

                        <section aria-labelledby="shop-collections-heading" className="space-y-10">
                            <h2 id="shop-collections-heading" className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#5c4032]">
                                Collections overview
                            </h2>
                            <div className="grid gap-8">
                                {RETAIL_COLLECTIONS.map((block) => (
                                    <article
                                        key={block.id}
                                        id={block.id}
                                        className="scroll-mt-28 overflow-hidden rounded-2xl border border-[#b89572] bg-[#fdf7ef] shadow-sm sm:grid sm:grid-cols-[1.1fr_1fr] sm:items-stretch"
                                    >
                                        <Link href={block.href} target="_blank" rel="noreferrer" className="relative block aspect-4/3 min-h-[200px] sm:aspect-auto sm:min-h-[240px]">
                                            <Image src={block.imageSrc} alt={block.imageAlt} fill className="object-cover" sizes="(min-width: 640px) 45vw, 100vw" />
                                        </Link>
                                        <div className="flex flex-col justify-center p-5 sm:p-8">
                                            <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-[#4a2518]">{block.title}</h3>
                                            <p className="mt-3 text-xs leading-relaxed text-[#5c4032] sm:text-sm">{block.blurb}</p>
                                            <Link
                                                href={block.href}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="mt-5 inline-flex w-fit items-center rounded-md border border-[#5c4032] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5c4032] transition hover:bg-[#5c4032] hover:text-[#fdf7ef]"
                                            >
                                                View on sweetshopusa.com
                                            </Link>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </section>
                    </>
                )}
            </main>
        </PublicSiteShell>
    );
}
