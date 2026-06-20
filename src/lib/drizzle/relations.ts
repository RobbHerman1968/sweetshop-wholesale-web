import { relations } from "drizzle-orm/relations";
import { productGroup, accountGroup, account, product, productGroupProduct, productImage, vercelImage, cart, cartItem, category, menuItem, page } from "./schema";

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

export const accountRelations = relations(account, ({many}) => ({
	accountGroups: many(accountGroup),
	carts: many(cart),
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

export const menuItemRelations = relations(menuItem, ({one}) => ({
	category: one(category, {
		fields: [menuItem.categoryId],
		references: [category.id]
	}),
	page: one(page, {
		fields: [menuItem.pageId],
		references: [page.id]
	}),
}));

export const categoryRelations = relations(category, ({many}) => ({
	menuItems: many(menuItem),
}));

export const pageRelations = relations(page, ({many}) => ({
	menuItems: many(menuItem),
}));