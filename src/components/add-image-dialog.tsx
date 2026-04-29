'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { uploadImageToVercelBlob } from '@/lib/db-pg/actions/image';
import { cn } from '@/lib/utils';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;

type QueuedImage = {
    key: string;
    file: File;
    name: string;
    previewUrl: string;
};

type AddImageDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

function defaultDisplayName(file: File): string {
    /** Exact file name for library `imageName` (server trims and caps at 100 chars). */
    return (file.name || 'image').trim() || 'image';
}

function isAllowedImage(file: File): boolean {
    return ALLOWED_TYPES.includes(file.type as (typeof ALLOWED_TYPES)[number]) && file.size > 0;
}

export function AddImageDialog({ open, onOpenChange }: AddImageDialogProps) {
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadIndex, setUploadIndex] = useState(0);
    const [uploadTotal, setUploadTotal] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [queue, setQueue] = useState<QueuedImage[]>([]);

    const revokePreviews = useCallback((items: QueuedImage[]) => {
        for (const q of items) URL.revokeObjectURL(q.previewUrl);
    }, []);

    const reset = () => {
        setQueue((prev) => {
            revokePreviews(prev);
            return [];
        });
        setError(null);
        setUploadIndex(0);
        setUploadTotal(0);
        if (inputRef.current) inputRef.current.value = '';
    };

    const handleOpenChange = (next: boolean) => {
        if (!next) reset();
        onOpenChange(next);
    };

    const addFilesFromList = (fileList: FileList | File[] | null | undefined) => {
        if (!fileList?.length) return;
        const files = Array.from(fileList);
        const skipped: string[] = [];
        const nextItems: QueuedImage[] = [];

        for (const file of files) {
            if (!isAllowedImage(file)) {
                skipped.push(file.name || 'unnamed');
                continue;
            }
            const key = `${file.name}-${file.size}-${crypto.randomUUID()}`;
            nextItems.push({
                key,
                file,
                name: defaultDisplayName(file),
                previewUrl: URL.createObjectURL(file),
            });
        }

        if (nextItems.length) {
            setQueue((prev) => [...prev, ...nextItems]);
            setError(null);
        }
        if (skipped.length) {
            const sample = skipped.slice(0, 5).join(', ');
            setError(
                skipped.length > 5
                    ? `Skipped ${skipped.length} files (not JPEG/PNG/GIF/WebP or empty): ${sample}…`
                    : `Skipped: ${sample}`,
            );
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        addFilesFromList(e.dataTransfer.files);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        addFilesFromList(e.target.files);
        e.target.value = '';
    };

    const removeFromQueue = (key: string) => {
        setQueue((prev) => {
            const item = prev.find((q) => q.key === key);
            if (item) URL.revokeObjectURL(item.previewUrl);
            return prev.filter((q) => q.key !== key);
        });
    };

    const clearQueue = () => {
        setQueue((prev) => {
            revokePreviews(prev);
            return [];
        });
        setError(null);
        if (inputRef.current) inputRef.current.value = '';
    };

    const setRowName = (key: string, name: string) => {
        setQueue((prev) => prev.map((q) => (q.key === key ? { ...q, name } : q)));
    };

    const handleUploadAll = async () => {
        if (queue.length === 0) return;
        setError(null);
        setIsUploading(true);
        setUploadTotal(queue.length);
        const failed: QueuedImage[] = [];
        let i = 0;

        for (const item of queue) {
            i += 1;
            setUploadIndex(i);
            const formData = new FormData();
            formData.set('file', item.file);
            if (item.name.trim()) formData.set('name', item.name.trim());
            const result = await uploadImageToVercelBlob(formData);
            if (!result.success) {
                failed.push(item);
            } else {
                URL.revokeObjectURL(item.previewUrl);
            }
        }

        setIsUploading(false);
        setUploadIndex(0);
        setUploadTotal(0);

        if (failed.length === 0) {
            router.refresh();
            handleOpenChange(false);
            return;
        }

        setQueue(failed);
        router.refresh();
        if (failed.length === queue.length) {
            setError('Upload failed for every file. Check types/size and try again.');
        } else {
            setError(`${failed.length} file(s) failed; they remain in the list so you can fix names or retry.`);
        }
    };

    const hasQueue = queue.length > 0;

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-hidden border-[#c49a78] bg-[#f8eddf] text-[#3f1d12]">
                <DialogHeader>
                    <DialogTitle className="text-[#4a2518]">Add images</DialogTitle>
                    <DialogDescription className="text-[#6e4a34]">
                        Drag and drop multiple images, or browse. Each file is uploaded to Vercel Blob and saved to the library like a single upload.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex min-h-0 flex-col space-y-4">
                    <div
                        role="button"
                        tabIndex={0}
                        aria-label="Drop image files here, or press Enter or Space to choose files"
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => inputRef.current?.click()}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                inputRef.current?.click();
                            }
                        }}
                        className={cn(
                            'flex min-h-[100px] shrink-0 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-4 text-center transition-colors',
                            isDragging
                                ? 'border-[#6e4a34] bg-[#f3e0cf]'
                                : 'border-[#c49a78] bg-[#fdf7ef] hover:border-[#6e4a34] hover:bg-[#f3e0cf]',
                        )}
                    >
                        <input
                            ref={inputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            multiple
                            className="hidden"
                            onChange={handleFileChange}
                        />
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                            Drop images here or click to add files
                        </p>
                        <p className="mt-1 text-[10px] text-[#6e4a34]">JPEG, PNG, GIF, or WebP — add many, then upload all</p>
                    </div>

                    {hasQueue && (
                        <div className="flex min-h-0 flex-1 flex-col gap-2">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-[11px] font-medium text-[#4a2518]">
                                    {queue.length} file{queue.length !== 1 ? 's' : ''} ready
                                </p>
                                <Button type="button" variant="outline" className="h-8 text-[11px]" onClick={clearQueue} disabled={isUploading}>
                                    Clear list
                                </Button>
                            </div>
                            <ul className="max-h-[min(40vh,320px)] space-y-2 overflow-y-auto rounded-xl border border-[#c49a78] bg-[#fdf7ef] p-2">
                                {queue.map((item) => (
                                    <li key={item.key} className="flex gap-2 rounded-lg border border-[#c49a78]/60 bg-white/80 p-2">
                                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md border border-[#c49a78] bg-[#f8eddf]">
                                            <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
                                        </div>
                                        <div className="min-w-0 flex-1 space-y-1">
                                            <p className="truncate text-[10px] text-[#6e4a34]" title={item.file.name}>
                                                {item.file.name}
                                            </p>
                                            <Label htmlFor={`qname-${item.key}`} className="sr-only">
                                                Library name for {item.file.name}
                                            </Label>
                                            <Input
                                                id={`qname-${item.key}`}
                                                value={item.name}
                                                onChange={(e) => setRowName(item.key, e.target.value)}
                                                placeholder="Library name"
                                                disabled={isUploading}
                                                className="h-8 border-[#c49a78] text-xs text-[#3f1d12]"
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            className="h-8 shrink-0 px-2 text-[11px] text-red-700"
                                            onClick={() => removeFromQueue(item.key)}
                                            disabled={isUploading}
                                        >
                                            Remove
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                            <Button type="button" onClick={handleUploadAll} disabled={isUploading} className="w-full sm:w-auto sm:self-end">
                                {isUploading
                                    ? `Uploading ${uploadIndex} / ${uploadTotal}…`
                                    : queue.length === 1
                                      ? 'Upload'
                                      : `Upload all (${queue.length})`}
                            </Button>
                        </div>
                    )}

                    {error && (
                        <p className="text-xs text-red-700" role="alert">
                            {error}
                        </p>
                    )}
                </div>

                <DialogFooter className="sm:justify-end">
                    <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)} disabled={isUploading}>
                        Cancel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
