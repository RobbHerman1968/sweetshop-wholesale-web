'use client';

import { useEffect, useRef } from 'react';
import { Editor, useEditorState } from '@tiptap/react';

import { Heading1, Heading2, Table, Rows3, Columns3, Trash2, Combine, SplitSquareVertical, ImageIcon } from 'lucide-react';

import { MdOutlineFormatBold, MdOutlineFormatItalic, MdOutlineFormatUnderlined, MdOutlineFormatStrikethrough, MdOutlineFormatAlignLeft, MdOutlineFormatAlignCenter, MdOutlineFormatAlignRight, MdOutlineFormatAlignJustify } from 'react-icons/md';
import { Separator } from '../separator';
import { FONT_SIZE_OPTIONS, DEFAULT_FONT_SIZE } from './tiptap-font-size';
import type { ImageAlignValue } from './tiptap-image-align';
const DEFAULT_TEXT_COLOR = '#000000';

type TipTapMenuBarProps = {
    editor: Editor | null;
    onOpenImagePicker: (mode: 'insert' | 'replace') => void;
};

export default function TipTapMenuBar({ editor, onOpenImagePicker }: TipTapMenuBarProps) {
    const selectionRef = useRef({ from: 0, to: 0 });

    useEffect(() => {
        if (!editor) return;

        const syncSelection = () => {
            const { from, to } = editor.state.selection;
            selectionRef.current = { from, to };
        };

        syncSelection();
        editor.on('selectionUpdate', syncSelection);
        editor.on('focus', syncSelection);

        return () => {
            editor.off('selectionUpdate', syncSelection);
            editor.off('focus', syncSelection);
        };
    }, [editor]);

    function applyWithSavedSelection(run: (chain: ReturnType<Editor['chain']>) => ReturnType<Editor['chain']>) {
        if (!editor) return;
        const { from, to } = selectionRef.current;
        run(editor.chain().focus().setTextSelection({ from, to })).run();
    }

    const editorState = useEditorState({
        editor,
        selector: (ctx) => {
            if (!ctx.editor) {
                return {
                    isBold: false,
                    isItalic: false,
                    isUnderline: false,
                    isStrike: false,

                    isAlignLeft: false,
                    isAlignCenter: false,
                    isAlignRight: false,
                    isAlignJustify: false,
                    isImage: false,
                    imageAlign: 'left' as ImageAlignValue,
                    isCode: false,

                    isParagraph: false,
                    isHeading1: false,
                    isHeading2: false,
                    isHeading3: false,
                    isHeading4: false,
                    isHeading5: false,
                    isHeading6: false,
                    isBulletList: false,
                    isOrderedList: false,
                    isCodeBlock: false,
                    isBlockquote: false,

                    canBold: false,
                    canItalic: false,
                    canUnderline: false,
                    canStrike: false,
                    canCode: false,
                    canClearMarks: false,
                    canUndo: false,
                    canRedo: false,
                    isInTable: false,
                    canInsertTable: false,
                    canAddRowBefore: false,
                    canAddRowAfter: false,
                    canDeleteRow: false,
                    canAddColumnBefore: false,
                    canAddColumnAfter: false,
                    canDeleteColumn: false,
                    canDeleteTable: false,
                    canMergeCells: false,
                    canSplitCell: false,
                    tableShowBorders: true,
                    fontSize: DEFAULT_FONT_SIZE,
                    textColor: DEFAULT_TEXT_COLOR,
                };
            }
            const isImage = ctx.editor.isActive('image') ?? false;
            const imageAlign = (ctx.editor.getAttributes('image').align as ImageAlignValue | undefined) ?? 'left';

            return {
                isBold: ctx.editor.isActive('bold') ?? false,
                isItalic: ctx.editor.isActive('italic') ?? false,
                isUnderline: ctx.editor.isActive('underline') ?? false,
                isStrike: ctx.editor.isActive('strike') ?? false,
                isCode: ctx.editor.isActive('code') ?? false,
                isImage,
                imageAlign,
                isAlignLeft: isImage ? imageAlign === 'left' : (ctx.editor.isActive({ textAlign: 'left' }) ?? false),
                isAlignCenter: isImage ? imageAlign === 'center' : (ctx.editor.isActive({ textAlign: 'center' }) ?? false),
                isAlignRight: isImage ? imageAlign === 'right' : (ctx.editor.isActive({ textAlign: 'right' }) ?? false),
                isAlignJustify: isImage ? false : (ctx.editor.isActive({ textAlign: 'justify' }) ?? false),

                isParagraph: ctx.editor.isActive('paragraph') ?? false,
                isHeading1: ctx.editor.isActive('heading', { level: 1 }) ?? false,
                isHeading2: ctx.editor.isActive('heading', { level: 2 }) ?? false,
                isHeading3: ctx.editor.isActive('heading', { level: 3 }) ?? false,
                isHeading4: ctx.editor.isActive('heading', { level: 4 }) ?? false,
                isHeading5: ctx.editor.isActive('heading', { level: 5 }) ?? false,
                isHeading6: ctx.editor.isActive('heading', { level: 6 }) ?? false,
                isBulletList: ctx.editor.isActive('bulletList') ?? false,
                isOrderedList: ctx.editor.isActive('orderedList') ?? false,
                isCodeBlock: ctx.editor.isActive('codeBlock') ?? false,
                isBlockquote: ctx.editor.isActive('blockquote') ?? false,

                canBold: ctx.editor.can().chain().toggleBold().run() ?? false,
                canItalic: ctx.editor.can().chain().toggleItalic().run() ?? false,
                canUnderline: ctx.editor.can().chain().toggleUnderline().run() ?? false,
                canStrike: ctx.editor.can().chain().toggleStrike().run() ?? false,
                canCode: ctx.editor.can().chain().toggleCode().run() ?? false,
                canClearMarks: ctx.editor.can().chain().unsetAllMarks().run() ?? false,
                canUndo: ctx.editor.can().chain().undo().run() ?? false,
                canRedo: ctx.editor.can().chain().redo().run() ?? false,

                isInTable: ctx.editor.isActive('table') ?? false,
                canInsertTable: ctx.editor.can().chain().focus().insertTable().run() ?? false,
                canAddRowBefore: ctx.editor.can().chain().focus().addRowBefore().run() ?? false,
                canAddRowAfter: ctx.editor.can().chain().focus().addRowAfter().run() ?? false,
                canDeleteRow: ctx.editor.can().chain().focus().deleteRow().run() ?? false,
                canAddColumnBefore: ctx.editor.can().chain().focus().addColumnBefore().run() ?? false,
                canAddColumnAfter: ctx.editor.can().chain().focus().addColumnAfter().run() ?? false,
                canDeleteColumn: ctx.editor.can().chain().focus().deleteColumn().run() ?? false,
                canDeleteTable: ctx.editor.can().chain().focus().deleteTable().run() ?? false,
                canMergeCells: ctx.editor.can().chain().focus().mergeCells().run() ?? false,
                canSplitCell: ctx.editor.can().chain().focus().splitCell().run() ?? false,
                tableShowBorders: (ctx.editor.getAttributes('table').showBorders as boolean | undefined) ?? true,
                fontSize: (ctx.editor.getAttributes('textStyle').fontSize as string | undefined) ?? DEFAULT_FONT_SIZE,
                textColor: (ctx.editor.getAttributes('textStyle').color as string | undefined) ?? DEFAULT_TEXT_COLOR,
            };
        },
    });

    function setContentAlignment(align: 'left' | 'center' | 'right' | 'justify') {
        if (!editor) return;
        if (editor.isActive('image')) {
            if (align === 'justify') return;
            editor.chain().focus().updateAttributes('image', { align: align as ImageAlignValue }).run();
            return;
        }
        editor.chain().focus().setTextAlign(align).run();
    }

    function toggleTableBorders() {
        if (!editor) return;
        const showBorders = (editor.getAttributes('table').showBorders as boolean | undefined) !== false;
        editor.chain().focus().updateAttributes('table', { showBorders: !showBorders }).run();
    }

    if (!editor) return null;

    return (
        <div className="sticky top-0 z-10 mb-2 flex flex-wrap gap-1 rounded border border-gray-200 bg-gray-100 p-1">
            <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={`rounded border border-gray-500 p-1 text-black ${editorState?.isBold ? 'bg-gray-700 text-white' : ''}`}>
                <MdOutlineFormatBold size={18} />
            </button>

            <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={`rounded border border-gray-500 p-1 text-black ${editorState?.isItalic ? 'bg-gray-700 text-white' : ''}`}>
                <MdOutlineFormatItalic size={18} />
            </button>

            <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={`rounded border border-gray-500 p-1 text-black ${editorState?.isUnderline ? 'bg-gray-700 text-white' : ''}`}>
                <MdOutlineFormatUnderlined size={18} />
            </button>

            <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={`rounded border border-gray-500 p-1 text-black ${editorState?.isStrike ? 'bg-gray-700 text-white' : ''}`}>
                <MdOutlineFormatStrikethrough size={18} />
            </button>

            <Separator orientation="vertical" className="mx-1 h-7 bg-black" />

            <label className="flex items-center gap-1 rounded border border-gray-500 bg-white px-1.5 py-0.5 text-[11px] font-medium text-black">
                <span className="sr-only">Font size</span>
                <span aria-hidden className="text-[10px] uppercase tracking-wide text-gray-600">
                    Size
                </span>
                <select
                    value={editorState?.fontSize || DEFAULT_FONT_SIZE}
                    onMouseDown={() => {
                        if (!editor) return;
                        const { from, to } = editor.state.selection;
                        selectionRef.current = { from, to };
                    }}
                    onChange={(e) => {
                        applyWithSavedSelection((chain) => chain.setFontSize(e.target.value));
                    }}
                    className="max-w-[4.5rem] cursor-pointer bg-transparent text-[11px] outline-none"
                >
                    {FONT_SIZE_OPTIONS.map((size) => (
                        <option key={size} value={size}>
                            {size}
                        </option>
                    ))}
                </select>
            </label>

            <label className="flex items-center gap-1 rounded border border-gray-500 bg-white px-1.5 py-0.5 text-[11px] font-medium text-black">
                <span className="sr-only">Text color</span>
                <span aria-hidden className="text-[10px] uppercase tracking-wide text-gray-600">
                    Color
                </span>
                <input
                    type="color"
                    value={editorState?.textColor || DEFAULT_TEXT_COLOR}
                    onMouseDown={() => {
                        if (!editor) return;
                        const { from, to } = editor.state.selection;
                        selectionRef.current = { from, to };
                    }}
                    onChange={(e) => {
                        applyWithSavedSelection((chain) => chain.setColor(e.target.value));
                    }}
                    className="h-6 w-8 cursor-pointer border-0 bg-transparent p-0"
                />
            </label>

            <Separator orientation="vertical" className="mx-1 h-7 bg-black" />

            <button type="button" onClick={() => setContentAlignment('left')} className={`rounded border border-gray-500 p-1 text-black ${editorState?.isAlignLeft ? 'bg-gray-700 text-white' : ''}`} title={editorState?.isImage ? 'Align image left' : 'Align left'}>
                <MdOutlineFormatAlignLeft size={18} />
            </button>

            <button type="button" onClick={() => setContentAlignment('center')} className={`rounded border border-gray-500 p-1 text-black ${editorState?.isAlignCenter ? 'bg-gray-700 text-white' : ''}`} title={editorState?.isImage ? 'Center image' : 'Align center'}>
                <MdOutlineFormatAlignCenter size={18} />
            </button>

            <button type="button" onClick={() => setContentAlignment('right')} className={`rounded border border-gray-500 p-1 text-black ${editorState?.isAlignRight ? 'bg-gray-700 text-white' : ''}`} title={editorState?.isImage ? 'Align image right' : 'Align right'}>
                <MdOutlineFormatAlignRight size={18} />
            </button>

            <button type="button" onClick={() => setContentAlignment('justify')} className={`rounded border border-gray-500 p-1 text-black ${editorState?.isAlignJustify ? 'bg-gray-700 text-white' : ''}`} title="Justify" disabled={editorState?.isImage}>
                <MdOutlineFormatAlignJustify size={18} />
            </button>

            <Separator orientation="vertical" className="mx-1 h-7 bg-black" />
            <button type="button" onClick={() => editor.chain().focus().setHeading({ level: 1 }).run()} className={`rounded border border-gray-500 p-1 text-black ${editorState?.isHeading1 ? 'bg-gray-700 text-white' : ''}`}>
                <Heading1 size={18} />
            </button>
            <button type="button" onClick={() => editor.chain().focus().setHeading({ level: 2 }).run()} className={`rounded border border-gray-500 p-1 text-black ${editorState?.isHeading2 ? 'bg-gray-700 text-white' : ''}`}>
                <Heading2 size={18} />
            </button>

            <Separator orientation="vertical" className="mx-1 h-7 bg-black" />
            <button
                type="button"
                onClick={() => onOpenImagePicker('insert')}
                className="rounded border border-gray-500 p-1 text-black"
                title="Insert image"
            >
                <ImageIcon size={18} />
            </button>
            {editorState?.isImage ? (
                <button
                    type="button"
                    onClick={() => onOpenImagePicker('replace')}
                    className="rounded border border-gray-500 px-2 py-1 text-[10px] font-medium text-black"
                    title="Replace image (or double-click the image)"
                >
                    Replace
                </button>
            ) : null}
            <button type="button" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} className={`rounded border border-gray-500 p-1 text-black ${editorState?.isInTable ? 'bg-gray-700 text-white' : ''}`} title="Insert table" disabled={!editorState?.canInsertTable}>
                <Table size={18} />
            </button>
            {editorState?.isInTable && (
                <>
                    <button
                        type="button"
                        onClick={toggleTableBorders}
                        className={`rounded border border-gray-500 px-2 py-1 text-[10px] font-medium text-black ${editorState?.tableShowBorders ? 'bg-gray-700 text-white' : ''}`}
                        title={
                            editorState?.tableShowBorders
                                ? 'Hide borders on this table'
                                : 'Show borders on this table'
                        }
                        aria-pressed={editorState?.tableShowBorders}
                    >
                        Table borders
                    </button>
                    <button type="button" onClick={() => editor.chain().focus().addRowBefore().run()} className="rounded border border-gray-500 p-1 text-black" title="Add row above" disabled={!editorState?.canAddRowBefore}>
                        <Rows3 size={18} />
                    </button>
                    <button type="button" onClick={() => editor.chain().focus().addRowAfter().run()} className="rounded border border-gray-500 p-1 text-black" title="Add row below" disabled={!editorState?.canAddRowAfter}>
                        <Rows3 size={18} className="rotate-180" />
                    </button>
                    <button type="button" onClick={() => editor.chain().focus().deleteRow().run()} className="rounded border border-gray-500 p-1 text-black" title="Delete row" disabled={!editorState?.canDeleteRow}>
                        <Trash2 size={18} />
                    </button>
                    <button type="button" onClick={() => editor.chain().focus().addColumnBefore().run()} className="rounded border border-gray-500 p-1 text-black" title="Add column left" disabled={!editorState?.canAddColumnBefore}>
                        <Columns3 size={18} className="-scale-x-100" />
                    </button>
                    <button type="button" onClick={() => editor.chain().focus().addColumnAfter().run()} className="rounded border border-gray-500 p-1 text-black" title="Add column right" disabled={!editorState?.canAddColumnAfter}>
                        <Columns3 size={18} />
                    </button>
                    <button type="button" onClick={() => editor.chain().focus().deleteColumn().run()} className="rounded border border-gray-500 p-1 text-black" title="Delete column" disabled={!editorState?.canDeleteColumn}>
                        <Trash2 size={18} />
                    </button>
                    <button type="button" onClick={() => editor.chain().focus().mergeCells().run()} className="rounded border border-gray-500 p-1 text-black" title="Merge cells" disabled={!editorState?.canMergeCells}>
                        <Combine size={18} />
                    </button>
                    <button type="button" onClick={() => editor.chain().focus().splitCell().run()} className="rounded border border-gray-500 p-1 text-black" title="Split cell" disabled={!editorState?.canSplitCell}>
                        <SplitSquareVertical size={18} />
                    </button>
                    <button type="button" onClick={() => editor.chain().focus().deleteTable().run()} className="rounded border border-gray-500 p-1 text-red-600" title="Delete table" disabled={!editorState?.canDeleteTable}>
                        <Trash2 size={18} />
                    </button>
                </>
            )}
            {/* <Separator orientation="vertical" className="mx-1 h-7 bg-black" /> */}

            {/* <button
                type="button"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={editor.isActive('bulletList') ? 'text-blue-600' : ''}>
                <List size={16} />
            </button>

            <button
                type="button"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={editor.isActive('orderedList') ? 'text-blue-600' : ''}>
                <ListOrdered size={16} />
            </button>

            <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className={editor.isActive('heading', { level: 1 }) ? 'text-blue-600' : ''}>
                <Heading1 size={16} />
            </button> */}
        </div>
    );
}
