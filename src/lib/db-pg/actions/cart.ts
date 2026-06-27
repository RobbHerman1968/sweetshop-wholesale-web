'use server';

import { db } from '@/lib/db-pg';
import { eq } from 'drizzle-orm';
import { cart, cartItem } from '@/lib/drizzle/schema';
import { cartMapper } from '../mappers/cart-mapper';

export async function getCartByAccountId(accountId: number) {
    const data = await db.query.cart.findFirst({
        where: eq(cart?.accountId, accountId),
        with: {
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
        },
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

async function recalculateCartTotalsByAccountId(accountId: number) {
    const thisCart = await getCartByAccountId(accountId);
    if (!thisCart) {
        return;
    }

    let newSubTotal = 0;
    for (const item of thisCart.cartItems) {
        newSubTotal += Number(item.lineTotal);
    }

    const newTotal = newSubTotal - Number(thisCart.discounts) + Number(thisCart.tax) + Number(thisCart.shipping);
    await db
        .update(cart)
        .set({
            subTotal: newSubTotal.toString(),
            total: newTotal.toString(),
        })
        .where(eq(cart.id, thisCart.id));
}

export async function addItemToCart(accountId: number, productId: number, quantity: number, unitPrice: number) {
    let thisCart = await getCartByAccountId(accountId);
    console.log(thisCart);

    if (thisCart) {
        console.log('Cart Exists');
        const item = thisCart.cartItems.find((item) => item.productId === productId);

        if (item) {
            console.log('CartItem Exists');
            const newQuantity = item.quantity + quantity;
            const newTotal = newQuantity * unitPrice;
            await db
                .update(cartItem)
                .set({
                    quantity: newQuantity,
                    lineTotal: newTotal.toString(),
                })
                .where(eq(cartItem.id, item.id));
        } else {
            console.log('CartItem Add');
            const newQuantity = quantity;
            const newTotal = newQuantity * unitPrice;
            await db.insert(cartItem).values({
                cartId: thisCart.id,
                productId: productId,
                quantity: quantity,
                lineTotal: newTotal.toString(),
            });
        }
    } else {
        const data = await db
            .insert(cart)
            .values({
                accountId: accountId,
                subTotal: '0',
                tax: '0',
                discounts: '0',
                shipping: '0',
                total: '0',
            })
            .returning();

        const newCartId = data[0].id;

        const newQuantity = quantity;
        const newTotal = newQuantity * unitPrice;
        await db.insert(cartItem).values({
            cartId: newCartId,
            productId: productId,
            quantity: quantity,
            lineTotal: newTotal.toString(),
        });
    }

    // UPDATE THE TOTAL
    await recalculateCartTotalsByAccountId(accountId);

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
        })
        .where(eq(cartItem.id, cartItemId));

    const [cartRow] = await db
        .select({ accountId: cart.accountId })
        .from(cart)
        .where(eq(cart.id, row.cartId))
        .limit(1);

    if (cartRow) {
        await recalculateCartTotalsByAccountId(cartRow.accountId);
    }

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

    await db.delete(cartItem).where(eq(cartItem.id, cartItemId));

    const [cartRow] = await db
        .select({ accountId: cart.accountId })
        .from(cart)
        .where(eq(cart.id, row.cartId))
        .limit(1);

    if (cartRow) {
        await recalculateCartTotalsByAccountId(cartRow.accountId);
    }

    return true;
}
