export type ProductStatusFilter = 'all' | 'active' | 'inactive';

export function parseProductStatusFilter(value: string | undefined): ProductStatusFilter {
    if (value === 'active' || value === 'inactive') return value;
    return 'all';
}

export function productStatusFilterToIsActive(filter: ProductStatusFilter): boolean | undefined {
    if (filter === 'active') return true;
    if (filter === 'inactive') return false;
    return undefined;
}
