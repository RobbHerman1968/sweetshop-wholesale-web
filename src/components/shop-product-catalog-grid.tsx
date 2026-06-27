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

    return (
        <>
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
                                <div className="relative aspect-square w-full bg-white pointer-events-none">
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
                                <div className="flex flex-1 flex-col p-4">
                                    <h2
                                        className="product-title-html min-h-[4lh] text-[12px] font-bold uppercase leading-snug tracking-[0.12em] text-[#4a2518] line-clamp-4 [&_a]:underline [&_a]:pointer-events-auto"
                                        dangerouslySetInnerHTML={{
                                            __html: p.name?.trim() ? p.name : '—',
                                        }}
                                    />
                                    <p className="mt-1 text-[11px] text-[#6e4a34]">{p.itemNumber ? `Item #${p.itemNumber}` : '—'}</p>
                                    {isLoggedIn ? (
                                        <p className="mt-auto pt-3 text-sm font-semibold text-[#4a2518]">${Number(p.price).toFixed(2)}</p>
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
                        'flex max-h-[min(calc(min(92dvh,720px)+100px),92dvh)] w-full max-w-[min(32rem,calc(100vw-40px))]! flex-col overflow-hidden border-[#b89572] bg-[#fdf7ef] pl-4! pr-0! pb-3! pt-2! md:max-h-[min(calc(min(90vh,720px)+100px),80vh)] md:w-[calc(min(72rem,100vw)*0.8)] md:max-w-none!',
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
                    <div className="min-h-0 max-h-[calc(min(calc(min(92dvh,720px)+100px),92dvh)-9rem)] flex-1 overflow-y-auto overscroll-contain pt-2 md:max-h-[calc(min(calc(min(90vh,720px)+100px),80vh)-9rem)]">
                        {selected ? (
                            <div className="pr-4">
                                <div
                                    className="product-title-html mb-4 w-full min-w-0 text-base font-bold uppercase tracking-[0.12em] text-[#4a2518] [&_a]:underline [&_a]:pointer-events-auto"
                                    dangerouslySetInnerHTML={{
                                        __html: selected.name?.trim() ? selected.name : '—',
                                    }}
                                />
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-[auto_minmax(0,1fr)] md:items-start md:gap-6">
                                    <div className="relative aspect-square w-full max-w-sm shrink-0 overflow-hidden rounded-md border border-[#b89572]/60 bg-white md:w-52 md:max-w-none">
                                        {modalImage ? (
                                            <RemoteImage src={modalImage} alt={modalAlt} sizes="(max-width: 768px) 100vw, 208px" />
                                        ) : (
                                            <div className="flex h-full items-center justify-center text-[11px] font-medium uppercase tracking-wider text-[#8b6b4a]">
                                                No image
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        {selected.description?.trim() ? (
                                            <div
                                                className="product-title-html flex flex-col gap-2 text-sm uppercase tracking-[0.12em] text-[#4a2518] [&_a]:underline [&_a]:pointer-events-auto"
                                                dangerouslySetInnerHTML={{
                                                    __html: normalizeDescriptionHtml(selected.description.trim()),
                                                }}
                                            />
                                        ) : (
                                            <p className="text-xs text-[#8b6b4a]">—</p>
                                        )}
                                        <p className="mt-3 text-sm text-[#6e4a34]">
                                            {selected.itemNumber ? `Item #${selected.itemNumber}` : '—'}
                                        </p>
                                        {isLoggedIn ? (
                                            <p className="mt-1 text-sm font-semibold text-[#4a2518]">
                                                ${Number(selected.price).toFixed(2)}
                                            </p>
                                        ) : null}
                                        {shoppingAccountId != null ? (
                                            <ShopAddToCartControls productId={selected.id} variant="detail" className="mt-4" />
                                        ) : null}
                                    </div>
                                </div>
                                <Tabs defaultValue="nutrition" className="mt-5 w-full">
                                    <TabsList className="grid! h-auto min-h-10 w-full grid-cols-3 gap-1.5 p-1">
                                        <TabsTrigger value="nutrition" className="w-full min-w-0">
                                            Nutrition
                                        </TabsTrigger>
                                        <TabsTrigger value="ingredients" className="w-full min-w-0">
                                            Ingredients
                                        </TabsTrigger>
                                        <TabsTrigger value="download" className="w-full min-w-0">
                                            Downloads
                                        </TabsTrigger>
                                    </TabsList>
                                    <TabsContent
                                        value="nutrition"
                                        className="mt-3 rounded-lg border border-[#b89572]/30 bg-[#f6ebdd]/50 p-3 text-left"
                                    >
                                        <HtmlOrEmptyTab html={selected.nutrition} />
                                    </TabsContent>
                                    <TabsContent
                                        value="ingredients"
                                        className="mt-3 rounded-lg border border-[#b89572]/30 bg-[#f6ebdd]/50 p-3 text-left"
                                    >
                                        <HtmlOrEmptyTab html={selected.ingredients} />
                                    </TabsContent>
                                    <TabsContent
                                        value="download"
                                        className="mt-3 rounded-lg border border-[#b89572]/30 bg-[#f6ebdd]/50 p-3 text-left"
                                    >
                                        <DownloadTab text={selected.download} />
                                    </TabsContent>
                                </Tabs>
                            </div>
                        ) : null}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
