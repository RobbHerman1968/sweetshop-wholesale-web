'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GripVertical } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { describeMenuItemTarget, usesGlobalMenuDisplayOrder } from '@/lib/menu-manage-utils';
import { reorderMenuItems } from '@/lib/db-pg/actions/menu-manage';
import type { ManageMenu, ManageMenuItem } from '@/lib/db-pg/actions/menu';
import {
    applyMenuUpdatesToRows,
    buildFlatRowsFromItems,
    canDropMenuRows,
    flatRowsToMenuUpdates,
    reorderFlatMenuRows,
    isValidMenuOutline,
    type FlatMenuItemRow,
    type MenuItemDropPosition,
} from '@/lib/menu-item-reorder';

type MenuItemsSortableListProps = {
    menu: ManageMenu;
    items: ManageMenuItem[];
    categoryNames: Record<number, string>;
    pageNames: Record<number, string>;
};

type DropHint = {
    targetId: number;
    position: MenuItemDropPosition;
};

function getDropPositionFromRowEvent(event: React.DragEvent<HTMLElement>): MenuItemDropPosition {
    const rect = event.currentTarget.getBoundingClientRect();
    const offsetY = event.clientY - rect.top;
    const ratio = offsetY / rect.height;

    if (ratio < 0.25) return 'before';
    if (ratio > 0.75) return 'after';
    return 'child';
}

export function MenuItemsSortableList({ menu, items, categoryNames, pageNames }: MenuItemsSortableListProps) {
    const router = useRouter();
    const categoryNameMap = new Map(Object.entries(categoryNames).map(([id, name]) => [Number(id), name]));
    const pageNameMap = new Map(Object.entries(pageNames).map(([id, name]) => [Number(id), name]));

    const [rows, setRows] = useState<FlatMenuItemRow[]>(() => buildFlatRowsFromItems(items, menu.isShopping));
    const [draggedId, setDraggedId] = useState<number | null>(null);
    const [dropHint, setDropHint] = useState<DropHint | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setRows(buildFlatRowsFromItems(items, menu.isShopping));
    }, [items, menu.isShopping]);

    async function persistRows(nextRows: FlatMenuItemRow[]) {
        if (!isValidMenuOutline(nextRows)) {
            setError('That drop would create an invalid menu structure.');
            handleDragEnd();
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const updates = flatRowsToMenuUpdates(nextRows, menu.isShopping);
            await reorderMenuItems(menu.id, updates);
            setRows(applyMenuUpdatesToRows(nextRows, updates));
            router.refresh();
        } catch (err) {
            setRows(buildFlatRowsFromItems(items, menu.isShopping));
            setError(err instanceof Error ? err.message : 'Failed to save menu order.');
        } finally {
            setSaving(false);
            setDraggedId(null);
            setDropHint(null);
        }
    }

    function handleDragStart(event: React.DragEvent<HTMLTableRowElement>, rowId: number) {
        event.dataTransfer.effectAllowed = 'move';
        setDraggedId(rowId);
        setError(null);
    }

    function handleDragEnd() {
        setDraggedId(null);
        setDropHint(null);
    }

    function handleDragOverRow(event: React.DragEvent<HTMLTableRowElement>, targetId: number) {
        event.preventDefault();
        if (draggedId == null || !canDropMenuRows(rows, draggedId, targetId)) {
            setDropHint(null);
            return;
        }

        setDropHint({
            targetId,
            position: getDropPositionFromRowEvent(event),
        });
    }

    async function handleDropOnRow(event: React.DragEvent<HTMLTableRowElement>, targetId: number) {
        event.preventDefault();
        if (draggedId == null) return;

        const position = dropHint?.targetId === targetId ? dropHint.position : getDropPositionFromRowEvent(event);
        const nextRows = reorderFlatMenuRows(rows, draggedId, targetId, position);

        if (nextRows === rows) {
            handleDragEnd();
            return;
        }

        await persistRows(nextRows);
    }

    return (
        <div className="space-y-3">
            <p className="text-xs text-[#6e4a34]">
                Drag rows to reorder. Drop on the top edge to insert before, bottom edge to insert after, or the middle to nest under that item.
                {usesGlobalMenuDisplayOrder(menu) ? ' Order is saved as a single sequence from 1 to n across the whole menu.' : null}
                {saving ? ' Saving…' : null}
            </p>

            {error ? <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800">{error}</p> : null}

            <div className={cn('overflow-x-auto rounded-2xl border border-[#c49a78] bg-[#f8eddf]', saving && 'opacity-70')}>
                <table className="min-w-full text-left text-xs text-[#6e4a34]">
                    <thead className="border-b border-[#c49a78] text-[10px] font-semibold uppercase tracking-[0.15em] text-[#4a2518]">
                        <tr>
                            <th className="w-10 px-2 py-2" aria-label="Reorder" />
                            <th className="px-4 py-2">Name</th>
                            <th className="px-4 py-2">Target</th>
                            <th className="px-4 py-2">Order</th>
                            <th className="px-4 py-2">Status</th>
                            <th className="px-4 py-2">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((item) => {
                            const isDragging = draggedId === item.id;
                            const isDropTarget = dropHint?.targetId === item.id;
                            const dropPosition = isDropTarget ? dropHint.position : null;

                            return (
                                <tr
                                    key={item.id}
                                    draggable={!saving}
                                    onDragStart={(event) => handleDragStart(event, item.id)}
                                    onDragEnd={handleDragEnd}
                                    onDragOver={(event) => handleDragOverRow(event, item.id)}
                                    onDrop={(event) => handleDropOnRow(event, item.id)}
                                    className={cn(
                                        'border-b border-[#e3cbb0]/80 last:border-b-0',
                                        isDragging && 'opacity-40',
                                        isDropTarget && dropPosition === 'before' && 'border-t-2 border-t-[#4a2518]',
                                        isDropTarget && dropPosition === 'after' && 'border-b-2 border-b-[#4a2518]',
                                        isDropTarget && dropPosition === 'child' && 'bg-[#f3e0cf]/70',
                                    )}
                                >
                                    <td className="px-2 py-1.5 align-middle">
                                        <button
                                            type="button"
                                            aria-label={`Drag ${item.name || 'menu item'}`}
                                            className="flex cursor-grab items-center justify-center rounded p-0.5 text-[#8b6b4a] active:cursor-grabbing"
                                            onMouseDown={(event) => event.stopPropagation()}
                                        >
                                            <GripVertical className="h-4 w-4" />
                                        </button>
                                    </td>
                                    <td className="px-4 py-1.5">
                                        <span style={{ paddingLeft: `${item.depth * 16}px` }} className="inline-block font-semibold text-[#4a2518]">
                                            {item.name || '—'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-1.5">{describeMenuItemTarget(item, categoryNameMap, pageNameMap)}</td>
                                    <td className="px-4 py-1.5">{item.displayOrder}</td>
                                    <td className="px-4 py-1.5">
                                        <div className="flex flex-wrap gap-1.5">
                                            {item.parentMenuItemId === 0 ? (
                                                <span className="rounded bg-[#4a2518]/80 px-1.5 py-0.5 text-[10px] uppercase text-white">Top</span>
                                            ) : null}
                                            {!item.isActive && (
                                                <span className="rounded bg-[#6e4a34]/80 px-1.5 py-0.5 text-[10px] uppercase text-white">Hidden</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-1.5">
                                        <Link
                                            href={`/manage/menus/${menu.id}/items/${item.id}`}
                                            className={cn(buttonVariants({ variant: 'sweet' }), 'px-3 py-1 text-[10px] tracking-[0.15em]')}
                                            onClick={(event) => event.stopPropagation()}
                                        >
                                            Edit
                                        </Link>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
