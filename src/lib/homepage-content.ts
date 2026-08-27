/** Internal siteSetting row id for HomePage Setup JSON (hidden from Site Settings UI). */
export const HOMEPAGE_CONTENT_SETTING_ID = 7;
export const HOMEPAGE_SECTION_PRODUCT_COUNT = 3;
export const HOMEPAGE_SECTION_DESCRIPTION_MAX_LENGTH = 500;
export const HOMEPAGE_SECTION_TITLE_MAX_LENGTH = 120;

export type HomePageSectionConfig = {
    title: string;
    categoryId: number;
    description: string;
    productIds: number[];
};

export type HomePageContent = {
    hero: {
        title: string;
        subtitle: string;
        body: string;
        phone: string;
        videoUrl: string;
    };
    sections: HomePageSectionConfig[];
};

export type HomePageProductDisplay = {
    id: number;
    name: string;
    itemNumber: string;
    imagePath: string | null;
};

export type HomePageSectionDisplay = {
    categoryId: number;
    title: string;
    categoryName: string;
    categoryHref: string;
    description: string;
    products: HomePageProductDisplay[];
};

export type HomePageDisplayContent = {
    hero: HomePageContent['hero'];
    sections: HomePageSectionDisplay[];
};

export const DEFAULT_HOME_PAGE_CONTENT: HomePageContent = {
    hero: {
        title: 'SWEET SHOP USA',
        subtitle: 'Handmade Chocolates',
        body: 'To view our wholesale items please sign in using your wholesale login or apply now to become a Sweet Shop USA wholesale partner.',
        phone: '1-800-222-2269',
        videoUrl: 'https://tk1qsvgip35suuxh.public.blob.vercel-storage.com/videos/sweetshopusa-hero.mp4',
    },
    sections: [],
};

export function createEmptyHomePageSection(): HomePageSectionConfig {
    return {
        title: '',
        categoryId: 0,
        description: '',
        productIds: [0, 0, 0],
    };
}

function normalizeProductIds(input: unknown): number[] {
    const ids = Array.isArray(input) ? input.map((value) => Number(value)).filter((id) => Number.isFinite(id) && id > 0) : [];
    const padded = [...ids];

    while (padded.length < HOMEPAGE_SECTION_PRODUCT_COUNT) {
        padded.push(0);
    }

    return padded.slice(0, HOMEPAGE_SECTION_PRODUCT_COUNT);
}

function normalizeSection(input: Partial<HomePageSectionConfig> | undefined): HomePageSectionConfig {
    return {
        title: input?.title?.trim().slice(0, HOMEPAGE_SECTION_TITLE_MAX_LENGTH) ?? '',
        categoryId: Number.isFinite(input?.categoryId) && (input?.categoryId ?? 0) > 0 ? Number(input?.categoryId) : 0,
        description: input?.description?.trim().slice(0, HOMEPAGE_SECTION_DESCRIPTION_MAX_LENGTH) ?? '',
        productIds: normalizeProductIds(input?.productIds),
    };
}

export function resolveHomePageSectionTitle(sectionTitle: string, categoryName: string, sectionIndex = 0): string {
    const customTitle = sectionTitle.trim();
    if (customTitle) {
        return customTitle;
    }

    const trimmedCategoryName = categoryName.trim();
    if (trimmedCategoryName) {
        return trimmedCategoryName;
    }

    return `Section ${sectionIndex + 1}`;
}

export function normalizeHomePageContent(input: Partial<HomePageContent> | null | undefined): HomePageContent {
    const defaults = DEFAULT_HOME_PAGE_CONTENT;

    return {
        hero: {
            title: input?.hero?.title?.trim() || defaults.hero.title,
            subtitle: input?.hero?.subtitle?.trim() || defaults.hero.subtitle,
            body: input?.hero?.body?.trim() || defaults.hero.body,
            phone: input?.hero?.phone?.trim() || defaults.hero.phone,
            videoUrl: input?.hero?.videoUrl?.trim() || defaults.hero.videoUrl,
        },
        sections: Array.isArray(input?.sections) ? input!.sections.map((section) => normalizeSection(section)) : [],
    };
}

export function parseHomePageContent(raw: string | null | undefined): HomePageContent {
    if (!raw?.trim()) {
        return DEFAULT_HOME_PAGE_CONTENT;
    }

    try {
        const parsed = JSON.parse(raw) as Partial<HomePageContent> & {
            featureCards?: unknown;
            infoCards?: unknown;
        };

        if (!Array.isArray(parsed.sections) && (parsed.featureCards || parsed.infoCards)) {
            return normalizeHomePageContent({ hero: parsed.hero, sections: [] });
        }

        return normalizeHomePageContent(parsed);
    } catch {
        return DEFAULT_HOME_PAGE_CONTENT;
    }
}

export function serializeHomePageContent(content: HomePageContent): string {
    return JSON.stringify(normalizeHomePageContent(content));
}
