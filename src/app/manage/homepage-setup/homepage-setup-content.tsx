'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { RemoteImage } from '@/components/remote-image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import {
    getActiveProductsForCategoryForHomepageSetup,
    removeHomePageSectionAtIndex,
    resetHomePageContentToDefaults,
    saveHomePageHero,
    saveHomePageSectionAtIndex,
    saveHomePageSectionOrder,
    type HomepageCategoryOption,
    type HomepageProductOption,
} from '@/lib/db-pg/actions/homepage';
import {
    createEmptyHomePageSection,
    HOMEPAGE_SECTION_DESCRIPTION_MAX_LENGTH,
    HOMEPAGE_SECTION_PRODUCT_COUNT,
    HOMEPAGE_SECTION_TITLE_MAX_LENGTH,
    resolveHomePageSectionTitle,
    type HomePageContent,
    type HomePageSectionConfig,
} from '@/lib/homepage-content';
import { cn } from '@/lib/utils';

type HomepageSetupContentProps = {
    initialContent: HomePageContent;
    categories: HomepageCategoryOption[];
};

const textFieldClassName =
    'flex w-full rounded-md border border-[#d1b79a] bg-white px-3 py-2 text-base text-[#4a2b1f] outline-none ring-amber-300 focus:ring sm:text-sm';

const sectionClassName = 'space-y-4 rounded-2xl border border-[#c49a78] bg-[#f8eddf] p-6';
const labelClassName = 'text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]';

function stripHtml(value: string): string {
    return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function productDisplayName(product: Pick<HomepageProductOption, 'id' | 'name' | 'itemNumber'>): string {
    const name = stripHtml(product.name) || `Product ${product.id}`;
    return product.itemNumber ? `${name} (${product.itemNumber})` : name;
}

function getSectionAccordionTitle(section: HomePageSectionConfig, index: number, categories: HomepageCategoryOption[]): string {
    const category = categories.find((item) => item.id === section.categoryId);
    return resolveHomePageSectionTitle(section.title, category?.name ?? '', index);
}

function SectionAccordion({
    title,
    subtitle,
    isOpen,
    canMoveUp,
    canMoveDown,
    isSaving,
    onToggle,
    onMoveUp,
    onMoveDown,
    children,
}: {
    title: string;
    subtitle?: string;
    isOpen: boolean;
    canMoveUp: boolean;
    canMoveDown: boolean;
    isSaving: boolean;
    onToggle: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    children: React.ReactNode;
}) {
    return (
        <div className="overflow-hidden rounded-xl border border-[#d1b79a] bg-[#fdf7ef]">
            <div className={cn('flex items-center gap-2 bg-[#f8eddf] px-3 py-2 sm:px-4 sm:py-3', isOpen && 'border-b border-[#d1b79a]')}>
                <button
                    type="button"
                    onClick={onToggle}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left transition-colors hover:text-[#4a2518]"
                    aria-expanded={isOpen}
                >
                    <ChevronDown className={cn('h-4 w-4 shrink-0 text-[#6e4a34] transition-transform', isOpen && 'rotate-180')} />
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-semibold uppercase tracking-[0.18em] text-[#4a2518]">{title}</span>
                        {subtitle ? <span className="mt-0.5 block truncate text-[10px] text-[#6e4a34]">{subtitle}</span> : null}
                    </span>
                </button>
                <div className="flex shrink-0 gap-1">
                    <Button
                        type="button"
                        variant="outline"
                        className="h-8 w-8 p-0"
                        disabled={!canMoveUp || isSaving}
                        onClick={onMoveUp}
                        aria-label="Move section up"
                    >
                        <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        className="h-8 w-8 p-0"
                        disabled={!canMoveDown || isSaving}
                        onClick={onMoveDown}
                        aria-label="Move section down"
                    >
                        <ChevronDown className="h-4 w-4" />
                    </Button>
                </div>
            </div>
            {isOpen ? <div className="p-4">{children}</div> : null}
        </div>
    );
}

function SelectedProductSlot({
    slotIndex,
    product,
    canMoveLeft,
    canMoveRight,
    onRemove,
    onMoveLeft,
    onMoveRight,
}: {
    slotIndex: number;
    product: HomepageProductOption | null;
    canMoveLeft: boolean;
    canMoveRight: boolean;
    onRemove: () => void;
    onMoveLeft: () => void;
    onMoveRight: () => void;
}) {
    const label = `Position ${slotIndex + 1}`;

    return (
        <div className="overflow-hidden rounded-lg border border-[#d1b79a] bg-white p-2">
            <div className="flex gap-2">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-[#faf0e6]">
                    {product?.imagePath ? (
                        <RemoteImage src={product.imagePath} alt={product ? productDisplayName(product) : label} sizes="56px" className="brightness-110" />
                    ) : (
                        <div className="flex h-full items-center justify-center px-1 text-center text-[8px] font-medium uppercase tracking-wider text-[#8b6b4a]">Empty</div>
                    )}
                    <span className="absolute left-1 top-1 rounded-full bg-[#4a2518] px-1.5 py-0.5 text-[8px] font-semibold text-[#fdf7ef]">{slotIndex + 1}</span>
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#6e4a34]">{label}</p>
                    <p className="mt-0.5 line-clamp-2 text-[9px] font-semibold uppercase leading-snug tracking-[0.06em] text-[#4a2518]">
                        {product ? productDisplayName(product) : 'Choose below'}
                    </p>
                </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
                <Button type="button" variant="outline" className="h-7 px-2 text-[9px]" disabled={!canMoveLeft || !product} onClick={onMoveLeft} aria-label={`Move ${label} left`}>
                    ←
                </Button>
                <Button type="button" variant="outline" className="h-7 px-2 text-[9px]" disabled={!canMoveRight || !product} onClick={onMoveRight} aria-label={`Move ${label} right`}>
                    →
                </Button>
                <Button type="button" variant="outline" className="h-7 px-2 text-[9px]" disabled={!product} onClick={onRemove}>
                    Remove
                </Button>
            </div>
        </div>
    );
}

function ProductPickerCard({
    product,
    slotNumber,
    isSelected,
    onSelect,
}: {
    product: HomepageProductOption;
    slotNumber: number | null;
    isSelected: boolean;
    onSelect: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onSelect}
            disabled={isSelected}
            className={cn(
                'group flex h-full flex-col overflow-hidden rounded-xl border-2 bg-[#faf0e6] text-left shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a78] focus-visible:ring-offset-2',
                isSelected ? 'cursor-default border-[#8b6342] opacity-80 ring-2 ring-[#c49a78]/40' : 'border-[#d1b79a] hover:border-[#b89572] hover:shadow-md',
            )}
        >
            <div className="relative aspect-square w-full bg-white">
                {product.imagePath ? (
                    <RemoteImage src={product.imagePath} alt={productDisplayName(product)} sizes="(max-width: 640px) 33vw, 120px" className="brightness-110" />
                ) : (
                    <div className="flex h-full items-center justify-center text-[10px] font-medium uppercase tracking-wider text-[#8b6b4a]">No image</div>
                )}
                {slotNumber != null ? (
                    <span className="absolute left-2 top-2 rounded-full bg-[#4a2518] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#fdf7ef]">
                        {slotNumber}
                    </span>
                ) : null}
            </div>
            <div className="flex flex-1 flex-col p-2.5">
                <p className="line-clamp-3 min-h-[3.6em] text-[10px] font-bold uppercase leading-snug tracking-[0.08em] text-[#4a2518]">{productDisplayName(product)}</p>
                <p className="mt-auto pt-2 text-[10px] font-medium text-[#6e4a34]">{isSelected ? 'Selected' : 'Add to next open slot'}</p>
            </div>
        </button>
    );
}

type SectionEditorProps = {
    section: HomePageSectionConfig;
    index: number;
    categories: HomepageCategoryOption[];
    isSaving: boolean;
    onChange: (next: HomePageSectionConfig) => void;
    onSave: () => void;
    onRemove: () => void;
};

function SectionEditor({ section, index, categories, isSaving, onChange, onSave, onRemove }: SectionEditorProps) {
    const [products, setProducts] = useState<HomepageProductOption[]>([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(false);

    useEffect(() => {
        let cancelled = false;

        if (!section.categoryId) {
            setProducts([]);
            return;
        }

        setIsLoadingProducts(true);
        getActiveProductsForCategoryForHomepageSetup(section.categoryId)
            .then((rows) => {
                if (!cancelled) {
                    setProducts(rows);
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setIsLoadingProducts(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [section.categoryId]);

    const productsById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);

    const selectedProducts = useMemo(
        () =>
            section.productIds.map((productId, slotIndex) => ({
                slotIndex,
                product: productId > 0 ? (productsById.get(productId) ?? null) : null,
            })),
        [productsById, section.productIds],
    );

    const slotNumberByProductId = useMemo(() => {
        const map = new Map<number, number>();
        section.productIds.forEach((productId, slotIndex) => {
            if (productId > 0) {
                map.set(productId, slotIndex + 1);
            }
        });
        return map;
    }, [section.productIds]);

    const toggleProduct = useCallback(
        (productId: number) => {
            if (slotNumberByProductId.has(productId)) {
                return;
            }

            const emptyIndex = section.productIds.findIndex((id) => id <= 0);
            if (emptyIndex < 0) {
                toast({
                    title: 'Three products already selected',
                    description: 'Use Remove on a selected product above, then click a different product below.',
                    variant: 'destructive',
                });
                return;
            }

            const nextIds = [...section.productIds];
            nextIds[emptyIndex] = productId;
            onChange({ ...section, productIds: nextIds });
        },
        [onChange, section, slotNumberByProductId],
    );

    const removeSlot = useCallback(
        (slotIndex: number) => {
            const nextIds = [...section.productIds];
            nextIds[slotIndex] = 0;
            onChange({ ...section, productIds: nextIds });
        },
        [onChange, section],
    );

    const moveSlot = useCallback(
        (slotIndex: number, direction: -1 | 1) => {
            const targetIndex = slotIndex + direction;
            if (targetIndex < 0 || targetIndex >= HOMEPAGE_SECTION_PRODUCT_COUNT) {
                return;
            }

            const nextIds = [...section.productIds];
            [nextIds[slotIndex], nextIds[targetIndex]] = [nextIds[targetIndex], nextIds[slotIndex]];
            onChange({ ...section, productIds: nextIds });
        },
        [onChange, section],
    );

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button type="button" variant="outline" className="text-[11px]" disabled={isSaving} onClick={onRemove}>
                    Delete section
                </Button>
            </div>

            <div className="space-y-1">
                <label className={labelClassName} htmlFor={`section-${index}-title`}>
                    Section title
                </label>
                <Input
                    id={`section-${index}-title`}
                    value={section.title}
                    maxLength={HOMEPAGE_SECTION_TITLE_MAX_LENGTH}
                    placeholder="Optional — uses category name when blank"
                    className={textFieldClassName}
                    onChange={(event) => onChange({ ...section, title: event.target.value })}
                />
                <p className="text-[10px] text-[#6e4a34]">
                    {section.title.length}/{HOMEPAGE_SECTION_TITLE_MAX_LENGTH}. Leave blank to show the category name on the homepage.
                </p>
            </div>

            <div className="space-y-1">
                <label className={labelClassName}>Category</label>
                <Select
                    value={section.categoryId > 0 ? String(section.categoryId) : ''}
                    onValueChange={(value) => {
                        onChange({
                            ...section,
                            categoryId: Number.parseInt(value, 10) || 0,
                            productIds: Array.from({ length: HOMEPAGE_SECTION_PRODUCT_COUNT }, () => 0),
                        });
                    }}
                >
                    <SelectTrigger className="border-[#d1b79a] bg-white text-sm font-normal normal-case shadow-none">
                        <SelectValue placeholder="Select an active category" />
                    </SelectTrigger>
                    <SelectContent>
                        {categories.map((category) => (
                            <SelectItem key={category.id} value={String(category.id)}>
                                {category.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-1">
                <label className={labelClassName} htmlFor={`section-${index}-description`}>
                    Description
                </label>
                <textarea
                    id={`section-${index}-description`}
                    value={section.description}
                    maxLength={HOMEPAGE_SECTION_DESCRIPTION_MAX_LENGTH}
                    rows={4}
                    className={`${textFieldClassName} min-h-[96px]`}
                    onChange={(event) => onChange({ ...section, description: event.target.value })}
                />
                <p className="text-[10px] text-[#6e4a34]">
                    {section.description.length}/{HOMEPAGE_SECTION_DESCRIPTION_MAX_LENGTH}
                </p>
            </div>

            <div className="space-y-4">
                <div>
                    <p className={labelClassName}>Selected products ({HOMEPAGE_SECTION_PRODUCT_COUNT} required)</p>
                    <p className="mt-1 text-xs text-[#6e4a34]">
                        Left to right is the homepage order. Use <strong>Remove</strong> to clear a slot, then pick a replacement below. Use <strong>←</strong> / <strong>→</strong> to reorder.
                    </p>
                </div>

                {section.categoryId <= 0 ? (
                    <p className="text-xs text-[#6e4a34]">Choose a category to load active products.</p>
                ) : isLoadingProducts ? (
                    <p className="text-xs text-[#6e4a34]">Loading products…</p>
                ) : products.length < HOMEPAGE_SECTION_PRODUCT_COUNT ? (
                    <p className="text-xs text-[#6e4a34]">This category needs at least {HOMEPAGE_SECTION_PRODUCT_COUNT} active products.</p>
                ) : (
                    <>
                        <div className="grid max-w-2xl grid-cols-1 gap-2 sm:grid-cols-3">
                            {selectedProducts.map(({ slotIndex, product }) => (
                                <SelectedProductSlot
                                    key={slotIndex}
                                    slotIndex={slotIndex}
                                    product={product}
                                    canMoveLeft={slotIndex > 0}
                                    canMoveRight={slotIndex < HOMEPAGE_SECTION_PRODUCT_COUNT - 1}
                                    onRemove={() => removeSlot(slotIndex)}
                                    onMoveLeft={() => moveSlot(slotIndex, -1)}
                                    onMoveRight={() => moveSlot(slotIndex, 1)}
                                />
                            ))}
                        </div>

                        <div>
                            <p className={labelClassName}>Choose products</p>
                            <p className="mt-1 text-xs text-[#6e4a34]">Click an unselected product to fill the next open slot.</p>
                            <ul className="mt-3 grid max-h-[28rem] gap-3 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {products.map((product) => (
                                    <li key={product.id} className="h-full">
                                        <ProductPickerCard
                                            product={product}
                                            slotNumber={slotNumberByProductId.get(product.id) ?? null}
                                            isSelected={slotNumberByProductId.has(product.id)}
                                            onSelect={() => toggleProduct(product.id)}
                                        />
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </>
                )}
            </div>

            <div className="flex justify-end border-t border-[#e8d5c0] pt-4">
                <Button type="button" variant="primary" disabled={isSaving} onClick={onSave}>
                    {isSaving ? 'Saving section…' : 'Save section'}
                </Button>
            </div>
        </div>
    );
}

export function HomepageSetupContent({ initialContent, categories }: HomepageSetupContentProps) {
    const router = useRouter();
    const [hero, setHero] = useState(initialContent.hero);
    const [sections, setSections] = useState<HomePageSectionConfig[]>(initialContent.sections);
    const [openSections, setOpenSections] = useState<Record<number, boolean>>({});
    const [isSavingHero, setIsSavingHero] = useState(false);
    const [savingSectionIndex, setSavingSectionIndex] = useState<number | null>(null);
    const [isSavingSectionOrder, setIsSavingSectionOrder] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

    useEffect(() => {
        setHero(initialContent.hero);
        setSections(initialContent.sections);
        setOpenSections({});
    }, [initialContent]);

    const updateSection = useCallback((index: number, next: HomePageSectionConfig) => {
        setSections((current) => current.map((section, sectionIndex) => (sectionIndex === index ? next : section)));
    }, []);

    const toggleSectionOpen = useCallback((index: number) => {
        setOpenSections((current) => ({ ...current, [index]: !current[index] }));
    }, []);

    const addSection = useCallback(() => {
        setSections((current) => {
            const nextIndex = current.length;
            setOpenSections((open) => ({ ...open, [nextIndex]: true }));
            return [...current, createEmptyHomePageSection()];
        });
    }, []);

    const removeSection = useCallback(
        async (index: number) => {
            if (!window.confirm('Delete this homepage section?')) {
                return;
            }

            const nextSections = sections.filter((_, sectionIndex) => sectionIndex !== index);
            setSavingSectionIndex(index);
            const result = await removeHomePageSectionAtIndex(index, sections);
            setSavingSectionIndex(null);

            if (!result.ok) {
                toast({ title: 'Unable to delete section', description: result.error, variant: 'destructive' });
                return;
            }

            setSections(nextSections);
            toast({ title: 'Section deleted', description: 'The section was removed from the homepage.' });
            router.refresh();
        },
        [router, sections],
    );

    const moveSection = useCallback(
        async (index: number, direction: -1 | 1) => {
            const targetIndex = index + direction;
            if (targetIndex < 0 || targetIndex >= sections.length) {
                return;
            }

            const nextSections = [...sections];
            [nextSections[index], nextSections[targetIndex]] = [nextSections[targetIndex], nextSections[index]];

            setSections(nextSections);
            setOpenSections((open) => {
                const nextOpen = { ...open };
                const openAtIndex = open[index];
                const openAtTarget = open[targetIndex];

                if (openAtIndex !== undefined) {
                    nextOpen[targetIndex] = openAtIndex;
                } else {
                    delete nextOpen[targetIndex];
                }

                if (openAtTarget !== undefined) {
                    nextOpen[index] = openAtTarget;
                } else {
                    delete nextOpen[index];
                }

                return nextOpen;
            });

            setIsSavingSectionOrder(true);
            const result = await saveHomePageSectionOrder(nextSections);
            setIsSavingSectionOrder(false);

            if (!result.ok) {
                toast({ title: 'Unable to reorder sections', description: result.error, variant: 'destructive' });
                router.refresh();
                return;
            }

            router.refresh();
        },
        [router, sections],
    );

    async function handleSaveHero() {
        setIsSavingHero(true);
        const result = await saveHomePageHero(hero);
        setIsSavingHero(false);

        if (!result.ok) {
            toast({ title: 'Unable to save hero', description: result.error, variant: 'destructive' });
            return;
        }

        toast({ title: 'Hero saved', description: 'Hero changes are live on the homepage.' });
        router.refresh();
    }

    async function handleSaveSection(index: number) {
        setSavingSectionIndex(index);
        const result = await saveHomePageSectionAtIndex(index, sections[index], sections);
        setSavingSectionIndex(null);

        if (!result.ok) {
            toast({ title: 'Unable to save section', description: result.error, variant: 'destructive' });
            return;
        }

        toast({ title: 'Section saved', description: 'This section is live on the homepage.' });
        setOpenSections((current) => ({ ...current, [index]: false }));
        router.refresh();
    }

    async function handleReset() {
        if (!window.confirm('Reset hero to defaults and remove all homepage sections?')) {
            return;
        }

        setIsResetting(true);
        const result = await resetHomePageContentToDefaults();
        setIsResetting(false);

        if (!result.ok) {
            toast({ title: 'Unable to reset homepage', description: result.error, variant: 'destructive' });
            return;
        }

        toast({ title: 'Homepage reset', description: 'Default homepage content has been restored.' });
        router.refresh();
    }

    const isBusy = isSavingHero || savingSectionIndex != null || isSavingSectionOrder || isResetting;

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-[14px] font-semibold uppercase tracking-[0.3em] text-[#6e4a34]">HomePage Setup</h1>
                    <p className="mt-2 text-xs text-[#6e4a34]">
                        Save the hero and each section independently. Collapsed sections show their category name; expand to edit.
                    </p>
                </div>
                <Button type="button" variant="outline" className="shrink-0 text-[11px]" disabled={isBusy} onClick={handleReset}>
                    {isResetting ? 'Resetting…' : 'Reset to defaults'}
                </Button>
            </div>

            <section className={sectionClassName}>
                <h2 className="text-[12px] font-semibold uppercase tracking-[0.24em] text-[#4a2518]">Hero</h2>
                <p className="text-xs text-[#6e4a34]">Wholesale Login and Apply Now buttons stay fixed; edit the headline, copy, phone, and background video.</p>
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1">
                        <label className={labelClassName} htmlFor="hero.title">
                            Title
                        </label>
                        <Input id="hero.title" value={hero.title} className={textFieldClassName} required onChange={(event) => setHero((current) => ({ ...current, title: event.target.value }))} />
                    </div>
                    <div className="space-y-1">
                        <label className={labelClassName} htmlFor="hero.subtitle">
                            Subtitle
                        </label>
                        <Input id="hero.subtitle" value={hero.subtitle} className={textFieldClassName} onChange={(event) => setHero((current) => ({ ...current, subtitle: event.target.value }))} />
                    </div>
                </div>
                <div className="space-y-1">
                    <label className={labelClassName} htmlFor="hero.body">
                        Body
                    </label>
                    <textarea id="hero.body" value={hero.body} rows={4} className={`${textFieldClassName} min-h-[96px]`} onChange={(event) => setHero((current) => ({ ...current, body: event.target.value }))} />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1">
                        <label className={labelClassName} htmlFor="hero.phone">
                            Phone
                        </label>
                        <Input id="hero.phone" value={hero.phone} className={textFieldClassName} onChange={(event) => setHero((current) => ({ ...current, phone: event.target.value }))} />
                    </div>
                    <div className="space-y-1">
                        <label className={labelClassName} htmlFor="hero.videoUrl">
                            Hero video URL
                        </label>
                        <Input id="hero.videoUrl" value={hero.videoUrl} className={textFieldClassName} onChange={(event) => setHero((current) => ({ ...current, videoUrl: event.target.value }))} />
                    </div>
                </div>
                <div className="flex justify-end border-t border-[#e8d5c0] pt-4">
                    <Button type="button" variant="primary" disabled={isBusy} onClick={handleSaveHero}>
                        {isSavingHero ? 'Saving hero…' : 'Save hero'}
                    </Button>
                </div>
            </section>

            <section className={sectionClassName}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-[12px] font-semibold uppercase tracking-[0.24em] text-[#4a2518]">Homepage sections</h2>
                        <p className="mt-1 text-xs text-[#6e4a34]">Each section saves on its own. Arrow buttons on the header reorder sections and save immediately.</p>
                    </div>
                    <Button type="button" variant="outline" className="text-[11px]" disabled={isBusy} onClick={addSection}>
                        Add section
                    </Button>
                </div>

                {sections.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-[#d1b79a] bg-[#fdf7ef] p-6 text-center text-xs text-[#6e4a34]">No sections yet. Add one to feature a category on the homepage.</p>
                ) : (
                    <div className="space-y-3">
                        {sections.map((section, index) => {
                            const title = getSectionAccordionTitle(section, index, categories);
                            const isOpen = openSections[index] ?? false;
                            const selectedCount = section.productIds.filter((id) => id > 0).length;

                            return (
                                <SectionAccordion
                                    key={index}
                                    title={title}
                                    subtitle={
                                        section.categoryId > 0
                                            ? `${selectedCount}/${HOMEPAGE_SECTION_PRODUCT_COUNT} products selected`
                                            : 'Choose a category'
                                    }
                                    isOpen={isOpen}
                                    canMoveUp={index > 0}
                                    canMoveDown={index < sections.length - 1}
                                    isSaving={isBusy}
                                    onToggle={() => toggleSectionOpen(index)}
                                    onMoveUp={() => moveSection(index, -1)}
                                    onMoveDown={() => moveSection(index, 1)}
                                >
                                    <SectionEditor
                                        section={section}
                                        index={index}
                                        categories={categories}
                                        isSaving={savingSectionIndex === index}
                                        onChange={(next) => updateSection(index, next)}
                                        onSave={() => handleSaveSection(index)}
                                        onRemove={() => removeSection(index)}
                                    />
                                </SectionAccordion>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
}
