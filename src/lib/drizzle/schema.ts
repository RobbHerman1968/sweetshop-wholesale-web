import { pgTable, serial, text, numeric, boolean, integer, unique, foreignKey, timestamp, varchar } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const product = pgTable("product", {
	id: serial().primaryKey().notNull(),
	name: text(),
	itemNumber: text(),
	description: text(),
	nutrition: text(),
	ingredients: text(),
	download: text(),
	price: numeric({ precision: 10, scale:  2 }).default('0').notNull(),
	pieces: text(),
	weightInOunces: numeric({ precision: 12, scale:  2 }).default('0').notNull(),
	isActive: boolean().default(false).notNull(),
	shippingBoxFactor: numeric({ precision: 12, scale:  3 }).default('1').notNull(),
	isWholesale: integer().default(0).notNull(),
});

export const user = pgTable("user", {
	id: integer().primaryKey().notNull(),
	userName: text().notNull(),
	passwordHash: text().notNull(),
	isActive: boolean().default(false).notNull(),
	isAdmin: boolean().default(false).notNull(),
	firstName: text(),
	lastName: text(),
	accountMateId: text(),
}, (table) => [
	unique("user_username_unique").on(table.userName),
]);

export const userReset = pgTable("userReset", {
	id: serial().primaryKey().notNull(),
	userId: integer().notNull(),
	resetValue: integer().notNull(),
	validUntil: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "userReset_user_id_fk"
		}),
]);

export const account = pgTable("account", {
	id: serial().primaryKey().notNull(),
	accountMateId: text(),
	isSkipTax: boolean().default(false).notNull(),
	isSkipShipping: boolean().default(false).notNull(),
	isFreeGroundShipping: boolean().default(false).notNull(),
	terms: text(),
	isTerms: boolean().default(false).notNull(),
	name: text(),
	contactFirstName: text(),
	contactLastName: text(),
	contactPhone: text(),
	contactAddress1: text(),
	contactAddress2: text(),
	contactCity: text(),
	contactState: text(),
	contactZipCode: text(),
	contactEmail: text(),
	menuId: integer().default(3).notNull(),
});

export const productGroupProduct = pgTable("productGroupProduct", {
	id: serial().primaryKey().notNull(),
	productGroupId: integer().notNull(),
	productId: integer().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.productId],
			foreignColumns: [product.id],
			name: "productGroupProduct_product_id_fk"
		}),
	foreignKey({
			columns: [table.productGroupId],
			foreignColumns: [productGroup.id],
			name: "productGroupProduct_productGroup_id_fk"
		}),
]);

export const productGroup = pgTable("productGroup", {
	id: serial().primaryKey().notNull(),
	name: text(),
	shippingLeadDays: integer("ShippingLeadDays").default(0).notNull(),
});

export const productImage = pgTable("productImage", {
	id: serial().primaryKey().notNull(),
	productId: integer().notNull(),
	vercelImageId: integer().default(0).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.productId],
			foreignColumns: [product.id],
			name: "productImage_product_id_fk"
		}),
	foreignKey({
			columns: [table.vercelImageId],
			foreignColumns: [vercelImage.id],
			name: "productImage_vercelImage_id_fk"
		}),
]);

export const order = pgTable("order", {
	id: serial().primaryKey().notNull(),
	userId: integer().notNull(),
	orderNumber: integer(),
	orderDate: timestamp({ withTimezone: true, mode: 'string' }),
	subTotal: numeric({ precision: 10, scale:  2 }).notNull(),
	shipping: numeric({ precision: 10, scale:  2 }).notNull(),
	tax: numeric({ precision: 10, scale:  2 }).notNull(),
	promotionCode: numeric({ precision: 10, scale:  2 }),
	promotionDiscount: numeric({ precision: 10, scale:  2 }),
	total: numeric({ precision: 10, scale:  2 }).notNull(),
	ccLastFour: text(),
	ccExp: text(),
	ccType: text(),
	comment: text(),
	expectedDeliveryDate: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	shippingCode: text().notNull(),
	accountMateReturnStatus: text(),
	accountMateTransactionId: text(),
	isNewCustomerOrder: integer().notNull(),
	accountMateOrderNumber: integer(),
});

export const cart = pgTable("cart", {
	id: serial().primaryKey().notNull(),
	accountId: integer().notNull(),
	subTotal: numeric({ precision: 10, scale:  2 }).default('0'),
	shipping: numeric({ precision: 10, scale:  2 }).default('0').notNull(),
	tax: numeric({ precision: 10, scale:  2 }).default('0').notNull(),
	discounts: numeric({ precision: 10, scale:  2 }).default('0').notNull(),
	total: numeric({ precision: 10, scale:  2 }).default('0').notNull(),
	createDate: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	modifiedDate: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.accountId],
			foreignColumns: [account.id],
			name: "cart_account_id_fk"
		}),
]);

export const menuItem = pgTable("menuItem", {
	id: serial().primaryKey().notNull(),
	menuId: integer().notNull(),
	parentMenuItemId: integer().notNull(),
	categoryId: integer(),
	name: text().notNull(),
	isActive: boolean().default(false).notNull(),
	displayOrder: integer().default(0).notNull(),
	pageId: integer(),
	externalUrl: text(),
}, (table) => [
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [category.id],
			name: "FK_MenuItem_Category"
		}),
	foreignKey({
			columns: [table.pageId],
			foreignColumns: [page.id],
			name: "FK_MenuItem_Page"
		}),
]);

export const orderAddress = pgTable("orderAddress", {
	id: serial().primaryKey().notNull(),
	orderId: integer().notNull(),
	type: text().notNull(),
	firstName: text(),
	lastName: text().notNull(),
	companyName: text(),
	address1: text().notNull(),
	address2: text(),
	city: text().notNull(),
	state: text().notNull(),
	postalCode: text().notNull(),
	country: text().notNull(),
	phoneNumber: text().notNull(),
	emailAddress: text().notNull(),
});

export const orderItem = pgTable("orderItem", {
	id: serial().primaryKey().notNull(),
	orderId: integer().notNull(),
	itemNumber: text().notNull(),
	productId: integer().notNull(),
	name: text().notNull(),
	imagePath: text(),
	price: numeric({ precision: 10, scale:  2 }).notNull(),
	promotionPrice: numeric({ precision: 10, scale:  2 }).notNull(),
	quantity: integer().notNull(),
	lineTotal: numeric({ precision: 10, scale:  2 }).notNull(),
	weight: numeric({ precision: 10, scale:  2 }).notNull(),
	variableData: text(),
	timeStamp: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
});

export const menu = pgTable("menu", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	isShopping: boolean().default(false).notNull(),
	shippingLeadTime: integer().default(14).notNull(),
});

export const cartItem = pgTable("cartItem", {
	id: serial().primaryKey().notNull(),
	cartId: integer().default(0).notNull(),
	productId: integer().notNull(),
	quantity: integer().default(0).notNull(),
	lineTotal: numeric({ precision: 10, scale:  2 }).default('0').notNull(),
	createDate: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	modifiedDate: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.productId],
			foreignColumns: [product.id],
			name: "cartItem_product_id_fk"
		}),
	foreignKey({
			columns: [table.cartId],
			foreignColumns: [cart.id],
			name: "cartItem_cart_id_fk"
		}),
]);

export const category = pgTable("category", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	navName: text().notNull(),
	isActive: boolean().notNull(),
});

export const productCategory = pgTable("productCategory", {
	id: serial().primaryKey().notNull(),
	productId: integer().notNull(),
	categoryId: integer().notNull(),
	displayOrder: integer().notNull(),
});

export const page = pgTable("page", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	navName: text().notNull(),
	content: text().notNull(),
	imageUrl: text(),
	isActive: boolean().default(false),
});

export const vercelImage = pgTable("vercelImage", {
	id: serial().primaryKey().notNull(),
	imageName: varchar({ length: 100 }).notNull(),
	path: text().notNull(),
	name: text(),
	isProductImage: boolean().default(false).notNull(),
});

export const stateShippingTaxRate = pgTable("stateShippingTaxRate", {
	id: serial().primaryKey().notNull(),
	stateAbbr: text().notNull(),
	shippingRate: numeric({ precision: 10, scale:  2 }).notNull(),
	taxRate: numeric({ precision: 10, scale:  4 }).default('0').notNull(),
	stateName: text(),
});

export const xrefImage = pgTable("xrefImage", {
	id: serial().primaryKey().notNull(),
	productId: integer().notNull(),
	imageName: varchar({ length: 100 }).notNull(),
});

export const productImageNew = pgTable("productImageNew", {
	id: serial().primaryKey().notNull(),
	productId: integer().notNull(),
	vercelImageId: integer().notNull(),
});

export const productOldImage = pgTable("productOldImage", {
	id: serial().primaryKey().notNull(),
	productId: integer().notNull(),
	fileName: text().notNull(),
	isDefault: boolean().notNull(),
	isActive: boolean().notNull(),
	order: integer().notNull(),
});

export const productOld = pgTable("productOld", {
	id: serial().primaryKey().notNull(),
	name: text(),
	itemNumber: text(),
	description: text(),
	nutrition: text(),
	ingredients: text(),
	download: text(),
	price: numeric({ precision: 10, scale:  2 }),
	pieces: integer(),
	weightInOunces: numeric({ precision: 10, scale:  2 }),
	isActive: boolean().notNull(),
	shippingBoxFactor: numeric({ precision: 10, scale:  3 }),
});

export const siteSetting = pgTable("siteSetting", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	value: numeric({ precision: 10, scale:  2 }).notNull(),
	textValue: text(),
});

/** Singleton row for HomePage Setup JSON (not a site setting). */
export const homepageContent = pgTable("homepageContent", {
	id: integer().primaryKey().notNull(),
	content: text().notNull(),
	updatedAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

/** Wholesale Apply Now form submissions. */
export const application = pgTable("application", {
	id: serial().primaryKey().notNull(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	businessName: text().notNull(),
	taxId: text().notNull(),
	contactFirstName: text().notNull(),
	contactLastName: text().notNull(),
	billingAddress1: text().notNull(),
	billingAddress2: text(),
	city: text().notNull(),
	state: text().notNull(),
	zipCode: text().notNull(),
	phone: text().notNull(),
	fax: text(),
	email: text().notNull(),
	emailSent: boolean().default(false).notNull(),
});

export const accountAddress = pgTable("accountAddress", {
	id: serial().primaryKey().notNull(),
	accountId: integer().notNull(),
	name: text(),
	type: text(),
	companyName: text(),
	firstName: text(),
	lastName: text(),
	addressLine1: text(),
	addressLine2: text(),
	city: text(),
	state: text(),
	postalCode: text(),
	county: text(),
	emailAddress: text(),
	phoneNumber: text(),
});

export const orderLog = pgTable("orderLog", {
	id: serial().primaryKey().notNull(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	outcome: text().notNull(),
	message: text().notNull(),
	stage: text(),
	userId: integer(),
	accountId: integer(),
	cartId: integer(),
	orderId: integer(),
	orderNumber: integer(),
	accountMateId: text(),
	accountMateOrderNumber: text(),
	accountMateTransactionId: text(),
	accountMateStatus: text(),
	error: text(),
});
