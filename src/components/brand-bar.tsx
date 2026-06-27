'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject, type TouchEvent } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import type { BrandBarNavCategory } from '@/assets/brand-bar-nav';
import { applyShopByLocationAccountName, isShopByLocationBrandBarCategory } from '@/lib/brand-bar-shop-by-location';
import { MenuNavLink } from '@/components/menu-nav-link';
import { useShopCartStore } from '@/store/useShopCartStore';
import { cn } from '@/lib/utils';
import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuList,
    NavigationMenuTrigger,
    navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';

type BrandBarProps = {
    categories: BrandBarNavCategory[];
};

function categoryShowsDescription(cat: BrandBarNavCategory) {
    return cat.description.trim().toLowerCase() !== cat.label.trim().toLowerCase();
}

type HorizontalScrollState = {
    canScrollLeft: boolean;
    canScrollRight: boolean;
    isScrollable: boolean;
};

function useHorizontalScrollState(scrollRef: RefObject<HTMLDivElement | null>) {
    const [state, setState] = useState<HorizontalScrollState>({
        canScrollLeft: false,
        canScrollRight: false,
        isScrollable: false,
    });

    const update = useCallback(() => {
        const element = scrollRef.current;
        if (!element) return;

        const { scrollLeft, scrollWidth, clientWidth } = element;
        const isScrollable = scrollWidth > clientWidth + 1;

        setState({
            isScrollable,
            canScrollLeft: isScrollable && scrollLeft > 1,
            canScrollRight: isScrollable && scrollLeft + clientWidth < scrollWidth - 1,
        });
    }, [scrollRef]);

    useEffect(() => {
        const element = scrollRef.current;
        if (!element) return;

        update();
        element.addEventListener('scroll', update, { passive: true });

        const resizeObserver = new ResizeObserver(update);
        resizeObserver.observe(element);
        if (element.firstElementChild) {
            resizeObserver.observe(element.firstElementChild);
        }

        return () => {
            element.removeEventListener('scroll', update);
            resizeObserver.disconnect();
        };
    }, [scrollRef, update]);

    return { ...state, update };
}

type HorizontalScrollHintsProps = {
    children: ReactNode;
    className?: string;
    scrollClassName?: string;
    fadeFromClassName?: string;
    hintLabel?: string;
    scrollRef?: RefObject<HTMLDivElement | null>;
    onTouchStart?: (event: TouchEvent<HTMLDivElement>) => void;
    onTouchMove?: (event: TouchEvent<HTMLDivElement>) => void;
};

function HorizontalScrollHints({
    children,
    className,
    scrollClassName,
    fadeFromClassName = 'from-white',
    hintLabel,
    scrollRef: externalScrollRef,
    onTouchStart,
    onTouchMove,
}: HorizontalScrollHintsProps) {
    const internalScrollRef = useRef<HTMLDivElement>(null);
    const scrollRef = externalScrollRef ?? internalScrollRef;
    const { canScrollLeft, canScrollRight, isScrollable, update } = useHorizontalScrollState(scrollRef);

    const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
        onTouchMove?.(event);
        requestAnimationFrame(update);
    };

    return (
        <div className={cn('relative', className)}>
            {hintLabel && isScrollable ? (
                <p className="sr-only">{hintLabel}</p>
            ) : null}
            <div
                aria-hidden
                className={cn(
                    'pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r to-transparent transition-opacity duration-200',
                    fadeFromClassName,
                    canScrollLeft ? 'opacity-100' : 'opacity-0',
                )}
            />
            <div
                aria-hidden
                className={cn(
                    'pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l to-transparent transition-opacity duration-200',
                    fadeFromClassName,
                    canScrollRight ? 'opacity-100' : 'opacity-0',
                )}
            />
            {isScrollable && canScrollLeft ? (
                <ChevronLeft
                    aria-hidden
                    className="pointer-events-none absolute left-1 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[#8b6b4a]/75"
                    strokeWidth={2.25}
                />
            ) : null}
            {isScrollable && canScrollRight ? (
                <ChevronRight
                    aria-hidden
                    className="pointer-events-none absolute right-1 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[#8b6b4a]/75"
                    strokeWidth={2.25}
                />
            ) : null}
            <div
                ref={scrollRef}
                className={scrollClassName}
                onTouchStart={onTouchStart}
                onTouchMove={handleTouchMove}
                onScroll={update}
            >
                {children}
            </div>
        </div>
    );
}

function categoryShowsAccountNameOnTrigger(cat: BrandBarNavCategory) {
    return (
        isShopByLocationBrandBarCategory(cat.label) &&
        cat.description.trim().toLowerCase() !== cat.label.trim().toLowerCase()
    );
}

function BrandBarCategoryTriggerLabel({ cat }: { cat: BrandBarNavCategory }) {
    if (!categoryShowsAccountNameOnTrigger(cat)) {
        return cat.label;
    }

    return (
        <span className="flex flex-col items-start leading-tight">
            <span>{cat.label}</span>
            <span className="max-w-[12rem] truncate text-[10px] font-normal normal-case tracking-normal text-[#8b6b4a]">
                {cat.description}
            </span>
        </span>
    );
}

function CategoryMegaMenuPanel({ cat }: { cat: BrandBarNavCategory }) {
    const showDescription = categoryShowsDescription(cat);

    return (
        <div className="w-max min-w-full p-4 sm:w-full sm:min-w-[220px] sm:p-5">
            {showDescription ? (
                <p className="mb-4 border-b border-[#e8ddd4] pb-2 text-left text-[12px] font-normal leading-snug normal-case tracking-normal text-[#8b6b4a] sm:pb-3 sm:text-[13px]">
                    {cat.description}
                </p>
            ) : null}
            <ul
                className={cn(
                    'flex w-max min-w-full gap-6 pb-1 sm:grid sm:w-full sm:grid-cols-2 sm:gap-x-8 sm:gap-y-5 sm:pb-0',
                    !showDescription && 'pt-0.5',
                )}
            >
                {cat.sections.map((section) => (
                    <li key={`${cat.label}-${section.title || 'links'}`} className="w-44 shrink-0 sm:w-auto sm:min-w-0">
                        {section.title ? (
                            <p className="mb-2 border-b border-[#ebe0d4] pb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#5c4032]">
                                {section.title}
                            </p>
                        ) : null}
                        <ul className="space-y-0.5">
                            {section.links.map((link) => (
                                <li key={`${cat.label}-${section.title}-${link.title}`}>
                                    <MenuNavLink
                                        link={link}
                                        className="block rounded-sm px-1 py-1 text-left text-[12px] font-normal uppercase tracking-normal text-[#5c4032] transition-colors hover:bg-[#f3e0cf] hover:text-[#3c251a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c4a882] focus-visible:ring-offset-1"
                                    />
                                </li>
                            ))}
                        </ul>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function MobileBrandBar({ categories }: BrandBarProps) {
    const [openLabel, setOpenLabel] = useState<string | null>(null);
    const openCategory = categories.find((cat) => cat.label === openLabel) ?? null;
    const scrollRef = useRef<HTMLDivElement>(null);
    const touchStartRef = useRef<{ x: number; scrollLeft: number } | null>(null);
    const didScrollRef = useRef(false);

    const onTouchStart = (event: TouchEvent<HTMLDivElement>) => {
        const touch = event.touches[0];
        if (!touch || !scrollRef.current) return;
        touchStartRef.current = { x: touch.clientX, scrollLeft: scrollRef.current.scrollLeft };
        didScrollRef.current = false;
    };

    const onTouchMove = (event: TouchEvent<HTMLDivElement>) => {
        const touch = event.touches[0];
        const start = touchStartRef.current;
        if (!touch || !start || !scrollRef.current) return;

        const deltaX = start.x - touch.clientX;
        if (Math.abs(deltaX) < 4) return;

        didScrollRef.current = true;
        scrollRef.current.scrollLeft = start.scrollLeft + deltaX;
    };

    const onCategoryClick = (label: string, isOpen: boolean) => {
        if (didScrollRef.current) {
            didScrollRef.current = false;
            return;
        }
        setOpenLabel(isOpen ? null : label);
    };

    return (
        <div className="sm:hidden">
            <HorizontalScrollHints
                scrollRef={scrollRef}
                hintLabel="Swipe left or right to see more categories"
                scrollClassName="w-full min-w-0 overflow-x-scroll overscroll-x-contain px-3 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] touch-pan-x [&::-webkit-scrollbar]:hidden"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
            >
                <div className="flex w-max min-w-full gap-0" aria-label="Product categories">
                    {categories.map((cat) => {
                        const isOpen = openLabel === cat.label;

                        return (
                            <button
                                key={cat.label}
                                type="button"
                                aria-expanded={isOpen}
                                className={cn(
                                    navigationMenuTriggerStyle,
                                    'shrink-0 touch-pan-x select-none',
                                    isOpen && 'bg-[#ede0d4]',
                                )}
                                onClick={() => onCategoryClick(cat.label, isOpen)}
                            >
                                <BrandBarCategoryTriggerLabel cat={cat} />{' '}
                                <ChevronDown
                                    className={cn(
                                        'relative top-px ml-0.5 h-3 w-3 transition duration-200',
                                        isOpen && 'rotate-180',
                                    )}
                                    aria-hidden
                                />
                            </button>
                        );
                    })}
                </div>
            </HorizontalScrollHints>
            {openCategory ? (
                <HorizontalScrollHints
                    className="mx-3 mt-1.5 overflow-hidden rounded-md border border-[#d4c4b0] bg-white text-[#5c4032] shadow-md"
                    hintLabel="Swipe left or right to see more menu sections"
                    scrollClassName="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] [scrollbar-width:none] touch-pan-x [&::-webkit-scrollbar]:hidden"
                >
                    <CategoryMegaMenuPanel cat={openCategory} />
                </HorizontalScrollHints>
            ) : null}
        </div>
    );
}

function DesktopBrandBar({ categories }: BrandBarProps) {
    return (
        <div className="hidden sm:flex sm:justify-center">
            <NavigationMenu className="max-w-none">
                <NavigationMenuList className="flex-wrap justify-center gap-0 sm:gap-1">
                    {categories.map((cat) => (
                        <NavigationMenuItem key={cat.label}>
                            <NavigationMenuTrigger className="data-[state=open]:bg-[#ede0d4]">
                                <BrandBarCategoryTriggerLabel cat={cat} />
                            </NavigationMenuTrigger>
                            <NavigationMenuContent className="max-w-[min(100vw-2rem,560px)]">
                                <CategoryMegaMenuPanel cat={cat} />
                            </NavigationMenuContent>
                        </NavigationMenuItem>
                    ))}
                </NavigationMenuList>
            </NavigationMenu>
        </div>
    );
}

export function BrandBar({ categories }: BrandBarProps) {
    const accountDisplayName = useShopCartStore((state) => state.accountDisplayName);
    const displayCategories = useMemo(
        () => applyShopByLocationAccountName(categories, accountDisplayName),
        [categories, accountDisplayName],
    );

    if (displayCategories.length === 0) return null;

    return (
        <nav className="w-full min-w-0 py-0" aria-label="Product categories">
            <div className="mx-auto w-full min-w-0 max-w-6xl sm:px-4">
                <MobileBrandBar categories={displayCategories} />
                <DesktopBrandBar categories={displayCategories} />
            </div>
        </nav>
    );
}
