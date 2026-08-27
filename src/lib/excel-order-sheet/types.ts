export type ExcelOrderSheetRawRow = {
    lineNumber: number;
    accountMateId: string;
    documentId: string;
    po: string;
    commentOrGiftMessage: string;
    expectedDeliveryDate: string;
    requestDate: string;
    billingCompany: string;
    billingAddress1: string;
    billingAddress2: string;
    billingCity: string;
    billingState: string;
    billingZip: string;
    shippingCompany: string;
    shippingAddress1: string;
    shippingAddress2: string;
    shippingCity: string;
    shippingState: string;
    shippingZip: string;
    itemNumber: string;
    quantity: string;
    price: string;
    weight: string;
};

export type ExcelOrderSheetValidatedOrder = {
    lineNumber: number;
    accountMateId: string;
    accountId: number;
    accountName: string | null;
    documentId: string;
    po: string;
    commentOrGiftMessage: string;
    expectedDeliveryDate: string;
    requestDate: string;
    billingCompany: string;
    billingAddress1: string;
    billingAddress2: string;
    billingCity: string;
    billingState: string;
    billingZip: string;
    shippingCompany: string;
    shippingAddress1: string;
    shippingAddress2: string;
    shippingCity: string;
    shippingState: string;
    shippingZip: string;
    itemNumber: string;
    productId: number;
    productName: string | null;
    quantity: number;
    price: number;
    weight: number;
};

export type ParseExcelOrderSheetResult =
    | { ok: true; orders: ExcelOrderSheetValidatedOrder[] }
    | { ok: false; errors: string[] };

export type ApproveExcelOrderSheetResult =
    | {
          ok: true;
          results: Array<{
              lineNumber: number;
              ok: boolean;
              orderId?: number;
              orderNumber?: number;
              accountMateOrderNumber?: number | null;
              error?: string;
          }>;
      }
    | { ok: false; error: string };
