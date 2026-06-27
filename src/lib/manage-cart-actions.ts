'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { eq } from 'drizzle-orm';
import { authOptions } from '@/auth';
import {
    changeQuantityOnCartItem,
    getCartById,
    removeCartItemById,
} from '@/lib/db-pg/actions/cart';
import { getAccountOwnerUserDisplayName } from '@/lib/db-pg/actions/account';
import { db } from '@/lib/db-pg';
import { cartItem } from '@/lib/drizzle/schema';
import { mapCartToView, type ShopCartView } from '@/lib/shop-cart-view';

type ManageCartContext = { ok: false; error: string } | { ok: true };

async function requireManageAdmin(): Promise<ManageCartContext> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
        return { ok: false, error: 'Unauthorized.' };
    }
    return { ok: true };
}

function revalidateManageCartPaths(cartId: number) {
    revalidatePath('/manage/orders/active-carts');
    revalidatePath(`/manage/orders/active-carts/${cartId}`);
    revalidatePath('/cart');
    revalidatePath('/shop');
}

async function verifyCartItemForManage(cartId: number, cartItemId: number) {
    if (!Number.isFinite(cartId) || cartId <= 0 || !Number.isFinite(cartItemId) || cartItemId <= 0) {
        return null;
    }

    const row = await db.query.cartItem.findFirst({
        where: eq(cartItem.id, cartItemId),
        with: {
            cart: true,
            product: true,
        },
    });

    if (!row?.cart || row.cart.id !== cartId) {
        return null;
    }

    return row;
}

async function buildEmptyManageCartView(
    cartData: NonNullable<Awaited<ReturnType<typeof getCartById>>>,
): Promise<ShopCartView> {
    const accountOwnerDisplayName = await getAccountOwnerUserDisplayName(cartData.accountId);
    const view = mapCartToView(cartData);

    return {
        ...view,
        accountOwnerDisplayName,
        subTotal: 0,
        tax: 0,
        discounts: 0,
        shipping: 0,
        total: 0,
        itemCount: 0,
        items: [],
    };
}

async function loadManageCartView(cartId: number): Promise<{ ok: true; cart: ShopCartView } | { ok: false; error: string }> {
    const cartData = await getCartById(cartId);
    if (!cartData) {
        return { ok: false, error: 'Cart not found.' };
    }

    const accountOwnerDisplayName = await getAccountOwnerUserDisplayName(cartData.accountId);

    return {
        ok: true,
        cart: { ...mapCartToView(cartData), accountOwnerDisplayName },
    };
}

export async function getManageCart(
    cartId: number,
): Promise<{ ok: true; cart: ShopCartView } | { ok: false; error: string }> {
    const admin = await requireManageAdmin();
    if (!admin.ok) {
        return admin;
    }

    if (!Number.isFinite(cartId) || cartId <= 0) {
        return { ok: false, error: 'Invalid cart.' };
    }

    return loadManageCartView(cartId);
}

export async function updateManageCartItemQuantity(
    cartId: number,
    cartItemId: number,
    quantity: number,
): Promise<{ ok: true; cart: ShopCartView } | { ok: false; error: string }> {
    const admin = await requireManageAdmin();
    if (!admin.ok) {
        return admin;
    }

    const qty = Math.floor(quantity);
    if (!Number.isFinite(qty) || qty < 1) {
        return { ok: false, error: 'Quantity must be greater than zero.' };
    }

    const row = await verifyCartItemForManage(cartId, cartItemId);
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

    revalidateManageCartPaths(cartId);

    return loadManageCartView(cartId);
}

export async function removeManageCartItem(
    cartId: number,
    cartItemId: number,
): Promise<{ ok: true; cart: ShopCartView } | { ok: false; error: string }> {
    const admin = await requireManageAdmin();
    if (!admin.ok) {
        return admin;
    }

    const row = await verifyCartItemForManage(cartId, cartItemId);
    if (!row) {
        return { ok: false, error: 'Cart item not found.' };
    }

    const cartBefore = await getCartById(cartId);

    const removed = await removeCartItemById(cartItemId);
    if (!removed) {
        return { ok: false, error: 'Unable to remove cart item.' };
    }

    revalidateManageCartPaths(cartId);

    const cartAfter = await getCartById(cartId);
    if (!cartAfter && cartBefore) {
        return { ok: true, cart: await buildEmptyManageCartView(cartBefore) };
    }

    return loadManageCartView(cartId);
}
