'use client';

import type { ShopCategory } from '@/lib/db-pg/actions/category';

type Props = {
    categories: ShopCategory[];
    selectedCategoryIds: number[];
    onToggle: (categoryId: number, checked: boolean) => void;
    idPrefix: string;
    /** When true, renders native form fields for categoryIds (edit sheet). */
    includeFormFields?: boolean;
};

export function ProductCategoryChecklist({ categories, selectedCategoryIds, onToggle, idPrefix, includeFormFields = false }: Props) {
    if (categories.length === 0) {
        return (
            <p className="rounded-md border border-dashed border-[#c49a78] bg-[#f8eddf] px-3 py-2 text-xs text-[#6e4a34]">
                No categories yet. Add categories under Manage Categories first.
            </p>
        );
    }

    return (
        <ul className="grid gap-2 sm:grid-cols-2">
            {categories.map((category) => {
                const inputId = `${idPrefix}-category-${category.id}`;
                const checked = selectedCategoryIds.includes(category.id);
                return (
                    <li key={category.id}>
                        <label htmlFor={inputId} className="flex cursor-pointer items-center gap-2 rounded-md border border-[#c49a78] bg-[#f8eddf] px-3 py-2">
                            <input
                                type="checkbox"
                                id={inputId}
                                name={includeFormFields ? 'categoryIds' : undefined}
                                value={includeFormFields ? category.id : undefined}
                                checked={checked}
                                onChange={(e) => onToggle(category.id, e.target.checked)}
                                className="h-4 w-4 shrink-0 rounded border-[#c49a78]"
                            />
                            <span className="flex min-w-0 flex-wrap items-center gap-2 text-[12px] font-semibold text-[#4a2518]">
                                {category.name || 'Untitled'}
                                {!category.isActive ? (
                                    <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] uppercase text-white">Inactive</span>
                                ) : null}
                            </span>
                        </label>
                    </li>
                );
            })}
        </ul>
    );
}
