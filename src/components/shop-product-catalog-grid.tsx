'use client';

import { useCallback, useState } from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RemoteImage } from '@/components/remote-image';
import { ShopAddToCartControls } from '@/components/shop-add-to-cart-controls';
import { cn } from '@/lib/utils';

export type ShopCatalogProduct = {
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

function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Description HTML is expected to use `<p>` / `<div>` blocks per line.
 * Strips: (1) leading indent on each source line; (2) space / NBSP right after each opening `<p>` or `<div>`.
 */
function normalizeDescriptionHtml(html: string): string {
    let s = html.replace(/^(?:[ \t\u00A0]|&nbsp;)+/gm, '');
    s = s.replace(/(<(?:p|div)(?:\s[^>]*)?>)(?:[ \t\u00A0]|&nbsp;)+/gi, '$1');
    return s;
}

function DownloadTab({ text }: { text: string | null | undefined }) {
    const t = text?.trim();
    if (!t) return <p className="text-xs text-[#8b6b4a]">—</p>;
    if (t.includes('<')) {
        return (
            <div
                className="product-title-html text-sm uppercase tracking-[0.12em] text-[#4a2518] [&_a]:underline [&_a]:pointer-events-auto"
                dangerouslySetInnerHTML={{ __html: t }}
            />
        );
    }
    if (/^https?:\/\//i.test(t)) {
        return (
            <a
                href={t}
                className="break-all text-sm font-normal text-[#6e4a34] underline underline-offset-2"
                target="_blank"
                rel="noopener noreferrer"
            >
                {t}
            </a>
        );
    }
    return <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#4a2518]">{t}</p>;
}

function hasRichTextContent(html: string | null | undefined): boolean {
    return stripHtml(html ?? '').length > 0;
}

function hasDownloadContent(text: string | null | undefined): boolean {
    const t = text?.trim();
    if (!t) return false;
    if (/^https?:\/\//i.test(t)) return true;
    if (t.includes('<')) return /href\s*=/i.test(t) || stripHtml(t).length > 0;
    return true;
}

type ProductTabId = 'description' | 'nutrition' | 'ingredients' | 'download';

function getProductTabs(product: ShopCatalogProduct): Array<{ id: ProductTabId; label: string }> {
    const tabs: Array<{ id: ProductTabId; label: string }> = [];
    if (hasRichTextContent(product.description)) tabs.push({ id: 'description', label: 'Description' });
    if (hasRichTextContent(product.nutrition)) tabs.push({ id: 'nutrition', label: 'Nutrition' });
    if (hasRichTextContent(product.ingredients)) tabs.push({ id: 'ingredients', label: 'Ingredients' });
    if (hasDownloadContent(product.download)) tabs.push({ id: 'download', label: 'Downloads' });
    return tabs;
}

function HtmlOrEmptyTab({
    html,
    emptyClassName,
}: {
    html: string | null | undefined;
    emptyClassName?: string;
}) {
    const trimmed = html?.trim();
    if (!trimmed) {
        return <p className={cn('text-xs text-[#8b6b4a]', emptyClassName)}>—</p>;
    }
    return (
        <div
            className="product-title-html text-sm uppercase tracking-[0.12em] text-[#4a2518] [&_a]:underline [&_a]:pointer-events-auto"
            dangerouslySetInnerHTML={{ __html: trimmed }}
        />
    );
}

type Props = {
    products: ShopCatalogProduct[];
    isLoggedIn: boolean;
    shoppingAccountId: number | null;
};

export function ShopProductCatalogGrid({ products, isLoggedIn, shoppingAccountId }: Props) {
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState<ShopCatalogProduct | null>(null);

    const openProduct = useCallback((p: ShopCatalogProduct) => {
        setSelected(p);
        setOpen(true);
    }, []);

    const onOpenChange = useCallback((next: boolean) => {
        setOpen(next);
        if (!next) setSelected(null);
    }, []);

    const handleCardActivate = useCallback(
        (p: ShopCatalogProduct, e: React.MouseEvent | React.KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            if (target?.closest('a') || target?.closest('[data-shop-cart]')) return;
            openProduct(p);
        },
        [openProduct],
    );

    const modalImage = selected?.productImages?.[0]?.vercelImage?.path;
    const modalAlt = stripHtml(selected?.name ?? '') || 'Product';
    const productTabs = selected ? getProductTabs(selected) : [];
    const defaultTab = productTabs[0]?.id ?? 'description';
    const tabColsClass =
        productTabs.length <= 1
            ? 'grid-cols-1'
            : productTabs.length === 2
              ? 'grid-cols-2'
              : productTabs.length === 3
                ? 'grid-cols-3'
                : 'grid-cols-2 md:grid-cols-4';

    return (
        <>
            <ul className="grid gap-2.5 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
                {products.map((p) => {
                    const firstImage = p.productImages?.[0]?.vercelImage?.path;
                    const label = stripHtml(p.name ?? '') || `Product ${p.id}`;
                    return (
                        <li key={p.id} className="h-full">
                            <article
                                role="button"
                                tabIndex={0}
                                aria-haspopup="dialog"
                                aria-label={`View details: ${label}`}
                                className="flex h-full origin-center cursor-pointer flex-col overflow-hidden rounded-lg border border-[#b89572] bg-[#fdf7ef] shadow-sm outline-none transform-[translateZ(0)] transition-[transform_2000ms_ease-in-out,box-shadow_900ms_ease-out] hover:scale-[1.02] hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#c49a78] focus-visible:ring-offset-2"
                                onClick={(e) => handleCardActivate(p, e)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        handleCardActivate(p, e);
                                    }
                                }}
                            >
                                <div className="relative aspect-[5/4] w-full bg-white pointer-events-none sm:aspect-square">
                                    {firstImage ? (
                                        <RemoteImage
                                            src={firstImage}
                                            sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 280px"
                                            className="brightness-110"
                                        />
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-[11px] font-medium uppercase tracking-wider text-[#8b6b4a]">
                                            No image
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-1 flex-col p-2.5 sm:p-4">
                                    <h2
                                        className="product-title-html min-h-[3lh] text-[11px] font-bold uppercase leading-snug tracking-[0.12em] text-[#4a2518] line-clamp-3 sm:min-h-[4lh] sm:text-[12px] sm:line-clamp-4 [&_a]:underline [&_a]:pointer-events-auto"
                                        dangerouslySetInnerHTML={{
                                            __html: p.name?.trim() ? p.name : '—',
                                        }}
                                    />
                                    <p className="mt-0.5 text-[10px] text-[#6e4a34] sm:mt-1 sm:text-[11px]">{p.itemNumber ? `Item #${p.itemNumber}` : '—'}</p>
                                    {isLoggedIn ? (
                                        <p className="mt-auto pt-1.5 text-sm font-semibold text-[#4a2518] sm:pt-3">${Number(p.price).toFixed(2)}</p>
                                    ) : null}
                                    {shoppingAccountId != null ? <ShopAddToCartControls productId={p.id} /> : null}
                                </div>
                            </article>
                        </li>
                    );
                })}
            </ul>

            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent
                    hideCloseButton
                    className={cn(
                        'flex flex-col gap-0 overflow-hidden border-[#b89572] bg-[#fdf7ef] pl-4! pr-0! pb-3! pt-2!',
                        'max-md:top-4! max-md:right-4! max-md:bottom-4! max-md:left-4! max-md:h-auto max-md:max-h-none max-md:w-auto max-md:max-w-none! max-md:translate-x-0! max-md:translate-y-0!',
                        'md:max-h-[min(calc(min(90vh,720px)+100px),80vh)] md:w-[calc(min(72rem,100vw)*0.8)] md:max-w-none!',
                    )}
                >
                    <div className="flex shrink-0 flex-row items-center justify-between gap-2 border-b border-[#b89572]/35 pb-1.5 pr-4">
                        <DialogTitle className="flex-1 min-w-0 text-left text-[11px] font-semibold uppercase tracking-[0.28em] leading-none text-[#8b6b4a]">
                            Product details
                            {selected?.name?.trim() ? (
                                <span className="sr-only">{`: ${stripHtml(selected.name)}`}</span>
                            ) : null}
                        </DialogTitle>
                        <DialogClose
                            type="button"
                            className="-mr-1 -mt-1 inline-flex size-11 shrink-0 items-center justify-center rounded-sm border border-[#b89572]/55 text-[#5c4032] opacity-80 ring-offset-[#fdf7ef] transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a78] focus-visible:ring-offset-2 md:size-8"
                            aria-label="Close dialog"
                        >
                            <X className="size-6 md:size-4" strokeWidth={1.75} aria-hidden />
                        </DialogClose>
                    </div>
                    {selected ? (
                        <div className="flex min-h-0 flex-1 flex-col overflow-hidden pt-2 pr-4">
                            <div className="shrink-0">
                                <div
                                    className="product-title-html mb-3 w-full min-w-0 text-base font-bold uppercase tracking-[0.12em] text-[#4a2518] md:mb-4 [&_a]:underline [&_a]:pointer-events-auto"
                                    dangerouslySetInnerHTML={{
                                        __html: selected.name?.trim() ? selected.name : '—',
                                    }}
                                />
                                <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-start gap-3 md:grid-cols-[auto_minmax(0,1fr)] md:gap-6">
                                    <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-md border border-[#b89572]/60 bg-white md:w-52">
                                        {modalImage ? (
                                            <RemoteImage src={modalImage} alt={modalAlt} sizes="(max-width: 768px) 104px, 208px" />
                                        ) : (
                                            <div className="flex h-full items-center justify-center text-[11px] font-medium uppercase tracking-wider text-[#8b6b4a]">
                                                No image
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm text-[#6e4a34]">
                                            {selected.itemNumber ? `Item #${selected.itemNumber}` : '—'}
                                        </p>
                                        {isLoggedIn ? (
                                            <p className="mt-1 text-sm font-semibold text-[#4a2518]">
                                                ${Number(selected.price).toFixed(2)}
                                            </p>
                                        ) : null}
                                        {shoppingAccountId != null ? (
                                            <ShopAddToCartControls productId={selected.id} variant="detail" className="mt-4 hidden md:block" />
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                            {productTabs.length > 0 ? (
                                <Tabs
                                    key={`${selected.id}-${defaultTab}`}
                                    defaultValue={defaultTab}
                                    className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden"
                                >
                                    <TabsList className={cn('grid! h-auto min-h-10 w-full shrink-0 gap-1.5 p-1', tabColsClass)}>
                                        {productTabs.map((tab) => (
                                            <TabsTrigger key={tab.id} value={tab.id} className="w-full min-w-0">
                                                {tab.label}
                                            </TabsTrigger>
                                        ))}
                                    </TabsList>
                                    {productTabs.some((tab) => tab.id === 'description') ? (
                                        <TabsContent
                                            value="description"
                                            className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-lg border border-[#b89572]/30 bg-[#f6ebdd]/50 p-3 text-left"
                                        >
                                            <div
                                                className="product-title-html flex flex-col gap-2 text-sm uppercase tracking-[0.12em] text-[#4a2518] [&_a]:underline [&_a]:pointer-events-auto"
                                                dangerouslySetInnerHTML={{
                                                    __html: normalizeDescriptionHtml(selected.description?.trim() ?? ''),
                                                }}
                                            />
                                        </TabsContent>
                                    ) : null}
                                    {productTabs.some((tab) => tab.id === 'nutrition') ? (
                                        <TabsContent
                                            value="nutrition"
                                            className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-lg border border-[#b89572]/30 bg-[#f6ebdd]/50 p-3 text-left"
                                        >
                                            <HtmlOrEmptyTab html={selected.nutrition} />
                                        </TabsContent>
                                    ) : null}
                                    {productTabs.some((tab) => tab.id === 'ingredients') ? (
                                        <TabsContent
                                            value="ingredients"
                                            className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-lg border border-[#b89572]/30 bg-[#f6ebdd]/50 p-3 text-left"
                                        >
                                            <HtmlOrEmptyTab html={selected.ingredients} />
                                        </TabsContent>
                                    ) : null}
                                    {productTabs.some((tab) => tab.id === 'download') ? (
                                        <TabsContent
                                            value="download"
                                            className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-lg border border-[#b89572]/30 bg-[#f6ebdd]/50 p-3 text-left"
                                        >
                                            <DownloadTab text={selected.download} />
                                        </TabsContent>
                                    ) : null}
                                </Tabs>
                            ) : null}
                        </div>
                    ) : null}
                    {selected && shoppingAccountId != null ? (
                        <div className="shrink-0 border-t border-[#b89572]/35 bg-[#fdf7ef] pr-4 pt-3 pb-[max(0.25rem,env(safe-area-inset-bottom))] md:hidden">
                            <ShopAddToCartControls productId={selected.id} variant="sheet" />
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>
        </>
    );
}
