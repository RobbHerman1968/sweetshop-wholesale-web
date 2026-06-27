'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { eq } from 'drizzle-orm';
import { authOptions } from '@/auth';
import { canAccessAccountForShop, getAccountOwnerUserDisplayName } from '@/lib/db-pg/actions/account';
import {
    addItemToCart,
    changeQuantityOnCartItem,
    getCartByAccountId,
    getCartItemCountByAccountId,
    removeCartItemById,
} from '@/lib/db-pg/actions/cart';
import { getProductById } from '@/lib/db-pg/actions/product';
import { db } from '@/lib/db-pg';
import { cartItem } from '@/lib/drizzle/schema';
import { getEffectiveWholesaleAccountIdForShopCatalog, getWholesaleAccountSwitcherState } from '@/lib/wholesale-account-switcher-actions';
import { parseUserId } from '@/lib/user-id';

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

type ShopCartContext =
    | { ok: false; error: string }
    | { ok: true; userId: number; isAdmin: boolean; accountId: number };

function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatMoney(value: number): number {
    return Math.round(value * 100) / 100;
}

async function resolveShopCartContext(): Promise<ShopCartContext> {
    const session = await getServerSession(authOptions);
    const userId = parseUserId(session?.user?.id);
    if (userId == null) {
        return { ok: false, error: 'Sign in to view your cart.' };
    }

    const isAdmin = session?.user?.isAdmin ?? false;
    const accountId = await getEffectiveWholesaleAccountIdForShopCatalog(userId, isAdmin);
    if (accountId == null) {
        return { ok: false, error: 'Select a wholesale account to view your cart.' };
    }

    const canAccess = await canAccessAccountForShop(userId, accountId, isAdmin);
    if (!canAccess) {
        return { ok: false, error: 'You cannot access this cart.' };
    }

    return { ok: true, userId, isAdmin, accountId };
}

function mapCartToView(cartData: NonNullable<Awaited<ReturnType<typeof getCartByAccountId>>>): ShopCartView {
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

async function verifyCartItemForContext(cartItemId: number, context: Extract<ShopCartContext, { ok: true }>) {
    if (!Number.isFinite(cartItemId) || cartItemId <= 0) {
        return null;
    }

    const row = await db.query.cartItem.findFirst({
        where: eq(cartItem.id, cartItemId),
        with: {
            cart: true,
            product: true,
        },
    });

    if (!row?.cart || row.cart.accountId !== context.accountId) {
        return null;
    }

    return row;
}

function revalidateCartPaths() {
    revalidatePath('/shop');
    revalidatePath('/cart');
}

export async function getShopCartItemCount(): Promise<number> {
    const context = await resolveShopCartContext();
    if (!context.ok) {
        return 0;
    }

    return getCartItemCountByAccountId(context.accountId);
}

export async function getShopCart(): Promise<{ ok: true; cart: ShopCartView } | { ok: false; error: string }> {
    const context = await resolveShopCartContext();
    if (!context.ok) {
        return context;
    }

    const cartData = await getCartByAccountId(context.accountId);
    const accountOwnerDisplayName = await getAccountOwnerUserDisplayName(context.accountId);

    if (!cartData || cartData.cartItems.length === 0) {
        const switcher = await getWholesaleAccountSwitcherState();
        const accountDisplayName =
            switcher.selectedAccountDisplayName?.trim() || `Account ${context.accountId}`;

        return {
            ok: true,
            cart: {
                id: cartData?.id ?? 0,
                accountDisplayName,
                accountOwnerDisplayName,
                subTotal: 0,
                tax: 0,
                discounts: 0,
                shipping: 0,
                total: 0,
                itemCount: 0,
                items: [],
            },
        };
    }

    return { ok: true, cart: { ...mapCartToView(cartData), accountOwnerDisplayName } };
}

export async function updateShopCartItemQuantity(
    cartItemId: number,
    quantity: number,
): Promise<{ ok: true; cart: ShopCartView; itemCount: number } | { ok: false; error: string }> {
    const context = await resolveShopCartContext();
    if (!context.ok) {
        return context;
    }

    const qty = Math.floor(quantity);
    if (!Number.isFinite(qty) || qty < 1) {
        return { ok: false, error: 'Quantity must be greater than zero.' };
    }

    const row = await verifyCartItemForContext(cartItemId, context);
    if (!row?.product) {
        return { ok: false, error: 'Cart item not found.' };
    }

    const unitPrice = Number(row.product.price);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        return { ok: false, error: 'Unable to determine product price.' };
    }

    const updated = await changeQuantityOnCartItem(cartItemId, qty, unitPrice);
    if (!updated) {
        return { ok: false, error: 'Unable to update cart item.' };
    }

    revalidateCartPaths();

    const cartResult = await getShopCart();
    if (!cartResult.ok) {
        return cartResult;
    }

    return { ok: true, cart: cartResult.cart, itemCount: cartResult.cart.itemCount };
}

export async function removeShopCartItem(
    cartItemId: number,
): Promise<{ ok: true; cart: ShopCartView; itemCount: number } | { ok: false; error: string }> {
    const context = await resolveShopCartContext();
    if (!context.ok) {
        return context;
    }

    const row = await verifyCartItemForContext(cartItemId, context);
    if (!row) {
        return { ok: false, error: 'Cart item not found.' };
    }

    const removed = await removeCartItemById(cartItemId);
    if (!removed) {
        return { ok: false, error: 'Unable to remove cart item.' };
    }

    revalidateCartPaths();

    const cartResult = await getShopCart();
    if (!cartResult.ok) {
        return cartResult;
    }

    return { ok: true, cart: cartResult.cart, itemCount: cartResult.cart.itemCount };
}

export async function addProductToShopCart(
    productId: number,
    quantity: number,
): Promise<{ ok: true; itemCount: number } | { ok: false; error: string }> {
    const context = await resolveShopCartContext();
    if (!context.ok) {
        return context;
    }

    if (!Number.isFinite(productId) || productId <= 0) {
        return { ok: false, error: 'Invalid product.' };
    }

    const qty = Math.floor(quantity);
    if (!Number.isFinite(qty) || qty < 1) {
        return { ok: false, error: 'Enter a quantity of at least 1.' };
    }

    const product = await getProductById(productId);
    if (!product?.isActive) {
        return { ok: false, error: 'This product is not available.' };
    }

    const unitPrice = Number(product.price);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        return { ok: false, error: 'Unable to determine product price.' };
    }

    await addItemToCart(context.accountId, productId, qty, unitPrice);
    const itemCount = await getCartItemCountByAccountId(context.accountId);
    revalidateCartPaths();

    return { ok: true, itemCount };
}
