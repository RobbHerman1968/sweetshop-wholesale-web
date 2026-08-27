import { Table, TableView } from '@tiptap/extension-table';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { EditorView } from '@tiptap/pm/view';

export const TABLE_SHOW_BORDERS_CLASS = 'table-show-borders';
export const TABLE_HIDE_BORDERS_CLASS = 'table-hide-borders';

/** Editor + published CMS spacing/typography for tables. Border colors live in globals.css. */
export const RICH_TEXT_TABLE_BASE_CLASSES =
    '[&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:text-xs [&_td]:p-2 [&_th]:p-2 [&_th]:text-left [&_table_p]:my-0 [&_table_p]:leading-relaxed';

function tableShouldShowBorders(showBorders: unknown): boolean {
    return showBorders !== false;
}

function syncTableBorderDom(table: HTMLTableElement, showBorders: boolean) {
    table.setAttribute('data-table-borders', showBorders ? 'true' : 'false');
    table.classList.toggle(TABLE_SHOW_BORDERS_CLASS, showBorders);
    table.classList.toggle(TABLE_HIDE_BORDERS_CLASS, !showBorders);
}

/** Resizable tables use TableView, which does not refresh custom attrs unless we sync them. */
class TableViewWithBorderSync extends TableView {
    constructor(node: ProseMirrorNode, cellMinWidth: number, view?: EditorView, HTMLAttributes?: Record<string, unknown>) {
        super(node, cellMinWidth, view, HTMLAttributes);
        syncTableBorderDom(this.table, tableShouldShowBorders(node.attrs.showBorders));
    }

    update(node: ProseMirrorNode) {
        const updated = super.update(node);
        if (updated) {
            syncTableBorderDom(this.table, tableShouldShowBorders(node.attrs.showBorders));
        }

        return updated;
    }
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        table: {
            toggleTableBorders: () => ReturnType;
        };
    }
}

export const TableWithBorders = Table.extend({
    addOptions() {
        return {
            ...this.parent?.(),
            View: TableViewWithBorderSync,
        };
    },

    addAttributes() {
        return {
            ...this.parent?.(),
            showBorders: {
                default: true,
                parseHTML: (element) => {
                    if (element.classList.contains(TABLE_SHOW_BORDERS_CLASS)) {
                        return true;
                    }

                    if (element.classList.contains(TABLE_HIDE_BORDERS_CLASS)) {
                        return false;
                    }

                    return element.getAttribute('data-table-borders') === 'true';
                },
                renderHTML: (attributes) => {
                    if (tableShouldShowBorders(attributes.showBorders)) {
                        return {
                            'data-table-borders': 'true',
                            class: TABLE_SHOW_BORDERS_CLASS,
                        };
                    }

                    return {
                        'data-table-borders': 'false',
                        class: TABLE_HIDE_BORDERS_CLASS,
                    };
                },
            },
        };
    },

    addCommands() {
        return {
            ...this.parent?.(),
            toggleTableBorders:
                () =>
                ({ state, dispatch, tr }) => {
                    const $pos = state.selection.$from;

                    for (let depth = $pos.depth; depth > 0; depth -= 1) {
                        const node = $pos.node(depth);
                        if (node.type.name !== 'table') {
                            continue;
                        }

                        if (!dispatch) {
                            return true;
                        }

                        tr.setNodeMarkup($pos.before(depth), undefined, {
                            ...node.attrs,
                            showBorders: !tableShouldShowBorders(node.attrs.showBorders),
                        });

                        return true;
                    }

                    return false;
                },
        };
    },
});
