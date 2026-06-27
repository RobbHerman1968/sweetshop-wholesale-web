import { Account } from './account-entity'
import { Product } from './product-entity'

export type Cart = {
    id: number
    accountId: number
    subTotal: number
    tax: number
    discounts: number
    shipping: number
    total: number
    createDate: string
    modifiedDate: string
    cartItems: CartItem[]
    account: Account
}

export type CartItem = {
    id: number
    cartId: number
    productId: number
    quantity: number
    lineTotal: number
    createDate: string
    modifiedDate: string
    product: Product
}
