import Link from 'next/link';
import { cn } from '@/lib/utils';

export function buildShopPageNumbers(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
    const pageNumbers: (number | 'ellipsis')[] = [];

    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
        return pageNumbers;
    }

    pageNumbers.push(1);
    if (currentPage > 3) pageNumbers.push('ellipsis');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        if (!pageNumbers.includes(i)) pageNumbers.push(i);
    }
    if (currentPage < totalPages - 2) pageNumbers.push('ellipsis');
    if (totalPages > 1) pageNumbers.push(totalPages);

    return pageNumbers;
}

type ShopCatalogPaginationProps = {
    currentPage: number;
    totalPages: number;
    getPageHref: (page: number) => string;
    className?: string;
    id?: string;
};

export function ShopCatalogPagination({
    currentPage,
    totalPages,
    getPageHref,
    className,
    id,
}: ShopCatalogPaginationProps) {
    const pageNumbers = buildShopPageNumbers(currentPage, totalPages);

    return (
        <nav
            id={id}
            className={cn('flex flex-row flex-wrap items-center justify-center gap-1 sm:justify-end', className)}
            aria-label="Pagination"
        >
            <ul className="flex flex-row flex-wrap items-center justify-center gap-1">
                {pageNumbers.map((n, i) =>
                    n === 'ellipsis' ? (
                        <li key={`ellipsis-${i}`} className="flex h-9 w-9 items-center justify-center text-[#6e4a34]" aria-hidden>
                            …
                        </li>
                    ) : (
                        <li key={n}>
                            <Link
                                href={getPageHref(n)}
                                aria-current={currentPage === n ? 'page' : undefined}
                                className={cn(
                                    'inline-flex h-9 w-9 items-center justify-center rounded-md text-xs font-semibold uppercase tracking-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a78] focus-visible:ring-offset-2',
                                    currentPage === n
                                        ? 'bg-[#6e4a34] text-[#fdf7ef] hover:bg-[#5d3b29]'
                                        : 'border border-[#c49a78] bg-transparent text-[#6e4a34] hover:bg-[#f3e0cf]',
                                )}
                            >
                                {n}
                            </Link>
                        </li>
                    ),
                )}
            </ul>
        </nav>
    );
}
