'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TableKit } from '@tiptap/extension-table';
import 'prosemirror-tables/style/tables.css';

import TipTapMenuBar from './tiptap-editor-menubar';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle, Color, FontSize } from '@tiptap/extension-text-style';
import { ImageWithAlign, RICH_TEXT_IMAGE_ALIGN_CLASSES } from './tiptap-image-align';
import { EditorImagePickerDialog } from './editor-image-picker-dialog';
import type { ImagePickerItem } from '@/lib/db-pg/actions/image';

interface Props {
    name: string;
    defaultValue?: string;
    className?: string;
    maxHeight?: string;
}

function imageNodePosFromClick(editor: NonNullable<ReturnType<typeof useEditor>>, target: HTMLImageElement, clientX: number, clientY: number): number | null {
    try {
        return editor.view.posAtDOM(target, 0);
    } catch {
        const coords = editor.view.posAtCoords({ left: clientX, top: clientY });
        if (!coords) return null;

        const $pos = editor.state.doc.resolve(coords.pos);
        if ($pos.nodeAfter?.type.name === 'image') return coords.pos;
        if ($pos.nodeBefore?.type.name === 'image') return coords.pos - $pos.nodeBefore.nodeSize;
        return null;
    }
}

export default function TiptapEditor({ name, defaultValue = '', className, maxHeight }: Props) {
    const hiddenInputRef = useRef<HTMLTextAreaElement>(null);
    const [imagePickerOpen, setImagePickerOpen] = useState(false);
    const [imagePickerMode, setImagePickerMode] = useState<'insert' | 'replace'>('insert');

    const editor = useEditor({
        extensions: [
            StarterKit,
            TextStyle,
            Color.configure({ types: ['textStyle'] }),
            FontSize,
            TableKit.configure({
                table: {
                    resizable: true,
                    handleWidth: 8,
                },
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
                alignments: ['left', 'center', 'right', 'justify'],
            }),
            ImageWithAlign.configure({
                inline: false,
                allowBase64: false,
            }),
        ],
        content: defaultValue,
        onUpdate({ editor }) {
            if (hiddenInputRef.current) {
                hiddenInputRef.current.value = editor.getHTML();
            }
        },
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class: 'outline-none shadow-none text-black text-[14px]',
            },
        },
    });

    const openImagePicker = useCallback((mode: 'insert' | 'replace') => {
        setImagePickerMode(mode);
        setImagePickerOpen(true);
    }, []);

    const handleImageSelect = useCallback(
        (image: ImagePickerItem) => {
            if (!editor) return;

            const attrs = {
                src: image.publicUrl,
                alt: image.name || undefined,
            };

            if (imagePickerMode === 'replace' && editor.isActive('image')) {
                editor.chain().focus().updateAttributes('image', attrs).run();
            } else {
                editor.chain().focus().setImage(attrs).run();
            }
        },
        [editor, imagePickerMode],
    );

    useEffect(() => {
        if (editor && hiddenInputRef.current) {
            hiddenInputRef.current.value = editor.getHTML();
        }
    }, [editor]);

    useEffect(() => {
        if (!editor) return;

        const onClick = (event: MouseEvent) => {
            if (!(event.target instanceof HTMLImageElement)) return;

            const pos = imageNodePosFromClick(editor, event.target, event.clientX, event.clientY);
            if (pos == null) return;

            event.preventDefault();
            editor.chain().focus().setNodeSelection(pos).run();
        };

        const onDoubleClick = (event: MouseEvent) => {
            if (!(event.target instanceof HTMLImageElement)) return;

            const pos = imageNodePosFromClick(editor, event.target, event.clientX, event.clientY);
            if (pos == null) return;

            event.preventDefault();
            editor.chain().focus().setNodeSelection(pos).run();
            openImagePicker('replace');
        };

        editor.view.dom.addEventListener('click', onClick);
        editor.view.dom.addEventListener('dblclick', onDoubleClick);
        return () => {
            editor.view.dom.removeEventListener('click', onClick);
            editor.view.dom.removeEventListener('dblclick', onDoubleClick);
        };
    }, [editor, openImagePicker]);

    return (
        <div className="rounded border border-gray-300 bg-white p-2">
            <TipTapMenuBar editor={editor} onOpenImagePicker={openImagePicker} />
            <EditorContent
                editor={editor}
                className={`tiptap-editor-content text-[14px] text-black ${className ?? 'rounded border p-3'} ${RICH_TEXT_IMAGE_ALIGN_CLASSES} [&_.ProseMirror]:text-[14px] [&_img]:my-2 [&_img]:h-auto [&_img]:max-w-full [&_img]:cursor-pointer [&_img]:rounded [&_img]:ring-offset-1 hover:[&_img]:ring-2 hover:[&_img]:ring-[#c49a78] [&_.ProseMirror-selectednode_img]:ring-2 [&_.ProseMirror-selectednode_img]:ring-[#6e4a34] [&_table]:border [&_table]:border-collapse [&_table]:w-full [&_th]:border [&_th]:border-gray-300 [&_th]:bg-gray-100 [&_th]:p-2 [&_th]:text-left [&_td]:border [&_td]:border-gray-300 [&_td]:p-2`}
                style={{
                    maxHeight,
                    overflowY: 'auto',
                }}
            />
            <textarea ref={hiddenInputRef} name={name} defaultValue={defaultValue} hidden readOnly />
            <EditorImagePickerDialog
                open={imagePickerOpen}
                onOpenChange={setImagePickerOpen}
                onSelect={handleImageSelect}
                mode={imagePickerMode}
            />
        </div>
    );
}
