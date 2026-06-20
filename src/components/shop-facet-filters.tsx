'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useRef } from 'react';
import { formatShopFacetLabel, SHOP_PRODUCT_FACETS } from '@/lib/shop-product-facets';
import { cn } from '@/lib/utils';

type Props = {
    search: string;
    facetIds: string[];
    /** Facet ids to show (matches catalog scope + currently selected for removal). */
    visibleFacetIds: string[];
    /** From server: false = no products if this facet were checked with current selection (grey out). */
    facetAvailability: Record<string, boolean>;
    /** Base shop path for filter URL updates (default `/shop`). */
    shopPath?: string;
};

export function ShopFacetFilters({ search, facetIds, visibleFacetIds, facetAvailability, shopPath = '/shop' }: Props) {
    const router = useRouter();
    const formRef = useRef<HTMLFormElement>(null);

    const syncUrlFromForm = useCallback(() => {
        const form = formRef.current;
        if (!form) return;
        const fd = new FormData(form);
        const facets = fd.getAll('facet').map(String);
        const params = new URLSearchParams();
        const s = search.trim();
        if (s) params.set('search', s);
        for (const id of facets) params.append('facet', id);
        const qs = params.toString();
        const next = qs ? `${shopPath}?${qs}` : shopPath;
        if (typeof window !== 'undefined') {
            const cur = `${window.location.pathname}${window.location.search}`;
            if (cur === next) return;
        }
        router.replace(next, { scroll: false });
    }, [search, router, shopPath]);

    const visibleSet = new Set(visibleFacetIds);
    const facetsToShow = SHOP_PRODUCT_FACETS.filter((f) => visibleSet.has(f.id));

    return (
        <form ref={formRef} onChange={syncUrlFromForm}>
            <fieldset className="space-y-3 border-0 p-0">
                <legend className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8b6b4a]">Product keywords</legend>
                {facetsToShow.length === 0 ? (
                    <p className="text-[10px] leading-relaxed text-[#8b6b4a]">No keyword filters apply to the products shown here.</p>
                ) : (
                <ul className="space-y-2 text-sm text-[#4a2b1f]">
                    {facetsToShow.map((f) => {
                        const isChecked = facetIds.includes(f.id);
                        const hasMatches = facetAvailability[f.id] !== false;
                        const disabled = !isChecked && !hasMatches;
                        return (
                            <li key={f.id}>
                                <label
                                    className={cn(
                                        'flex items-start gap-2 leading-snug',
                                        disabled ? 'cursor-not-allowed opacity-45' : 'cursor-pointer',
                                    )}
                                    title={
                                        disabled
                                            ? 'No products match this keyword with your current filters'
                                            : undefined
                                    }
                                >
                                    <input
                                        type="checkbox"
                                        name="facet"
                                        value={f.id}
                                        defaultChecked={isChecked}
                                        disabled={disabled}
                                        className="mt-0.5 size-4 shrink-0 rounded border-[#c49a78] text-[#6e4a34] focus:ring-[#c49a78] disabled:cursor-not-allowed"
                                    />
                                    <span className={disabled ? 'text-[#8b6b4a]' : undefined}>{formatShopFacetLabel(f.label)}</span>
                                </label>
                            </li>
                        );
                    })}
                </ul>
                )}
            </fieldset>
        </form>
    );
}
