/* eslint-disable @typescript-eslint/no-explicit-any */
'use server';

import { Cart, CartItem } from '../entities/cart-entity';
import { accountMapper } from './account-mapper';
import { productMapper } from './product-mapper';

export async function cartMapper(data: any) {
    const cart: Cart = {} as Cart;
    cart.id = data.id;
    cart.accountId = data.accountId;
    cart.subTotal = Number(data.subTotal);
    cart.shipping = Number(data.shipping);
    cart.tax = Number(data.tax);
    cart.discounts = Number(data.discounts);
    cart.total = Number(data.total);
    cart.cartItems = [];

    if (data.account) {
        cart.account = await accountMapper(data.account);
    }

    if (data.cartItems) {
        for (const ci of data.cartItems) {
            const cartItem = await cartItemMapper(ci);
            cart.cartItems.push(cartItem);
        }
    }

    return cart;
}

export async function cartItemMapper(data: any) {
    const cartItem: CartItem = {} as CartItem;
    cartItem.id = data.id;
    cartItem.cartId = data.cartId;
    cartItem.productId = data.productId;
    cartItem.quantity = data.quantity;
    cartItem.lineTotal = Number(data.lineTotal);

    if (data.product) {
        cartItem.product = await productMapper(data.product);
    }

    return cartItem;
}
