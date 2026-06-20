import type { ManageMenuItem } from '@/lib/db-pg/actions/menu';

export type MenuItemTreeNode = ManageMenuItem & {
    depth: number;
    children: MenuItemTreeNode[];
};

export function buildMenuItemTree(items: ManageMenuItem[]): MenuItemTreeNode[] {
    const byParent = new Map<number, ManageMenuItem[]>();

    for (const item of items) {
        const siblings = byParent.get(item.parentMenuItemId) ?? [];
        siblings.push(item);
        byParent.set(item.parentMenuItemId, siblings);
    }

    for (const siblings of byParent.values()) {
        siblings.sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id);
    }

    function walk(parentId: number, depth: number): MenuItemTreeNode[] {
        const siblings = byParent.get(parentId) ?? [];
        return siblings.map((item) => ({
            ...item,
            depth,
            children: walk(item.id, depth + 1),
        }));
    }

    return walk(0, 0);
}

export function flattenMenuItemTree(nodes: MenuItemTreeNode[]): MenuItemTreeNode[] {
    const flat: MenuItemTreeNode[] = [];

    function visit(node: MenuItemTreeNode) {
        flat.push(node);
        for (const child of node.children) visit(child);
    }

    for (const node of nodes) visit(node);
    return flat;
}

export function getMenuItemLinkType(item: Pick<ManageMenuItem, 'categoryId' | 'pageId' | 'externalUrl'>): 'section' | 'category' | 'page' | 'external' {
    if (item.externalUrl?.trim()) return 'external';
    if (item.pageId != null && item.pageId > 0) return 'page';
    if (item.categoryId != null && item.categoryId > 0) return 'category';
    return 'section';
}
