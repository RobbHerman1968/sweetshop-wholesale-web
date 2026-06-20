'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { searchImagesForPicker, type ImagePickerItem } from '@/lib/db-pg/actions/image';
import { cn } from '@/lib/utils';

type EditorImagePickerDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (image: ImagePickerItem) => void;
    mode?: 'insert' | 'replace';
};

export function EditorImagePickerDialog({ open, onOpenChange, onSelect, mode = 'insert' }: EditorImagePickerDialogProps) {
    const isReplace = mode === 'replace';
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<ImagePickerItem[]>([]);
    const [selected, setSelected] = useState<ImagePickerItem | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open) return;

        setLoading(true);
        const timer = window.setTimeout(async () => {
            const items = await searchImagesForPicker(query);
            setResults(items);
            setSelected((prev) => {
                if (!prev) return items[0] ?? null;
                return items.find((item) => item.id === prev.id) ?? items[0] ?? null;
            });
            setLoading(false);
        }, 300);

        return () => window.clearTimeout(timer);
    }, [open, query]);

    const handleOpenChange = (next: boolean) => {
        if (!next) {
            setQuery('');
            setResults([]);
            setSelected(null);
            setLoading(false);
        }
        onOpenChange(next);
    };

    const handleInsert = () => {
        if (!selected) return;
        onSelect(selected);
        handleOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col overflow-hidden border-[#c49a78] bg-[#f8eddf] text-[#3f1d12]">
                <DialogHeader>
                    <DialogTitle className="text-[#4a2518]">{isReplace ? 'Replace image' : 'Insert image'}</DialogTitle>
                    <DialogDescription className="text-[#6e4a34]">
                        {isReplace
                            ? 'Search the image library, preview your choice, then replace the selected image.'
                            : 'Search the image library, preview your choice, then insert it into the editor.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="min-h-0 flex-1 space-y-3">
                    <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search by image name"
                        className="border-[#c49a78] text-sm text-[#3f1d12]"
                        autoFocus
                    />

                    <div className={cn('grid min-h-0 gap-3', isReplace ? 'grid-cols-1' : 'sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]')}>
                        <div
                            className={cn(
                                'flex flex-col rounded-xl border border-[#c49a78] bg-[#fdf7ef]',
                                isReplace ? 'min-h-0' : 'min-h-[280px]',
                            )}
                        >
                            <p className="border-b border-[#c49a78]/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                                {loading ? 'Searching…' : `${results.length} result${results.length === 1 ? '' : 's'}`}
                            </p>
                            <ul
                                className={cn(
                                    'space-y-1 overflow-y-auto p-2',
                                    isReplace ? 'max-h-[calc(5*4.25rem+0.5rem)]' : 'min-h-0 flex-1',
                                )}
                            >
                                {!loading && results.length === 0 ? (
                                    <li className="px-2 py-6 text-center text-xs text-[#6e4a34]">
                                        {query.trim() ? 'No images match your search.' : 'No images in the library yet.'}
                                    </li>
                                ) : (
                                    results.map((item) => (
                                        <li key={item.id}>
                                            <button
                                                type="button"
                                                onClick={() => setSelected(item)}
                                                className={cn(
                                                    'flex w-full items-center gap-2 rounded-lg border px-2 py-2 text-left transition-colors',
                                                    selected?.id === item.id
                                                        ? 'border-[#6e4a34] bg-[#f3e0cf]'
                                                        : 'border-transparent hover:border-[#c49a78] hover:bg-white/80',
                                                )}
                                            >
                                                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-[#c49a78] bg-white">
                                                    <img
                                                        src={item.publicUrl}
                                                        alt=""
                                                        className="h-full w-full object-cover"
                                                        referrerPolicy="no-referrer"
                                                    />
                                                </div>
                                                <span className="min-w-0 truncate text-sm font-medium text-[#4a2518]">{item.name || 'Untitled'}</span>
                                            </button>
                                        </li>
                                    ))
                                )}
                            </ul>
                        </div>

                        {!isReplace ? (
                        <div className="flex min-h-[280px] flex-col rounded-xl border border-[#c49a78] bg-[#fdf7ef]">
                            <p className="border-b border-[#c49a78]/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                                Preview
                            </p>
                            {selected ? (
                                <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
                                    <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg border border-[#c49a78] bg-white p-2">
                                        <img
                                            src={selected.publicUrl}
                                            alt={selected.name || 'Selected image'}
                                            className="max-h-[min(40vh,240px)] max-w-full object-contain"
                                            referrerPolicy="no-referrer"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="truncate text-sm font-medium text-[#4a2518]">{selected.name || 'Untitled'}</p>
                                        <p className="truncate text-[11px] text-[#6e4a34]" title={selected.publicUrl}>
                                            {selected.publicUrl}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-1 items-center justify-center px-4 text-center text-xs text-[#6e4a34]">
                                    Select an image from the list to preview it here.
                                </div>
                            )}
                        </div>
                        ) : selected ? (
                            <div className="rounded-xl border border-[#c49a78] bg-[#fdf7ef] p-3">
                                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Selected</p>
                                <div className="flex items-center gap-3">
                                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md border border-[#c49a78] bg-white">
                                        <img
                                            src={selected.publicUrl}
                                            alt={selected.name || 'Selected image'}
                                            className="h-full w-full object-cover"
                                            referrerPolicy="no-referrer"
                                        />
                                    </div>
                                    <p className="min-w-0 truncate text-sm font-medium text-[#4a2518]">{selected.name || 'Untitled'}</p>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>

                <DialogFooter className="pt-4 sm:justify-end">
                    <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={handleInsert} disabled={!selected}>
                        {isReplace ? 'Replace image' : 'Insert image'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
