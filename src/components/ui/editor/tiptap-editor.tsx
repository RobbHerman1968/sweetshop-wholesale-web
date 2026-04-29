'use client';

import { useEffect, useRef } from 'react';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TableKit } from '@tiptap/extension-table';
import 'prosemirror-tables/style/tables.css';

import TipTapMenuBar from './tiptap-editor-menubar';
import TextAlign from '@tiptap/extension-text-align';

interface Props {
    name: string;
    defaultValue?: string;
    className?: string;
    maxHeight?: string;
}

export default function TiptapEditor({ name, defaultValue = '', className, maxHeight }: Props) {
    const hiddenInputRef = useRef<HTMLTextAreaElement>(null);

    const editor = useEditor({
        extensions: [
            StarterKit,
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
                class: 'outline-none shadow-none text-black',
            },
        },
    });

    useEffect(() => {
        if (editor && hiddenInputRef.current) {
            hiddenInputRef.current.value = editor.getHTML();
        }
    }, [editor]);

    return (
        <div className="rounded border border-gray-300 bg-white p-2">
            <TipTapMenuBar editor={editor} />
            <EditorContent
                editor={editor}
                className={`tiptap-editor-content text-black ${className ?? 'rounded border p-3'} [&_table]:border [&_table]:border-collapse [&_table]:w-full [&_th]:border [&_th]:border-gray-300 [&_th]:bg-gray-100 [&_th]:p-2 [&_th]:text-left [&_td]:border [&_td]:border-gray-300 [&_td]:p-2`}
                style={{
                    maxHeight, // e.g., '300px'
                    overflowY: 'auto',
                }}
            />
            <textarea ref={hiddenInputRef} name={name} defaultValue={defaultValue} hidden readOnly />
        </div>
    );
}
