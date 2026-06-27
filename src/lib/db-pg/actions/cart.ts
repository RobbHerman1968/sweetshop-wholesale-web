'use server';

import { db } from '@/lib/db-pg';
import { desc, eq, gt, sql } from 'drizzle-orm';
import { account, cart, cartItem } from '@/lib/drizzle/schema';
import { cartMapper } from '../mappers/cart-mapper';

export type ManageActiveCartListRow = {
    id: number;
    accountId: number;
    accountMateId: string | null;
    accountName: string | null;
    contactFirstName: string | null;
    contactLastName: string | null;
    totalProducts: number;
    total: string;
    createDate: string;
    modifiedDate: string;
};

export async function getPaginatedActiveCartsFromDB({ page = 1, limit = 50 }: { page?: number; limit?: number }) {
    const offset = (page - 1) * limit;

    const data = await db
        .select({
            id: cart.id,
            accountId: cart.accountId,
            accountMateId: account.accountMateId,
            accountName: account.name,
            contactFirstName: account.contactFirstName,
            contactLastName: account.contactLastName,
            total: cart.total,
            createDate: cart.createDate,
            modifiedDate: cart.modifiedDate,
            totalProducts: sql<number>`coalesce(sum(${cartItem.quantity}), 0)::int`,
        })
        .from(cart)
        .innerJoin(account, eq(cart.accountId, account.id))
        .innerJoin(cartItem, eq(cartItem.cartId, cart.id))
        .groupBy(
            cart.id,
            cart.accountId,
            account.accountMateId,
            account.name,
            account.contactFirstName,
            account.contactLastName,
            cart.total,
            cart.createDate,
            cart.modifiedDate,
        )
        .having(gt(sql`sum(${cartItem.quantity})`, 0))
        .orderBy(desc(cart.id))
        .limit(limit)
        .offset(offset);

    const countResult = await db
        .select({ count: sql<number>`count(distinct ${cart.id})::int` })
        .from(cart)
        .innerJoin(cartItem, eq(cartItem.cartId, cart.id))
        .where(gt(cartItem.quantity, 0));

    const count = Number(countResult[0]?.count ?? 0);

    return {
        data,
        pagination: {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit) || 1,
        },
    };
}

const cartWithItemsQuery = {
    account: true,
    cartItems: {
        with: {
            product: {
                with: {
                    productImages: {
                        with: {
                            vercelImage: true,
                        },
                    },
                },
            },
        },
    },
} as const;

export async function getCartByAccountId(accountId: number) {
    const data = await db.query.cart.findFirst({
        where: eq(cart?.accountId, accountId),
        with: cartWithItemsQuery,
    });
    if (data) {
        return cartMapper(data);
    }
    return null;
}

export async function getCartById(cartId: number) {
    const data = await db.query.cart.findFirst({
        where: eq(cart.id, cartId),
        with: cartWithItemsQuery,
    });
    if (data) {
        return cartMapper(data);
    }
    return null;
}

/** Sum of line quantities for the account cart (0 when no cart). */
export async function getCartItemCountByAccountId(accountId: number): Promise<number> {
    const data = await db.query.cart.findFirst({
        where: eq(cart.accountId, accountId),
        columns: { id: true },
        with: {
            cartItems: {
                columns: { quantity: true },
            },
        },
    });

    if (!data?.cartItems?.length) {
        return 0;
    }

    return data.cartItems.reduce((sum, item) => sum + item.quantity, 0);
}

async function updateCartAfterItemChange(cartId: number) {
    const cartData = await getCartById(cartId);
    if (!cartData) {
        return;
    }

    let newSubTotal = 0;
    for (const item of cartData.cartItems) {
        newSubTotal += Number(item.lineTotal);
    }

    const newTotal = newSubTotal - Number(cartData.discounts) + Number(cartData.tax) + Number(cartData.shipping);
    await db
        .update(cart)
        .set({
            subTotal: newSubTotal.toString(),
            total: newTotal.toString(),
            modifiedDate: sql`now()`,
        })
        .where(eq(cart.id, cartId));
}

export async function addItemToCart(accountId: number, productId: number, quantity: number, unitPrice: number) {
    let thisCart = await getCartByAccountId(accountId);
    let cartId: number;

    if (thisCart) {
        cartId = thisCart.id;
        const item = thisCart.cartItems.find((item) => item.productId === productId);

        if (item) {
            const newQuantity = item.quantity + quantity;
            const newTotal = newQuantity * unitPrice;
            await db
                .update(cartItem)
                .set({
                    quantity: newQuantity,
                    lineTotal: newTotal.toString(),
                    modifiedDate: sql`now()`,
                })
                .where(eq(cartItem.id, item.id));
        } else {
            const newTotal = quantity * unitPrice;
            await db.insert(cartItem).values({
                cartId: thisCart.id,
                productId: productId,
                quantity: quantity,
                lineTotal: newTotal.toString(),
            });
        }
    } else {
        const [newCart] = await db
            .insert(cart)
            .values({
                accountId: accountId,
                subTotal: '0',
                tax: '0',
                discounts: '0',
                shipping: '0',
                total: '0',
            })
            .returning({ id: cart.id });

        cartId = newCart.id;

        const newTotal = quantity * unitPrice;
        await db.insert(cartItem).values({
            cartId,
            productId: productId,
            quantity: quantity,
            lineTotal: newTotal.toString(),
        });
    }

    await updateCartAfterItemChange(cartId);

    return true;
}

export async function changeQuantityOnCartItem(cartItemId: number, quantity: number, unitPrice: number) {
    const newQuantity = quantity;
    const newTotal = newQuantity * unitPrice;
    const [row] = await db
        .select({ cartId: cartItem.cartId })
        .from(cartItem)
        .where(eq(cartItem.id, cartItemId))
        .limit(1);

    if (!row) {
        return false;
    }

    await db
        .update(cartItem)
        .set({
            quantity: newQuantity,
            lineTotal: newTotal.toString(),
            modifiedDate: sql`now()`,
        })
        .where(eq(cartItem.id, cartItemId));

    await updateCartAfterItemChange(row.cartId);

    return true;
}

export async function removeCartItemById(cartItemId: number) {
    const [row] = await db
        .select({ cartId: cartItem.cartId })
        .from(cartItem)
        .where(eq(cartItem.id, cartItemId))
        .limit(1);

    if (!row) {
        return false;
    }

    const cartId = row.cartId;

    await db.delete(cartItem).where(eq(cartItem.id, cartItemId));

    const [remainingItem] = await db
        .select({ id: cartItem.id })
        .from(cartItem)
        .where(eq(cartItem.cartId, cartId))
        .limit(1);

    if (!remainingItem) {
        await db.delete(cart).where(eq(cart.id, cartId));
        return true;
    }

    await updateCartAfterItemChange(cartId);

    return true;
}
