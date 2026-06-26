import type { ChangeEvent } from 'react';

/** Reload list results when a search input is cleared (native clear button or delete all text). */
export function reloadOnSearchClear(event: ChangeEvent<HTMLInputElement>, activeValue: string, reload: () => void) {
    if (event.target.value === '' && activeValue.trim()) {
        reload();
    }
}
