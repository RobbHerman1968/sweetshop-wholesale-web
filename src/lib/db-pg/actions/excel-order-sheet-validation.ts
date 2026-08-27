'use server';

import { getServerSession } from 'next-auth';
import { inArray, sql } from 'drizzle-orm';
import { authOptions } from '@/auth';
import { getManageAccountLinksForAccountMateIds } from '@/lib/db-pg/actions/account';
import { db } from '@/lib/db-pg';
import { product } from '@/lib/drizzle/schema';
import { EXCEL_ORDER_SHEET_COLUMNS } from '@/lib/excel-order-sheet/columns';
import { parseExcelOrderSheetBuffer } from '@/lib/excel-order-sheet/parse-workbook';
import type {
    ExcelOrderSheetRawRow,
    ExcelOrderSheetValidatedOrder,
    ParseExcelOrderSheetResult,
} from '@/lib/excel-order-sheet/types';
import { parseAccountMateId } from '@/lib/wholesale-api';
import { parseUserId } from '@/lib/user-id';
import { CHECKOUT_COMMENT_MAX_LENGTH } from '@/lib/checkout-utils';

function trim(value: string | null | undefined): string {
    return value?.trim() ?? '';
}

function parseNumber(value: string): number | null {
    const normalized = value.replace(/[$,]/g, '').trim();
    if (!normalized) {
        return null;
    }
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}

function padZip(value: string): string {
    const digits = value.replace(/\D/g, '');
    if (!digits) {
        return value.trim();
    }
    return digits.padStart(5, '0').slice(0, 5);
}

async function requireAdminUserId(): Promise<number | null> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
        return null;
    }
    return parseUserId(session.user.id);
}

function validateRawRows(rows: ExcelOrderSheetRawRow[]): string[] {
    const errors: string[] = [];

    for (const row of rows) {
        for (const column of EXCEL_ORDER_SHEET_COLUMNS) {
            if (!column.required) {
                continue;
            }
            const value = row[column.key as keyof ExcelOrderSheetRawRow];
            if (typeof value === 'string' && value.trim().length === 0) {
                errors.push(`Row ${row.lineNumber}: ${column.header} is required.`);
            }
        }

        const accountMateId = parseAccountMateId(row.accountMateId);
        if (!accountMateId) {
            errors.push(`Row ${row.lineNumber}: AccountMateId "${row.accountMateId}" is invalid.`);
        }

        const quantity = parseNumber(row.quantity);
        if (quantity == null || quantity <= 0) {
            errors.push(`Row ${row.lineNumber}: Quantity must be a number greater than zero.`);
        }

        const price = parseNumber(row.price);
        if (price == null || price < 0) {
            errors.push(`Row ${row.lineNumber}: Price must be a valid number.`);
        }

        if (row.weight.trim()) {
            const weight = parseNumber(row.weight);
            if (weight == null || weight < 0) {
                errors.push(`Row ${row.lineNumber}: Weight must be a valid number when provided.`);
            }
        }

        const comment = row.commentOrGiftMessage.trim();
        if (comment.length > CHECKOUT_COMMENT_MAX_LENGTH) {
            errors.push(
                `Row ${row.lineNumber}: Comment or Gift Message must be ${CHECKOUT_COMMENT_MAX_LENGTH} characters or fewer.`,
            );
        }
    }

    return errors;
}

/** Resolves sheet rows to preview orders. Does not call AccountMate or write orders. */
export async function resolveExcelOrderSheetRows(rows: ExcelOrderSheetRawRow[]): Promise<ParseExcelOrderSheetResult> {
    const fieldErrors = validateRawRows(rows);
    if (fieldErrors.length > 0) {
        return { ok: false, errors: fieldErrors };
    }

    const accountMateIds = rows.map((row) => parseAccountMateId(row.accountMateId)).filter((id): id is string => id != null);
    const accountLinks = await getManageAccountLinksForAccountMateIds(accountMateIds);

    const itemNumbers = [...new Set(rows.map((row) => trim(row.itemNumber)).filter(Boolean))];
    const productRows =
        itemNumbers.length === 0
            ? []
            : await db
                  .select({
                      id: product.id,
                      itemNumber: product.itemNumber,
                      name: product.name,
                      weightInOunces: product.weightInOunces,
                  })
                  .from(product)
                  .where(
                      inArray(
                          sql`lower(trim(${product.itemNumber}))`,
                          itemNumbers.map((item) => item.toLowerCase()),
                      ),
                  );

    const productByItemNumber = new Map<string, (typeof productRows)[number]>();
    for (const productRow of productRows) {
        const key = trim(productRow.itemNumber).toLowerCase();
        if (key) {
            productByItemNumber.set(key, productRow);
        }
    }

    const errors: string[] = [];
    const orders: ExcelOrderSheetValidatedOrder[] = [];

    for (const row of rows) {
        const accountMateId = parseAccountMateId(row.accountMateId)!;
        const accountLink = accountLinks.get(accountMateId);
        if (!accountLink) {
            errors.push(`Row ${row.lineNumber}: AccountMate ID "${accountMateId}" was not found.`);
            continue;
        }

        const itemKey = trim(row.itemNumber).toLowerCase();
        const productRow = productByItemNumber.get(itemKey);
        if (!productRow) {
            errors.push(`Row ${row.lineNumber}: Item "${row.itemNumber}" was not found.`);
            continue;
        }

        const quantity = parseNumber(row.quantity)!;
        const price = parseNumber(row.price)!;
        const sheetWeight = row.weight.trim() ? parseNumber(row.weight)! : null;
        const weight = sheetWeight ?? Number(productRow.weightInOunces ?? 0);

        orders.push({
            lineNumber: row.lineNumber,
            accountMateId,
            accountId: accountLink.id,
            accountName: accountLink.name,
            documentId: trim(row.documentId),
            po: trim(row.po),
            commentOrGiftMessage: trim(row.commentOrGiftMessage),
            expectedDeliveryDate: trim(row.expectedDeliveryDate),
            requestDate: trim(row.requestDate),
            billingCompany: trim(row.billingCompany),
            billingAddress1: trim(row.billingAddress1),
            billingAddress2: trim(row.billingAddress2),
            billingCity: trim(row.billingCity),
            billingState: trim(row.billingState),
            billingZip: padZip(row.billingZip),
            shippingCompany: trim(row.shippingCompany),
            shippingAddress1: trim(row.shippingAddress1),
            shippingAddress2: trim(row.shippingAddress2),
            shippingCity: trim(row.shippingCity),
            shippingState: trim(row.shippingState),
            shippingZip: padZip(row.shippingZip),
            itemNumber: trim(productRow.itemNumber),
            productId: productRow.id,
            productName: productRow.name,
            quantity,
            price,
            weight,
        });
    }

    if (errors.length > 0) {
        return { ok: false, errors };
    }

    return { ok: true, orders };
}

/** Preview-only: parse file and validate lookups. Never places orders or calls the wholesale API. */
export async function parseAndValidateExcelOrderSheet(formData: FormData): Promise<ParseExcelOrderSheetResult> {
    const userId = await requireAdminUserId();
    if (userId == null) {
        return { ok: false, errors: ['You must be signed in as an administrator.'] };
    }

    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0) {
        return { ok: false, errors: ['Choose an Excel or CSV file to upload.'] };
    }

    const buffer = await file.arrayBuffer();
    const parsed = parseExcelOrderSheetBuffer(buffer);
    if (parsed.errors.length > 0) {
        return { ok: false, errors: parsed.errors };
    }

    return resolveExcelOrderSheetRows(parsed.rows);
}
