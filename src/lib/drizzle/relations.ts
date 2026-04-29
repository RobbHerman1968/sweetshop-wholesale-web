import { relations } from "drizzle-orm/relations";
import { user, account, productGroup, accountGroup, product, productGroupProduct, productImage, vercelImage, cart, cartItem } from "./schema";

export const accountRelations = relations(account, ({one, many}) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id]
	}),
	accountGroups: many(accountGroup),
	carts: many(cart),
}));

export const userRelations = relations(user, ({many}) => ({
	accounts: many(account),
}));

export const accountGroupRelations = relations(accountGroup, ({one}) => ({
	productGroup: one(productGroup, {
		fields: [accountGroup.productGroupId],
		references: [productGroup.id]
	}),
	account: one(account, {
		fields: [accountGroup.accountId],
		references: [account.id]
	}),
}));

export const productGroupRelations = relations(productGroup, ({many}) => ({
	accountGroups: many(accountGroup),
	productGroupProducts: many(productGroupProduct),
}));

export const productGroupProductRelations = relations(productGroupProduct, ({one}) => ({
	product: one(product, {
		fields: [productGroupProduct.productId],
		references: [product.id]
	}),
	productGroup: one(productGroup, {
		fields: [productGroupProduct.productGroupId],
		references: [productGroup.id]
	}),
}));

export const productRelations = relations(product, ({many}) => ({
	productGroupProducts: many(productGroupProduct),
	productImages: many(productImage),
	cartItems: many(cartItem),
}));

export const productImageRelations = relations(productImage, ({one}) => ({
	product: one(product, {
		fields: [productImage.productId],
		references: [product.id]
	}),
	vercelImage: one(vercelImage, {
		fields: [productImage.vercelImageId],
		references: [vercelImage.id]
	}),
}));

export const vercelImageRelations = relations(vercelImage, ({many}) => ({
	productImages: many(productImage),
}));

export const cartRelations = relations(cart, ({one, many}) => ({
	account: one(account, {
		fields: [cart.accountId],
		references: [account.id]
	}),
	cartItems: many(cartItem),
}));

export const cartItemRelations = relations(cartItem, ({one}) => ({
	product: one(product, {
		fields: [cartItem.productId],
		references: [product.id]
	}),
	cart: one(cart, {
		fields: [cartItem.cartId],
		references: [cart.id]
	}),
}));