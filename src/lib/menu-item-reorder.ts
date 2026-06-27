import type { ManageMenuItem } from '@/lib/db-pg/actions/menu';
import { buildMenuItemTree, flattenMenuItemTree, type MenuItemTreeNode } from '@/lib/menu-item-tree';

export type FlatMenuItemRow = ManageMenuItem & {
    depth: number;
};

export type MenuItemDropPosition = 'before' | 'after' | 'child';

export type MenuItemReorderUpdate = {
    id: number;
    parentMenuItemId: number;
    displayOrder: number;
};

export function treeToFlatRows(tree: MenuItemTreeNode[]): FlatMenuItemRow[] {
    return flattenMenuItemTree(tree).map(({ children: _children, ...item }) => item);
}

export function getSubtreeRowIds(flatRows: FlatMenuItemRow[], rootId: number): number[] {
    const startIdx = flatRows.findIndex((row) => row.id === rootId);
    if (startIdx === -1) return [];

    const rootDepth = flatRows[startIdx].depth;
    const ids = [rootId];

    for (let i = startIdx + 1; i < flatRows.length; i++) {
        if (flatRows[i].depth <= rootDepth) break;
        ids.push(flatRows[i].id);
    }

    return ids;
}

export function canDropMenuRows(flatRows: FlatMenuItemRow[], draggedRootId: number, targetId: number): boolean {
    if (draggedRootId === targetId) return false;
    return !getSubtreeRowIds(flatRows, draggedRootId).includes(targetId);
}

export function reorderFlatMenuRows(
    flatRows: FlatMenuItemRow[],
    draggedRootId: number,
    targetId: number,
    position: MenuItemDropPosition,
): FlatMenuItemRow[] {
    if (!canDropMenuRows(flatRows, draggedRootId, targetId)) return flatRows;

    const subtreeIds = new Set(getSubtreeRowIds(flatRows, draggedRootId));
    const draggedBlock = flatRows.filter((row) => subtreeIds.has(row.id));
    const remaining = flatRows.filter((row) => !subtreeIds.has(row.id));

    const targetIdx = remaining.findIndex((row) => row.id === targetId);
    if (targetIdx === -1) return flatRows;

    const target = remaining[targetIdx];
    const targetDepth = target.depth;

    let insertIdx: number;
    let newDepth: number;

    if (position === 'before') {
        insertIdx = targetIdx;
        newDepth = targetDepth;
    } else if (position === 'after') {
        insertIdx = targetIdx + 1;
        while (insertIdx < remaining.length && remaining[insertIdx].depth > targetDepth) {
            insertIdx++;
        }
        newDepth = targetDepth;
    } else {
        insertIdx = targetIdx + 1;
        while (insertIdx < remaining.length && remaining[insertIdx].depth > targetDepth) {
            insertIdx++;
        }
        newDepth = targetDepth + 1;
    }

    const depthDelta = newDepth - draggedBlock[0].depth;
    if (newDepth + (draggedBlock[draggedBlock.length - 1].depth - draggedBlock[0].depth) < 0) {
        return flatRows;
    }

    const adjustedBlock = draggedBlock.map((row) => ({
        ...row,
        depth: row.depth + depthDelta,
    }));

    return [...remaining.slice(0, insertIdx), ...adjustedBlock, ...remaining.slice(insertIdx)];
}

export function flatRowsToMenuUpdates(flatRows: FlatMenuItemRow[], isShopping = false): MenuItemReorderUpdate[] {
    const useGlobalOrder = isShopping;
    const siblingCounts = new Map<number, number>();
    const parentStack: Array<{ id: number; depth: number }> = [{ id: 0, depth: -1 }];
    const updates: MenuItemReorderUpdate[] = [];

    flatRows.forEach((row, index) => {
        while (parentStack.length > 1 && parentStack[parentStack.length - 1].depth >= row.depth) {
            parentStack.pop();
        }

        const parentId = parentStack[parentStack.length - 1].id;
        const displayOrder = useGlobalOrder ? index + 1 : (siblingCounts.get(parentId) ?? 0);

        if (!useGlobalOrder) {
            siblingCounts.set(parentId, displayOrder + 1);
        }

        updates.push({
            id: row.id,
            parentMenuItemId: parentId,
            displayOrder,
        });

        parentStack.push({ id: row.id, depth: row.depth });
    });

    return updates;
}

export function applyMenuUpdatesToRows(flatRows: FlatMenuItemRow[], updates: MenuItemReorderUpdate[]): FlatMenuItemRow[] {
    const byId = new Map(updates.map((update) => [update.id, update]));

    return flatRows.map((row) => {
        const update = byId.get(row.id);
        if (!update) return row;

        return {
            ...row,
            parentMenuItemId: update.parentMenuItemId,
            displayOrder: update.displayOrder,
        };
    });
}

export function buildFlatRowsFromItems(items: ManageMenuItem[], isShopping = false): FlatMenuItemRow[] {
    if (isShopping) {
        return buildFlatRowsFromGlobalDisplayOrder(items);
    }

    return treeToFlatRows(buildMenuItemTree(items));
}

function buildFlatRowsFromGlobalDisplayOrder(items: ManageMenuItem[]): FlatMenuItemRow[] {
    const byId = new Map(items.map((item) => [item.id, item]));
    const sorted = [...items].sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id);

    function depthFor(item: ManageMenuItem): number {
        let depth = 0;
        let parentId = item.parentMenuItemId;
        const visited = new Set<number>();

        while (parentId > 0) {
            if (visited.has(parentId)) break;
            visited.add(parentId);

            const parent = byId.get(parentId);
            if (!parent) break;

            depth++;
            parentId = parent.parentMenuItemId;
        }

        return depth;
    }

    return sorted.map((item) => ({
        ...item,
        depth: depthFor(item),
    }));
}

export function isValidMenuOutline(flatRows: FlatMenuItemRow[]): boolean {
    let maxAvailableDepth = -1;

    for (const row of flatRows) {
        if (row.depth < 0) return false;
        if (row.depth > maxAvailableDepth + 1) return false;
        maxAvailableDepth = row.depth;
    }

    return true;
}

export function getNextMenuItemPlacement(
    items: ManageMenuItem[],
    isShopping: boolean,
): { parentMenuItemId: number; displayOrder: number } {
    const useGlobalOrder = isShopping;

    if (useGlobalOrder) {
        const maxOrder = items.reduce((max, item) => Math.max(max, item.displayOrder), 0);
        return { parentMenuItemId: 0, displayOrder: maxOrder + 1 };
    }

    const topLevel = items.filter((item) => item.parentMenuItemId === 0);
    const maxOrder = topLevel.reduce((max, item) => Math.max(max, item.displayOrder), -1);
    return { parentMenuItemId: 0, displayOrder: maxOrder + 1 };
}
