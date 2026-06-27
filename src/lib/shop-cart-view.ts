import type { Cart } from '@/lib/db-pg/entities/cart-entity';

export type ShopCartLine = {
    id: number;
    productId: number;
    productName: string;
    itemNumber: string;
    imagePath: string | null;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
};

export type ShopCartView = {
    id: number;
    accountDisplayName: string;
    accountOwnerDisplayName: string | null;
    subTotal: number;
    tax: number;
    discounts: number;
    shipping: number;
    total: number;
    itemCount: number;
    items: ShopCartLine[];
};

function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatMoney(value: number): number {
    return Math.round(value * 100) / 100;
}

export function mapCartToView(cartData: Cart): ShopCartView {
    const items: ShopCartLine[] = cartData.cartItems
        .map((item) => {
            const unitPrice = item.quantity > 0 ? item.lineTotal / item.quantity : Number(item.product.price);
            return {
                id: item.id,
                productId: item.productId,
                productName: stripHtml(item.product.name ?? '') || `Product ${item.productId}`,
                itemNumber: item.product.itemNumber ?? '',
                imagePath: item.product.productImages?.[0]?.vercelImage?.path ?? null,
                unitPrice: formatMoney(unitPrice),
                quantity: item.quantity,
                lineTotal: formatMoney(item.lineTotal),
            };
        })
        .sort((a, b) => a.productName.localeCompare(b.productName, undefined, { sensitivity: 'base' }));

    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const accountName = (cartData.account?.name ?? '').trim();
    const accountMateId = (cartData.account?.accountMateId ?? '').trim();

    return {
        id: cartData.id,
        accountDisplayName: accountName || accountMateId || `Account ${cartData.accountId}`,
        accountOwnerDisplayName: null,
        subTotal: formatMoney(cartData.subTotal),
        tax: formatMoney(cartData.tax),
        discounts: formatMoney(cartData.discounts),
        shipping: formatMoney(cartData.shipping),
        total: formatMoney(cartData.total),
        itemCount,
        items,
    };
}
