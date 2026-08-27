/** Column headers for the order sheet template (legacy EDI fields + AccountMateId per row). */
export const EXCEL_ORDER_SHEET_COLUMNS = [
    { key: 'accountMateId', header: 'AccountMateId', required: true },
    { key: 'documentId', header: 'DocumentId', required: false },
    { key: 'po', header: 'PO', required: false },
    { key: 'commentOrGiftMessage', header: 'CommentOrGiftMessage', required: false },
    { key: 'expectedDeliveryDate', header: 'ExpectedDeliveryDate', required: false },
    { key: 'requestDate', header: 'RequestDate', required: false },
    { key: 'billingCompany', header: 'BillingCompany', required: true },
    { key: 'billingAddress1', header: 'BillingAddress1', required: true },
    { key: 'billingAddress2', header: 'BillingAddress2', required: false },
    { key: 'billingCity', header: 'BillingCity', required: true },
    { key: 'billingState', header: 'BillingState', required: true },
    { key: 'billingZip', header: 'BillingZip', required: true },
    { key: 'shippingCompany', header: 'ShippingCompany', required: true },
    { key: 'shippingAddress1', header: 'ShippingAddress1', required: true },
    { key: 'shippingAddress2', header: 'ShippingAddress2', required: false },
    { key: 'shippingCity', header: 'ShippingCity', required: true },
    { key: 'shippingState', header: 'ShippingState', required: true },
    { key: 'shippingZip', header: 'ShippingZip', required: true },
    { key: 'itemNumber', header: 'ItemNumber', required: true },
    { key: 'quantity', header: 'Quantity', required: true },
    { key: 'price', header: 'Price', required: true },
    { key: 'weight', header: 'Weight', required: false },
] as const;

export type ExcelOrderSheetColumnKey = (typeof EXCEL_ORDER_SHEET_COLUMNS)[number]['key'];

export const EXCEL_ORDER_SHEET_HEADERS = EXCEL_ORDER_SHEET_COLUMNS.map((column) => column.header);
