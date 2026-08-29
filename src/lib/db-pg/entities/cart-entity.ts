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
    shippingMethod: string | null
    expectedDeliveryDate: string | null
    comment: string | null
    cartItems: CartItem[]
    cartAddresses: CartAddress[]
    account: Account
}

export type CartAddress = {
    id: number
    cartId: number
    type: string
    firstName: string | null
    lastName: string | null
    companyName: string | null
    address1: string | null
    address2: string | null
    city: string | null
    state: string | null
    postalCode: string | null
    country: string | null
    phoneNumber: string | null
    emailAddress: string | null
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
