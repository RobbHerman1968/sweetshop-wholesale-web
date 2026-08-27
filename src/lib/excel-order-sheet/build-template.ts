import * as XLSX from 'xlsx';
import { EXCEL_ORDER_SHEET_HEADERS } from '@/lib/excel-order-sheet/columns';

export function buildExcelOrderSheetTemplateBuffer(): Buffer {
    const worksheet = XLSX.utils.aoa_to_sheet([EXCEL_ORDER_SHEET_HEADERS]);
    worksheet['!cols'] = EXCEL_ORDER_SHEET_HEADERS.map((header) => ({ wch: Math.max(header.length + 2, 14) }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}
