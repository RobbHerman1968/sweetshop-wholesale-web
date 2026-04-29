'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db-pg';
import { product, productGroupProduct, productImage, vercelImage } from '@/lib/drizzle/schema';
import { count, ilike, eq, and, inArray, asc, sql } from 'drizzle-orm';
import { Product } from '../entities/product-entity';
import { productMapper } from '../mappers/product-mapper';

export async function getProductCount(name: string, itemNumber: string) {
    let returnCount;

    if (name.length > 0 || itemNumber.length > 0) {
        returnCount = await db
            .select({ count: count() })
            .from(product)
            .where(and(ilike(product.name, '%' + name + '%'), ilike(product.itemNumber, '%' + itemNumber + '%')));
    } else {
        returnCount = await db.select({ count: count() }).from(product);
    }

    return returnCount;
}

export async function getProducts(limit: number, offset: number, name: string, itemNumber: string) {
    const nameFilter = '%' + name + '%';
    const itemFilter = '%' + itemNumber + '%';

    const products = await db
        .select({ id: product.id, name: product.name, itemNumber: product.itemNumber, isActive: product.isActive })
        .from(product)
        .where(and(ilike(product.name, '%' + nameFilter + '%'), ilike(product.itemNumber, '%' + itemFilter + '%')))
        .orderBy((x) => x.name)
        .limit(limit)
        .offset(offset);

    const out: Product[] = [];
    products?.map(async (p) => {
        out.push(await productMapper(p));
    });
    return out;
}

export async function getAllProducts() {
    const products = await db.query.product.findMany({
        orderBy: asc(product.id),
    });

    const out: Product[] = [];
    products?.map(async (p) => {
        out.push(await productMapper(p));
    });
    return out;
}

export async function getAllProductsOld() {
    const products = await db.query.productOld.findMany({
        orderBy: asc(product.id),
    });

    const out: Product[] = [];
    products?.map(async (p) => {
        out.push(await productMapper(p));
    });
    return out;
}

export async function getPaginatedProductsFromDB({ page = 1, limit = 10, name, itemNumber, isActive }: { page?: number; limit?: number; name?: string; itemNumber?: string; isActive?: boolean }) {
    console.log('getPaginatedProductsFromDB', { page, limit, name, itemNumber, isActive });

    const offset = (page - 1) * limit;

    const whereClause = (fields: typeof product._.columns) => {
        const conditions = [];

        if (name) {
            conditions.push(ilike(fields.name, `%${name}%`));
        }

        if (itemNumber) {
            conditions.push(ilike(fields.itemNumber, `%${itemNumber}%`));
        }

        if (typeof isActive === 'boolean') {
            conditions.push(eq(fields.isActive, isActive));
        }

        if (conditions.length === 0) return undefined;
        if (conditions.length === 1) return conditions[0];
        return and(...conditions);
    };

    try {
        const data = await db.query.product.findMany({
            where: whereClause,
            with: {
                productImages: {
                    with: {
                        vercelImage: true,
                    },
                },
            },
            orderBy: [asc(product.name)],
            limit,
            offset,
        });

        const [{ count }] = await db
            .select({ count: sql<number>`count(*)` })
            .from(product)
            .where(whereClause(product));

        return {
            data,
            pagination: {
                total: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit),
            },
        };

        // const offset = (page - 1) * limit

        // // Dynamically build where conditions
        // const conditions = []

        // if (name) {
        //     conditions.push(ilike(product.name, `%${name}%`))
        // }

        // if (itemNumber) {
        //     conditions.push(eq(product.itemNumber, itemNumber))
        // }

        // if (typeof isActive === 'boolean') {
        //     conditions.push(eq(product.isActive, isActive))
        // }

        // const whereClause =
        //     conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : and(...conditions)

        // try {
        //     const data = await db
        //         .select({
        //             product,
        //             productImage,
        //         })
        //         .from(product)
        //         .leftJoin(productImage, eq(product.id, productImage.productId))
        //         .where(whereClause)
        //         .limit(limit)
        //         .offset(offset)

        //     // Count query
        //     const [{ count }] = await db
        //         .select({ count: sql<number>`count(*)` })
        //         .from(product)
        //         .where(whereClause)

        //     return {
        //         data,
        //         pagination: {
        //             total: count,
        //             page,
        //             limit,
        //             totalPages: Math.ceil(count / limit),
        //         },
        //     }
    } catch (error) {
        console.error('Error fetching paginated products:', error);
        throw new Error('Failed to fetch products');
    }
}

export async function getProductsBySearch(name: string | undefined, itemNumber: string | undefined) {
    console.log('search 1');
    const nameFilter = '%' + name + '%';
    const itemFilter = '%' + itemNumber + '%';

    const products = await db.query.product.findMany({
        where: and(ilike(product.name, '%' + nameFilter + '%'), ilike(product.itemNumber, '%' + itemFilter + '%')),
        orderBy: [asc(product.name)],
        with: {
            productImages: {
                with: {
                    vercelImage: true,
                },
            },
        },
    });

    // const products = await db
    //     .select({
    //         id: product.id,
    //         name: product.name,
    //         itemNumber: product.itemNumber,
    //         isActive: product.isActive,
    //         price: product.price,
    //         productImages: productImage,
    //     })
    //     .from(product)
    //     .leftJoin(productImage, eq(product.id, productImage.productId))
    //     .where(and(ilike(product.name, '%' + nameFilter + '%'), ilike(product.itemNumber, '%' + itemFilter + '%')))
    //     .orderBy(asc(sql`lower(${product.name})`))

    const out: Product[] = [];
    products?.map(async (p) => {
        out.push(await productMapper(p));
    });
    const outAfterSort = out.sort((a, b) => (a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1));
    for (const a of outAfterSort) {
        console.log(a.name);
    }
    return outAfterSort;
}

export async function getProductsBySearch2(name: string | undefined, itemNumber: string | undefined) {
    console.log('search 2');
    const nameFilter = '%' + name + '%';
    const itemFilter = '%' + itemNumber + '%';

    const products = await db.query.product.findMany({
        where: and(ilike(product.name, '%' + nameFilter + '%'), ilike(product.itemNumber, '%' + itemFilter + '%')),
        orderBy: [asc(product.name)],
        with: {
            productImages: {
                with: {
                    vercelImage: true,
                },
            },
        },
    });

    // const products = await db.query.product.findMany({
    //     columns: {
    //         id: true,
    //         name: true,
    //         itemNumber: true,
    //         isActive: true,
    //         price: true,
    //     },
    //     with: {
    //         productImages: true,
    //     },
    //     where: and(ilike(product.name, '%' + nameFilter + '%'), ilike(product.itemNumber, '%' + itemFilter + '%')),
    //     orderBy: [asc(product.name)],
    // })

    const out: Product[] = [];
    products?.map(async (p) => {
        out.push(await productMapper(p));
    });
    return out.sort((a, b) => (a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1));
}

export async function getProductsByProductGroups(productGroupIds: number[]) {
    const productGroupProducts = await db.query.productGroupProduct.findMany({
        where: inArray(productGroupProduct.productGroupId, productGroupIds),
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
    });

    const out: Product[] = [];
    productGroupProducts?.map(async (pg) => {
        out.push(await productMapper(pg.product));
    });
    return out;
}

export async function getProductById(id: number) {
    const data = await db.query.product.findFirst({
        where: eq(product.id, id),
        with: {
            productImages: true,
        },
    });

    return productMapper(data);
}

export async function updateProductById(data: Product) {
    await db
        .update(product)
        .set({
            name: data.name,
            description: data.description,
            itemNumber: data.itemNumber,
            pieces: data.pieces,
            price: data.price.toString(),
            weightInOunces: data.weightInOunces.toString(),
            shippingBoxFactor: data.shippingBoxFactor.toString(),
            nutrition: data.nutrition,
            ingredients: data.ingredients,
            download: data.download,
            isActive: data.isActive,
        })
        .where(eq(product.id, data.id));

    return data.id;
}

function getFormRichText(formData: FormData, key: string, fallback: string | undefined): string {
    const raw = formData.get(key);
    return typeof raw === 'string' ? raw : (fallback ?? '');
}

export async function updateProductFromForm(formData: FormData) {
    const id = Number(formData.get('id'));
    if (!id) return;
    const existing = await getProductById(id);
    if (!existing) return;
    const name = (formData.get('name') as string)?.trim() ?? existing.name ?? '';
    const itemNumber = (formData.get('itemNumber') as string)?.trim() ?? existing.itemNumber ?? '';
    const priceRaw = formData.get('price');
    const price = priceRaw !== null && priceRaw !== '' ? Number(priceRaw) : existing.price;
    const description = getFormRichText(formData, 'description', existing.description);
    const download = getFormRichText(formData, 'download', existing.download);
    const ingredients = getFormRichText(formData, 'ingredients', existing.ingredients);
    const nutrition = getFormRichText(formData, 'nutrition', existing.nutrition);
    const isActive = formData.get('isActive') === 'on' || formData.get('isActive') === 'true';
    const updated: Product = {
        ...existing,
        name,
        itemNumber,
        price: Number.isNaN(price) ? existing.price : price,
        description,
        download,
        ingredients,
        nutrition,
        isActive,
    };
    await updateProductById(updated);
    revalidatePath('/manage/products');
}

export async function createProduct(data: Product) {
    await db.insert(product).values({
        id: data.id,
        name: data.name,
        description: data.description,
        itemNumber: data.itemNumber,
        pieces: data.pieces,
        price: data.price.toString(),
        weightInOunces: data.weightInOunces.toString(),
        shippingBoxFactor: data.shippingBoxFactor.toString(),
        nutrition: data.nutrition,
        ingredients: data.ingredients,
        download: data.download,
        isActive: data.isActive,
    });

    return null;
}

export async function addProductImage(productId: number, _path: string) {
    const newProductImage = await db
        .insert(productImage)
        .values({
            productId: productId,
            vercelImageId: 0, // Assuming vercelImageId is not used here, adjust as necessary
        })
        .returning();

    return newProductImage[0].id;
}

export async function deleteProductById(id: number) {
    await db.delete(productImage).where(eq(productImage.productId, id));
    await db.delete(productGroupProduct).where(eq(productGroupProduct.productId, id));
    await db.delete(product).where(eq(product.id, id));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function processOldProducts(oldProducts: any[]) {
    try {
        const existingProducts = await db.query.product.findMany({
            orderBy: asc(product.id),
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rows: any[] = oldProducts.map((o: any) => {
            return {
                id: o.Id,
                name: o.Name,
                itemNumber: o.ItemNumber,
                description: o.Description,
                nutrition: o.Nutrition,
                ingredients: o.Ingredients,
                download: o.Download,
                price: o.WholesalePrice,
                pieces: o.Pieces,
                weightInOunces: o.Weight,
                isActive: o.IsActive,
                shippingBoxFactor: o.ShippingBoxFactor,
                isWholesale: o.IsWholesale ? 1 : 0,
            };
        });

        for (const p of rows) {
            const existingProduct = existingProducts.find((ep) => ep.id === p.id);
            if (existingProduct) {
                await db.update(product).set(p).where(eq(product.id, p.id));
            } else {
                await db.insert(product).values(p);
            }
        }
    } catch (error) {
        console.error('Error processing old products:', error);
        throw new Error('Failed to process old products');
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function processOldProductImages(oldProductImages: any[]) {
    try {
        const vercelImages = await db.query.vercelImage.findMany({
            orderBy: asc(vercelImage.id),
        });

        const existingProductImages = await db.query.productImage.findMany({
            orderBy: asc(productImage.id),
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rows: any[] = oldProductImages.map((o: any) => {
            return {
                id: o.Id,
                productId: o.ProductId,
                path: o.Path,
                isDefault: o.IsDefault,
            };
        });

        for (const p of rows) {
            const vercelImage = vercelImages.find((vi) => vi.imageName.toUpperCase() === p.path.toUpperCase());
            if (!vercelImage) {
                console.log(`********* Vercel image not found for path: ${p.path}`);
                continue;
            }
            const existingImage = existingProductImages.find((ei) => ei.productId === p.productId && ei.vercelImageId === vercelImage?.id);
            if (!existingImage) {
                await db.insert(productImage).values({
                    productId: p.productId,
                    vercelImageId: vercelImage?.id,
                });
            }
        }
    } catch (error) {
        console.error('Error processing old product images:', error);
        throw new Error('Failed to process old product images');
    }
}
