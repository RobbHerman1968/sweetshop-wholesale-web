'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationEllipsis } from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AddImageDialog } from '@/components/add-image-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { deleteVercelImageIfUnused, updateVercelImageName, updateVercelImageNamesBulk } from '@/lib/db-pg/actions/image';
import type { ImageLibraryFilter } from '@/lib/image-library-filter';
import { reloadOnSearchClear } from '@/lib/manage-search-clear';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { buildLegacyDynImageUrl } from '@/lib/legacy-dynimage-url';
import { RemoteImage } from '@/components/remote-image';

type ImageRow = {
    id: number;
    name: string;
    imageName: string;
    isProductImage: boolean;
    /** Vercel Blob (or other) HTTPS URL for the image file. */
    publicUrl: string;
};

type ImagesContentProps = {
    data: ImageRow[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
    searchName: string;
    imageType: ImageLibraryFilter;
};

function buildQuery(params: { page?: number; name?: string; type?: ImageLibraryFilter }) {
    const q = new URLSearchParams();
    if (params.page != null && params.page > 1) q.set('page', String(params.page));
    if (params.name?.trim()) q.set('name', params.name.trim());
    if (params.type && params.type !== 'all') q.set('type', params.type);
    return q.toString() ? `?${q.toString()}` : '';
}

const IMAGE_TYPE_LABELS: Record<ImageLibraryFilter, string> = {
    all: 'All images',
    product: 'Product images',
    other: 'Other images',
};

function buildPageNumbers(page: number, totalPages: number): (number | 'ellipsis')[] {
    const pageNumbers: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
        return pageNumbers;
    }
    pageNumbers.push(1);
    if (page > 3) pageNumbers.push('ellipsis');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        if (!pageNumbers.includes(i)) pageNumbers.push(i);
    }
    if (page < totalPages - 2) pageNumbers.push('ellipsis');
    if (totalPages > 1) pageNumbers.push(totalPages);
    return pageNumbers;
}

function ImagesPaginationNav({
    page,
    totalPages,
    searchName,
    imageType,
    className,
}: {
    page: number;
    totalPages: number;
    searchName: string;
    imageType: ImageLibraryFilter;
    className?: string;
}) {
    if (totalPages <= 1) return null;

    const pageNumbers = buildPageNumbers(page, totalPages);

    return (
        <Pagination className={className}>
            <PaginationContent>
                {pageNumbers.map((n, i) =>
                    n === 'ellipsis' ? (
                        <PaginationItem key={`ellipsis-${i}`}>
                            <PaginationEllipsis />
                        </PaginationItem>
                    ) : (
                        <PaginationItem key={n}>
                            <PaginationLink
                                href={`/manage/images${buildQuery({
                                    page: n,
                                    name: searchName || undefined,
                                    type: imageType,
                                })}`}
                                isActive={page === n}
                            >
                                {n}
                            </PaginationLink>
                        </PaginationItem>
                    ),
                )}
            </PaginationContent>
        </Pagination>
    );
}

export function ImagesContent({ data, pagination, searchName, imageType }: ImagesContentProps) {
    const router = useRouter();
    const [addProductImageOpen, setAddProductImageOpen] = useState(false);
    const [addOtherImageOpen, setAddOtherImageOpen] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [imageToDelete, setImageToDelete] = useState<ImageRow | null>(null);
    const [imageToEdit, setImageToEdit] = useState<ImageRow | null>(null);
    const [editName, setEditName] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);
    /** Snapshot rows so selection survives pagination and bulk edit always has full rows. */
    const [selectedById, setSelectedById] = useState<Map<number, ImageRow>>(() => new Map());
    const [bulkEditOpen, setBulkEditOpen] = useState(false);
    const [bulkRows, setBulkRows] = useState<{ id: number; name: string; publicUrl: string }[]>([]);
    const [savingBulk, setSavingBulk] = useState(false);

    const selectedCount = selectedById.size;

    function clearAllSelection() {
        setSelectedById(new Map());
    }

    function openBulkEdit() {
        if (selectedById.size === 0) return;
        const onPage = new Map(data.map((img) => [img.id, img]));
        const rows = Array.from(selectedById.values()).map((img) => {
            const latest = onPage.get(img.id);
            return {
                id: img.id,
                name: (latest?.name ?? img.name) || '',
                publicUrl: (latest?.publicUrl ?? img.publicUrl) || '',
            };
        });
        setBulkRows(rows);
        setBulkEditOpen(true);
    }

    function setBulkRowName(id: number, name: string) {
        setBulkRows((rows) => rows.map((r) => (r.id === id ? { ...r, name } : r)));
    }

    async function saveBulkNames() {
        if (bulkRows.length === 0) return;
        setSavingBulk(true);
        await updateVercelImageNamesBulk(bulkRows.map((r) => ({ id: r.id, name: r.name })));
        setSavingBulk(false);
        setBulkEditOpen(false);
        setBulkRows([]);
        clearAllSelection();
        router.refresh();
    }

    function openDeleteConfirm(img: ImageRow) {
        setDeleteError(null);
        setImageToDelete(img);
    }

    function openEditSheet(img: ImageRow) {
        setImageToEdit(img);
        setEditName(img.name || img.imageName || '');
    }

    async function saveEditName() {
        if (!imageToEdit) return;
        setSavingEdit(true);
        await updateVercelImageName(imageToEdit.id, editName);
        setSavingEdit(false);
        setImageToEdit(null);
        router.refresh();
    }

    async function confirmDelete() {
        if (!imageToDelete) return;
        setDeletingId(imageToDelete.id);
        const result = await deleteVercelImageIfUnused(imageToDelete.id);
        setDeletingId(null);
        setImageToDelete(null);
        if (result.success) {
            router.refresh();
        } else {
            setDeleteError(result.error);
        }
    }

    const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const name = (form.elements.namedItem('name') as HTMLInputElement).value;
        const query = buildQuery({ page: 1, name: name || undefined, type: imageType });
        router.push(`/manage/images${query}`);
    };

    function handleImageTypeChange(nextType: ImageLibraryFilter) {
        const query = buildQuery({ page: 1, name: searchName || undefined, type: nextType });
        router.push(`/manage/images${query}`);
    }

    const { page, totalPages } = pagination;

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <Dialog open={imageToDelete != null} onOpenChange={(open) => !open && setImageToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete image?</DialogTitle>
                        <DialogDescription>{imageToDelete ? `"${imageToDelete.name}" will be permanently deleted. This cannot be undone.` : ''}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setImageToDelete(null)}>
                            Cancel
                        </Button>
                        <Button type="button" variant="primary" className="bg-red-600 hover:bg-red-700" onClick={confirmDelete} disabled={deletingId != null}>
                            {deletingId != null ? 'Deleting…' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Sheet
                open={bulkEditOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        setBulkEditOpen(false);
                        setBulkRows([]);
                    }
                }}
            >
                <SheetContent side="right" className="flex w-full flex-col sm:max-w-lg">
                    <SheetHeader>
                        <SheetTitle>Edit {bulkRows.length} images</SheetTitle>
                        <SheetDescription>Update display names. Each row is saved to the library the same as a single edit.</SheetDescription>
                    </SheetHeader>
                    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto py-4 pr-1">
                        {bulkRows.map((row) => (
                            <div key={row.id} className="flex gap-3 rounded-xl border border-[#c49a78] bg-[#fdf7ef] p-3">
                                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[#c49a78] bg-white">
                                    {row.publicUrl ? (
                                        <RemoteImage src={row.publicUrl} sizes="56px" fill />
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-[9px] text-[#6e4a34]">No file</div>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1 space-y-1">
                                    <Label htmlFor={`bulk-name-${row.id}`} className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#6e4a34]">
                                        Name
                                    </Label>
                                    <Input
                                        id={`bulk-name-${row.id}`}
                                        value={row.name}
                                        onChange={(e) => setBulkRowName(row.id, e.target.value)}
                                        placeholder="Image name"
                                        className="w-full text-sm"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    <SheetFooter className="border-t border-[#c49a78] pt-4">
                        <Button type="button" variant="outline" onClick={() => setBulkEditOpen(false)} disabled={savingBulk}>
                            Cancel
                        </Button>
                        <Button type="button" onClick={saveBulkNames} disabled={savingBulk}>
                            {savingBulk ? 'Saving…' : 'Save all'}
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            <Sheet open={imageToEdit != null} onOpenChange={(open) => !open && setImageToEdit(null)}>
                <SheetContent side="right">
                    <SheetHeader>
                        <SheetTitle>Edit image</SheetTitle>
                        <SheetDescription>Update the display name for this image.</SheetDescription>
                    </SheetHeader>
                    {imageToEdit ? (
                    <div className="space-y-4 py-4">
                        {imageToEdit.isProductImage && imageToEdit.imageName ? (
                            <div className="space-y-2">
                                <Label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Product old image</Label>
                                <div className="overflow-hidden rounded-lg border border-[#c49a78] bg-white p-2">
                                    <img
                                        src={buildLegacyDynImageUrl(imageToEdit.imageName)}
                                        alt={imageToEdit.imageName}
                                        className="mx-auto max-h-64 w-full object-contain"
                                    />
                                </div>
                                <p className="truncate text-[11px] text-[#6e4a34]" title={imageToEdit.imageName}>
                                    {imageToEdit.imageName}
                                </p>
                            </div>
                        ) : null}
                        <div className="space-y-2">
                            <Label htmlFor="edit-image-name" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">
                                Name
                            </Label>
                            <Input id="edit-image-name" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Image name" className="w-full" />
                        </div>
                    </div>
                    ) : null}
                    <SheetFooter>
                        <Button type="button" variant="outline" onClick={() => setImageToEdit(null)}>
                            Cancel
                        </Button>
                        <Button type="button" onClick={saveEditName} disabled={savingEdit}>
                            {savingEdit ? 'Saving…' : 'Save'}
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-[14px] font-semibold uppercase tracking-[0.3em] text-[#6e4a34]">Manage Images</h1>
                <div className="flex flex-wrap items-center gap-2">
                    {selectedCount > 0 && (
                        <>
                            <span className="text-[11px] text-[#6e4a34]">{selectedCount} selected</span>
                            <Button type="button" variant="ghost" className="h-auto px-2 text-[11px] text-[#6e4a34]" onClick={clearAllSelection}>
                                Clear all
                            </Button>
                            <Button type="button" variant="sweet" className="text-[11px]" onClick={openBulkEdit}>
                                Edit names…
                            </Button>
                        </>
                    )}
                    <Button type="button" variant="outline" onClick={() => setAddOtherImageOpen(true)}>
                        Add other images
                    </Button>
                    <Button type="button" onClick={() => setAddProductImageOpen(true)}>
                        Add product images
                    </Button>
                </div>
            </div>

            <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Type</span>
                    <Select value={imageType} onValueChange={(value) => handleImageTypeChange(value as ImageLibraryFilter)}>
                        <SelectTrigger className="w-44 min-w-0 border-[#d1b79a] bg-white text-sm font-normal normal-case shadow-none">
                            <SelectValue placeholder="All images" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{IMAGE_TYPE_LABELS.all}</SelectItem>
                            <SelectItem value="product">{IMAGE_TYPE_LABELS.product}</SelectItem>
                            <SelectItem value="other">{IMAGE_TYPE_LABELS.other}</SelectItem>
                        </SelectContent>
                    </Select>
                </label>
                <label className="flex flex-col gap-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Name</span>
                    <Input
                        name="name"
                        type="search"
                        placeholder="Search by name"
                        defaultValue={searchName}
                        className="w-48 min-w-0 sm:w-56"
                        onChange={(e) =>
                            reloadOnSearchClear(e, searchName, () =>
                                router.push(`/manage/images${buildQuery({ page: 1, type: imageType })}`),
                            )
                        }
                    />
                </label>
                <Button type="submit" variant="sweet" className="shrink-0">
                    Search
                </Button>
            </form>

            <div className="flex flex-col gap-2 text-xs text-[#6e4a34] sm:flex-row sm:items-center sm:justify-between">
                <p className="w-64">
                    Showing {data.length} of {pagination.total} {IMAGE_TYPE_LABELS[imageType].toLowerCase()}
                    {searchName && ' matching search'}.
                </p>
                <ImagesPaginationNav page={page} totalPages={totalPages} searchName={searchName} imageType={imageType} />
            </div>

            {deleteError && (
                <Alert variant="destructive" className="bg-red-100! text-red-900!">
                    <AlertDescription className="text-xs">{deleteError}</AlertDescription>
                </Alert>
            )}

            {data.length === 0 ? (
                <p className="rounded-2xl border border-[#c49a78] bg-[#f8eddf] p-6 text-center text-xs text-[#6e4a34]">No images found.</p>
            ) : (
                <ul className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                    {data.map((img) => (
                        <li key={img.id}>
                            <article className="overflow-hidden rounded-lg border border-[#c49a78] bg-[#f8eddf]">
                                <div className="relative aspect-square w-full bg-[#ffffff]">
                                    {img.publicUrl ? (
                                        <RemoteImage src={img.publicUrl} sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw" />
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-wider text-[#6e4a34] bg-white">No file</div>
                                    )}
                                </div>
                                <div className="p-3">
                                    <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-[#4a2518]">{img.name || img.imageName || '—'}</p>
                                    <p className="mt-0.5 truncate text-[11px] text-[#6e4a34]">{img.publicUrl || '—'}</p>
                                    <div className="mt-2 flex gap-2">
                                        <Button type="button" variant="sweet" className="flex-1 text-[11px]" onClick={() => openEditSheet(img)}>
                                            Edit
                                        </Button>
                                        <Button type="button" variant="outline" className="flex-1 text-[11px] border-red-400 text-red-700 hover:bg-red-50 hover:border-red-500" onClick={() => openDeleteConfirm(img)} disabled={deletingId === img.id}>
                                            {deletingId === img.id ? 'Deleting…' : 'Delete'}
                                        </Button>
                                    </div>
                                </div>
                            </article>
                        </li>
                    ))}
                </ul>
            )}

            <ImagesPaginationNav
                page={page}
                totalPages={totalPages}
                searchName={searchName}
                imageType={imageType}
                className="justify-center sm:justify-end"
            />

            <AddImageDialog open={addProductImageOpen} onOpenChange={setAddProductImageOpen} isProductImage />
            <AddImageDialog open={addOtherImageOpen} onOpenChange={setAddOtherImageOpen} isProductImage={false} />
        </div>
    );
}
