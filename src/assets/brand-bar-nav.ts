export type BrandBarNavLink = {
    title: string;
    href: string;
    description: string;
    categoryId?: number | null;
    pageId?: number | null;
    externalUrl?: string | null;
    opensInNewWindow?: boolean;
};

export type BrandBarNavSection = {
    title: string;
    links: BrandBarNavLink[];
};

export type BrandBarNavCategory = {
    label: string;
    description: string;
    sections: BrandBarNavSection[];
};
