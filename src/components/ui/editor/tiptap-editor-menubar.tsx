'use client';

import { Editor, useEditorState } from '@tiptap/react';

import { Heading1, Heading2, Table, Rows3, Columns3, Trash2, Combine, SplitSquareVertical } from 'lucide-react';

import { MdOutlineFormatBold, MdOutlineFormatItalic, MdOutlineFormatUnderlined, MdOutlineFormatStrikethrough, MdOutlineFormatAlignLeft, MdOutlineFormatAlignCenter, MdOutlineFormatAlignRight, MdOutlineFormatAlignJustify } from 'react-icons/md';
import { Separator } from '../separator';

export default function TipTapMenuBar({ editor }: { editor: Editor | null }) {
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
                };
            }
            return {
                isBold: ctx.editor.isActive('bold') ?? false,
                isItalic: ctx.editor.isActive('italic') ?? false,
                isUnderline: ctx.editor.isActive('underline') ?? false,
                isStrike: ctx.editor.isActive('strike') ?? false,
                isCode: ctx.editor.isActive('code') ?? false,
                isAlignLeft: ctx.editor.isActive({ textAlign: 'left' }) ?? false,
                isAlignCenter: ctx.editor.isActive({ textAlign: 'center' }) ?? false,
                isAlignRight: ctx.editor.isActive({ textAlign: 'right' }) ?? false,
                isAlignJustify: ctx.editor.isActive({ textAlign: 'justify' }) ?? false,

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
            };
        },
    });

    if (!editor) return null;

    return (
        <div className="sticky top-0 z-10 mb-2 flex gap-1 rounded border border-gray-200 bg-gray-100 p-1">
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

            <button type="button" onClick={() => editor.chain().focus().setTextAlign('left').run()} className={`rounded border border-gray-500 p-1 text-black ${editorState?.isAlignLeft ? 'bg-gray-700 text-white' : ''}`}>
                <MdOutlineFormatAlignLeft size={18} />
            </button>

            <button type="button" onClick={() => editor.chain().focus().setTextAlign('center').run()} className={`rounded border border-gray-500 p-1 text-black ${editorState?.isAlignCenter ? 'bg-gray-700 text-white' : ''}`}>
                <MdOutlineFormatAlignCenter size={18} />
            </button>

            <button type="button" onClick={() => editor.chain().focus().setTextAlign('right').run()} className={`rounded border border-gray-500 p-1 text-black ${editorState?.isAlignRight ? 'bg-gray-700 text-white' : ''}`}>
                <MdOutlineFormatAlignRight size={18} />
            </button>

            <button type="button" onClick={() => editor.chain().focus().setTextAlign('justify').run()} className={`rounded border border-gray-500 p-1 text-black ${editorState?.isAlignJustify ? 'bg-gray-700 text-white' : ''}`}>
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
            <button type="button" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} className={`rounded border border-gray-500 p-1 text-black ${editorState?.isInTable ? 'bg-gray-700 text-white' : ''}`} title="Insert table" disabled={!editorState?.canInsertTable}>
                <Table size={18} />
            </button>
            {editorState?.isInTable && (
                <>
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
