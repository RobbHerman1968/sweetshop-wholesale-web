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

export type ShopCartAddressView = {
    firstName: string;
    lastName: string;
    companyName: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phoneNumber: string;
    emailAddress: string;
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
    shippingMethod: string | null;
    expectedDeliveryDate: string | null;
    comment: string | null;
    shippingAddress: ShopCartAddressView | null;
    billingAddress: ShopCartAddressView | null;
};

function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatMoney(value: number): number {
    return Math.round(value * 100) / 100;
}

function isUsableCartAddress(address: Cart['cartAddresses'][number]): boolean {
    return Boolean(address.address1?.trim() || address.city?.trim());
}

function mapCartAddressToView(address: Cart['cartAddresses'][number]): ShopCartAddressView {
    return {
        firstName: address.firstName?.trim() ?? '',
        lastName: address.lastName?.trim() ?? '',
        companyName: address.companyName?.trim() ?? '',
        addressLine1: address.address1?.trim() ?? '',
        addressLine2: address.address2?.trim() ?? '',
        city: address.city?.trim() ?? '',
        state: address.state?.trim() ?? '',
        postalCode: address.postalCode?.trim() ?? '',
        country: address.country?.trim() || 'United States',
        phoneNumber: address.phoneNumber?.trim() ?? '',
        emailAddress: address.emailAddress?.trim() ?? '',
    };
}

function findCartAddress(cartData: Cart, type: string): ShopCartAddressView | null {
    const match = (cartData.cartAddresses ?? []).find(
        (address) => address.type.trim().toUpperCase() === type && isUsableCartAddress(address),
    );
    return match ? mapCartAddressToView(match) : null;
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
        shippingMethod: cartData.shippingMethod,
        expectedDeliveryDate: cartData.expectedDeliveryDate,
        comment: cartData.comment,
        shippingAddress: findCartAddress(cartData, 'S'),
        billingAddress: findCartAddress(cartData, 'B'),
    };
}
