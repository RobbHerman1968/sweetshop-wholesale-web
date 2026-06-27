'use client';

import { useRouter } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import type { BrandBarNavCategory, BrandBarNavLink } from '@/assets/brand-bar-nav';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

type ShopCategoryNavMobileSelectProps = {
    categories: BrandBarNavCategory[];
    selectedCategoryId?: number | null;
    selectedPageId?: number | null;
    showAllProductsLink?: boolean;
    ariaLabel?: string;
    navVariant?: 'shop' | 'page';
};

type SelectRow =
    | { type: 'section'; label: string }
    | { type: 'link'; value: string; label: string; external: boolean };

type SelectGroupData = {
    key: string;
    label: string | null;
    rows: SelectRow[];
};

function isShopCategoryLink(link: BrandBarNavLink): boolean {
    return link.categoryId != null && link.categoryId > 0 && /^\/shop\/\d+/.test(link.href);
}

function linkMatchesMobileNavVariant(link: BrandBarNavLink, navVariant: 'shop' | 'page'): boolean {
    if (navVariant === 'shop') {
        return isShopCategoryLink(link);
    }

    return (link.pageId != null && link.pageId > 0) || Boolean(link.externalUrl?.trim());
}

function buildSelectGroups(
    categories: BrandBarNavCategory[],
    showAllProductsLink: boolean,
    navVariant: 'shop' | 'page',
): SelectGroupData[] {
    const groups: SelectGroupData[] = [];

    if (showAllProductsLink && navVariant === 'shop') {
        groups.push({
            key: 'shop-all-products',
            label: 'Shop',
            rows: [{ type: 'link', value: '/shop', label: 'All products', external: false }],
        });
    }

    if (navVariant === 'shop') {
        for (const category of categories) {
            for (const section of category.sections) {
                const sectionLinks = section.links.filter((link) => linkMatchesMobileNavVariant(link, navVariant));
                if (sectionLinks.length === 0) continue;

                groups.push({
                    key: `${category.label}-${section.title || 'links'}`,
                    label: section.title.trim() || null,
                    rows: sectionLinks.map((link) => ({
                        type: 'link',
                        value: link.href,
                        label: link.title,
                        external: false,
                    })),
                });
            }
        }

        return groups;
    }

    for (const category of categories) {
        const rows: SelectRow[] = [];

        for (const section of category.sections) {
            const sectionLinks = section.links.filter((link) => linkMatchesMobileNavVariant(link, navVariant));
            if (sectionLinks.length === 0) continue;

            if (section.title) {
                rows.push({ type: 'section', label: section.title });
            }

            for (const link of sectionLinks) {
                rows.push({
                    type: 'link',
                    value: link.href,
                    label: link.title,
                    external: Boolean(link.opensInNewWindow),
                });
            }
        }

        if (rows.length > 0) {
            groups.push({ key: category.label, label: category.label, rows });
        }
    }

    return groups;
}

function findSelectedHref(
    categories: BrandBarNavCategory[],
    selectedCategoryId: number | null | undefined,
    selectedPageId: number | null | undefined,
    showAllProductsLink: boolean,
    navVariant: 'shop' | 'page',
): string {
    if (showAllProductsLink && navVariant === 'shop' && selectedCategoryId == null && selectedPageId == null) {
        return '/shop';
    }

    for (const category of categories) {
        for (const section of category.sections) {
            for (const link of section.links) {
                if (!linkMatchesMobileNavVariant(link, navVariant)) continue;
                if (navVariant === 'shop' && selectedCategoryId != null && link.categoryId === selectedCategoryId) {
                    return link.href;
                }
                if (navVariant === 'page' && selectedPageId != null && link.pageId === selectedPageId) {
                    return link.href;
                }
            }
        }
    }

    return '';
}

function navigateToHref(href: string, external: boolean, router: ReturnType<typeof useRouter>) {
    if (external) {
        window.open(href, '_blank', 'noopener,noreferrer');
        return;
    }

    router.push(href);
}

export function ShopCategoryNavMobileSelect({
    categories,
    selectedCategoryId,
    selectedPageId,
    showAllProductsLink = true,
    ariaLabel = 'Shop categories',
    navVariant = 'shop',
}: ShopCategoryNavMobileSelectProps) {
    const router = useRouter();
    const groups = buildSelectGroups(categories, showAllProductsLink, navVariant);
    const selectedHref = findSelectedHref(
        categories,
        selectedCategoryId,
        selectedPageId,
        showAllProductsLink,
        navVariant,
    );

    if (groups.length === 0) return null;

    const linkExternality = new Map<string, boolean>();
    for (const group of groups) {
        for (const row of group.rows) {
            if (row.type === 'link') {
                linkExternality.set(row.value, row.external);
            }
        }
    }

    return (
        <div className="lg:hidden">
            <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">{ariaLabel}</span>
                <Select
                    value={selectedHref || undefined}
                    onValueChange={(href) => {
                        if (href !== selectedHref) {
                            navigateToHref(href, linkExternality.get(href) ?? false, router);
                        }
                    }}
                >
                    <SelectTrigger aria-label={ariaLabel} className="mt-2">
                        <SelectValue placeholder={`Choose ${ariaLabel.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                        {groups.map((group) => (
                            <SelectGroup key={group.key}>
                                {group.label ? <SelectLabel>{group.label}</SelectLabel> : null}
                                {group.rows.map((row) =>
                                    row.type === 'section' ? (
                                        <SelectLabel
                                            key={`${group.key}-${row.label}`}
                                            className={cn(
                                                'pl-4 text-[10px] font-semibold normal-case tracking-normal text-[#8b6b4a]',
                                            )}
                                        >
                                            {row.label}
                                        </SelectLabel>
                                    ) : (
                                        <SelectItem key={`${group.key}-${row.value}`} value={row.value}>
                                            {row.external ? (
                                                <span className="inline-flex items-center gap-2">
                                                    {row.label}
                                                    <ExternalLink className="size-3 shrink-0 opacity-70" strokeWidth={2} aria-hidden />
                                                    <span className="sr-only"> (opens in new tab)</span>
                                                </span>
                                            ) : (
                                                row.label
                                            )}
                                        </SelectItem>
                                    ),
                                )}
                            </SelectGroup>
                        ))}
                    </SelectContent>
                </Select>
            </label>
        </div>
    );
}
