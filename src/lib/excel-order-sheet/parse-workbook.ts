import * as XLSX from 'xlsx';
import { EXCEL_ORDER_SHEET_COLUMNS } from '@/lib/excel-order-sheet/columns';
import type { ExcelOrderSheetRawRow } from '@/lib/excel-order-sheet/types';

function cellToString(value: unknown): string {
    if (value == null) {
        return '';
    }
    if (value instanceof Date) {
        return value.toISOString().slice(0, 10);
    }
    return String(value).trim();
}

function isRowEmpty(values: string[]): boolean {
    return values.every((value) => value.length === 0);
}

function normalizeHeader(value: string): string {
    return value.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

function buildColumnIndex(headerRow: unknown[]): Map<string, number> {
    const headerMap = new Map<string, number>();
    headerRow.forEach((cell, index) => {
        const normalized = normalizeHeader(cellToString(cell));
        if (normalized) {
            headerMap.set(normalized, index);
        }
    });

    const columnIndex = new Map<string, number>();
    for (const column of EXCEL_ORDER_SHEET_COLUMNS) {
        const normalizedHeader = normalizeHeader(column.header);
        let index = headerMap.get(normalizedHeader);
        if (index == null && column.key === 'itemNumber') {
            index = headerMap.get(normalizeHeader('ItemId'));
        }
        if (index == null && column.key === 'commentOrGiftMessage') {
            index =
                headerMap.get(normalizeHeader('Comment or Gift Message')) ??
                headerMap.get(normalizeHeader('Comment'));
        }
        if (index != null) {
            columnIndex.set(column.key, index);
        }
    }

    return columnIndex;
}

function readRow(row: unknown[], columnIndex: Map<string, number>, lineNumber: number): ExcelOrderSheetRawRow {
    const read = (key: string) => {
        const index = columnIndex.get(key);
        if (index == null) {
            return '';
        }
        return cellToString(row[index]);
    };

    return {
        lineNumber,
        accountMateId: read('accountMateId'),
        documentId: read('documentId'),
        po: read('po'),
        commentOrGiftMessage: read('commentOrGiftMessage'),
        expectedDeliveryDate: read('expectedDeliveryDate'),
        requestDate: read('requestDate'),
        billingCompany: read('billingCompany'),
        billingAddress1: read('billingAddress1'),
        billingAddress2: read('billingAddress2'),
        billingCity: read('billingCity'),
        billingState: read('billingState'),
        billingZip: read('billingZip'),
        shippingCompany: read('shippingCompany'),
        shippingAddress1: read('shippingAddress1'),
        shippingAddress2: read('shippingAddress2'),
        shippingCity: read('shippingCity'),
        shippingState: read('shippingState'),
        shippingZip: read('shippingZip'),
        itemNumber: read('itemNumber'),
        quantity: read('quantity'),
        price: read('price'),
        weight: read('weight'),
    };
}

export function parseExcelOrderSheetBuffer(buffer: ArrayBuffer): { rows: ExcelOrderSheetRawRow[]; errors: string[] } {
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
        return { rows: [], errors: ['The file has no worksheets.'] };
    }

    const sheet = workbook.Sheets[sheetName];
    const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
    if (grid.length === 0) {
        return { rows: [], errors: ['The worksheet is empty.'] };
    }

    const headerRow = grid[0] ?? [];
    const columnIndex = buildColumnIndex(headerRow);
    const missingHeaders = EXCEL_ORDER_SHEET_COLUMNS.filter((column) => column.required && !columnIndex.has(column.key)).map(
        (column) => column.header,
    );
    if (missingHeaders.length > 0) {
        return {
            rows: [],
            errors: [`Missing required column(s): ${missingHeaders.join(', ')}. Download the template and try again.`],
        };
    }

    const rows: ExcelOrderSheetRawRow[] = [];
    for (let i = 1; i < grid.length; i++) {
        const row = grid[i] ?? [];
        const values = EXCEL_ORDER_SHEET_COLUMNS.map((column) => {
            const index = columnIndex.get(column.key);
            return index == null ? '' : cellToString(row[index]);
        });
        if (isRowEmpty(values)) {
            continue;
        }
        rows.push(readRow(row, columnIndex, i + 1));
    }

    if (rows.length === 0) {
        return { rows: [], errors: ['No order rows found below the header row.'] };
    }

    return { rows, errors: [] };
}
