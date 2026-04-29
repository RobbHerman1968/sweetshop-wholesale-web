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
        const cart = await cartMapper(data);
        cart.cartItems.sort((a, b) => (a.product.name.toLowerCase() > b.product.name.toLowerCase() ? 1 : -1));
        return cart;
    }
    return null;
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
    thisCart = await getCartByAccountId(accountId);
    if (thisCart) {
        let newSubTotal: number = 0;
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

    return true;
}

export async function changeQuantityOnCartItem(cartItemId: number, quantity: number, unitPrice: number) {
    console.log('changeQuantityOnCartItem');
    console.log('cartItemId', cartItemId);
    console.log('quantity', quantity);
    console.log('unitPrice', unitPrice);
    const newQuantity = quantity;
    const newTotal = newQuantity * unitPrice;
    await db
        .update(cartItem)
        .set({
            quantity: newQuantity,
            lineTotal: newTotal.toString(),
        })
        .where(eq(cartItem.id, cartItemId));

    return true;
}
