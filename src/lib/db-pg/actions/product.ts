'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db-pg';
import { product, productGroup, productGroupProduct, productImage, productCategory, productOldImage, vercelImage } from '@/lib/drizzle/schema';
import { count, ilike, eq, and, or, inArray, asc, desc, sql, max } from 'drizzle-orm';
import { Product } from '../entities/product-entity';
import { productMapper } from '../mappers/product-mapper';
import { SHOP_PRODUCT_FACETS } from '@/lib/shop-product-facets';
import { cleanHtmlEntitySymbols } from '@/lib/clean-html-entities';
import { buildLegacyDynImageUrl } from '@/lib/legacy-dynimage-url';

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

export async function getProductGroupsWithActiveProducts() {
    const rows = await db
        .selectDistinct({
            id: productGroup.id,
            name: productGroup.name,
        })
        .from(productGroup)
        .innerJoin(productGroupProduct, eq(productGroupProduct.productGroupId, productGroup.id))
        .innerJoin(product, eq(product.id, productGroupProduct.productId))
        .where(eq(product.isActive, true))
        .orderBy(asc(productGroup.name));

    return rows;
}

export async function getPaginatedProductsFromDB({
    page = 1,
    limit = 10,
    name,
    itemNumber,
    search,
    productGroupIds,
    shopFacetIds,
    categoryId,
    categoryIds,
    isActive,
}: {
    page?: number;
    limit?: number;
    name?: string;
    itemNumber?: string;
    /** Matches product name OR item number (shop search box). Ignores `name` / `itemNumber` when set. */
    search?: string;
    /** Product must appear in `productGroupProduct` for one of these ids (typically from `accountGroup` for the selected account). */
    productGroupIds?: number[];
    /** Shop keyword facets: AND across selected facets; within each facet, OR across its search terms (name / description ILIKE). */
    shopFacetIds?: string[];
    /** Product must appear in `productCategory` for this category id. */
    categoryId?: number;
    /** Product must appear in `productCategory` for one of these category ids. */
    categoryIds?: number[];
    isActive?: boolean;
}) {
    const offset = (page - 1) * limit;

    const trimmedSearch = search?.trim();
    const groupIds = productGroupIds?.filter((id) => Number.isFinite(id) && id > 0) ?? [];
    const menuCategoryIds = categoryIds?.filter((id) => Number.isFinite(id) && id > 0) ?? [];
    const facetIdSet = new Set((shopFacetIds ?? []).filter(Boolean));

    const whereClause = (fields: typeof product._.columns) => {
        const conditions = [];

        if (trimmedSearch) {
            const term = `%${trimmedSearch}%`;
            conditions.push(or(ilike(fields.name, term), ilike(fields.itemNumber, term)));
        } else {
            if (name) {
                conditions.push(ilike(fields.name, `%${name}%`));
            }

            if (itemNumber) {
                conditions.push(ilike(fields.itemNumber, `%${itemNumber}%`));
            }
        }

        if (typeof isActive === 'boolean') {
            conditions.push(eq(fields.isActive, isActive));
        }

        if (productGroupIds !== undefined) {
            if (groupIds.length === 0) {
                conditions.push(sql`false`);
            } else {
                conditions.push(
                    inArray(
                        fields.id,
                        db
                            .select({ pid: productGroupProduct.productId })
                            .from(productGroupProduct)
                            .where(inArray(productGroupProduct.productGroupId, groupIds)),
                    ),
                );
            }
        }

        if (categoryId != null && categoryId > 0) {
            conditions.push(
                inArray(
                    fields.id,
                    db
                        .select({ pid: productCategory.productId })
                        .from(productCategory)
                        .where(eq(productCategory.categoryId, categoryId)),
                ),
            );
        } else if (categoryIds !== undefined) {
            if (menuCategoryIds.length === 0) {
                conditions.push(sql`false`);
            } else {
                conditions.push(
                    inArray(
                        fields.id,
                        db
                            .select({ pid: productCategory.productId })
                            .from(productCategory)
                            .where(inArray(productCategory.categoryId, menuCategoryIds)),
                    ),
                );
            }
        }

        for (const facet of SHOP_PRODUCT_FACETS) {
            if (!facetIdSet.has(facet.id)) continue;
            const termClauses = facet.searchTerms.map((term) => {
                const t = `%${term}%`;
                return or(ilike(fields.name, t), ilike(fields.description, t));
            });
            conditions.push(termClauses.length === 1 ? termClauses[0] : or(...termClauses));
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

        const countRows = await db
            .select({ count: sql<number>`count(*)` })
            .from(product)
            .where(whereClause(product));
        const count = Number(countRows[0]?.count ?? 0);

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

/** Per facet: true if some active product matches `search` plus this facet AND-ed with `selectedFacetIds`. Selected ids stay true so users can always uncheck. */
export async function getShopFacetAvailability(opts: {
    search?: string;
    selectedFacetIds: string[];
    /** When set (e.g. public shop), counts only include products in these groups. */
    productGroupIds?: number[];
    categoryId?: number;
    categoryIds?: number[];
}) {
    const selected = new Set(opts.selectedFacetIds);
    const search = opts.search?.trim();
    const groupIds = opts.productGroupIds?.filter((id) => Number.isFinite(id) && id > 0);
    const base = {
        page: 1,
        limit: 1,
        search: search || undefined,
        isActive: true,
        productGroupIds: groupIds?.length ? groupIds : undefined,
        categoryId: opts.categoryId,
        categoryIds: opts.categoryIds,
    } as const;

    const entries = await Promise.all(
        SHOP_PRODUCT_FACETS.map(async (facet) => {
            if (selected.has(facet.id)) {
                return [facet.id, true] as const;
            }
            const combined = [...opts.selectedFacetIds, facet.id];
            const result = await getPaginatedProductsFromDB({
                ...base,
                shopFacetIds: combined.length > 0 ? combined : undefined,
            });
            return [facet.id, result.pagination.total > 0] as const;
        }),
    );

    return Object.fromEntries(entries) as Record<string, boolean>;
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

export async function getProductCategoryIds(productId: number): Promise<number[]> {
    if (!Number.isFinite(productId) || productId <= 0) return [];

    const rows = await db
        .select({ categoryId: productCategory.categoryId })
        .from(productCategory)
        .where(eq(productCategory.productId, productId))
        .orderBy(asc(productCategory.displayOrder), asc(productCategory.id));

    return rows.map((row) => row.categoryId);
}

async function setProductCategories(productId: number, categoryIds: number[]) {
    const validIds = [...new Set(categoryIds.filter((id) => Number.isFinite(id) && id > 0))];

    await db.delete(productCategory).where(eq(productCategory.productId, productId));

    if (validIds.length === 0) return;

    for (const categoryId of validIds) {
        const [{ maxOrder }] = await db
            .select({ maxOrder: max(productCategory.displayOrder) })
            .from(productCategory)
            .where(eq(productCategory.categoryId, categoryId));

        await db.insert(productCategory).values({
            productId,
            categoryId,
            displayOrder: Number(maxOrder ?? -1) + 1,
        });
    }
}

export async function getProductById(id: number) {
    const data = await db.query.product.findFirst({
        where: eq(product.id, id),
        with: {
            productImages: {
                with: {
                    vercelImage: true,
                },
                orderBy: asc(productImage.id),
            },
        },
    });

    return productMapper(data);
}

export type ProductOldImageRow = {
    id: number;
    fileName: string;
    isDefault: boolean;
    isActive: boolean;
    order: number;
};

export async function getProductOldImagesForManage(productId: number): Promise<ProductOldImageRow[]> {
    if (!Number.isFinite(productId) || productId <= 0) return [];

    const rows = await db
        .select({
            id: productOldImage.id,
            fileName: productOldImage.fileName,
            isDefault: productOldImage.isDefault,
            isActive: productOldImage.isActive,
            order: productOldImage.order,
        })
        .from(productOldImage)
        .where(and(eq(productOldImage.productId, productId), eq(productOldImage.isActive, true)))
        .orderBy(desc(productOldImage.isDefault), asc(productOldImage.order), asc(productOldImage.id));

    return rows.filter((row) => row.fileName.trim());
}

export type ProductOldImageForEditResult = {
    imageUrl: string | null;
    imageName: string | null;
    error?: string;
};

export async function getProductOldImageForEditTab(productId: number): Promise<ProductOldImageForEditResult> {
    if (!Number.isFinite(productId) || productId <= 0) {
        return { imageUrl: null, imageName: null, error: 'Invalid product id.' };
    }

    const rows = await getProductOldImagesForManage(productId);
    const primary = rows[0];
    if (!primary) {
        return {
            imageUrl: null,
            imageName: null,
            error: 'No productOldImage row found for this product. Run Load Product Old Images on the Sync page first.',
        };
    }

    const fileName = primary.fileName.trim();
    return {
        imageUrl: buildLegacyDynImageUrl(fileName),
        imageName: fileName,
    };
}

export async function removeProductImageById(productImageId: number) {
    if (!Number.isFinite(productImageId) || productImageId <= 0) return;

    await db.delete(productImage).where(eq(productImage.id, productImageId));

    revalidatePath('/manage/products');
    revalidatePath('/shop');
}

export async function setProductPrimaryImage(productId: number, vercelImageId: number) {
    if (!Number.isFinite(productId) || productId <= 0 || !Number.isFinite(vercelImageId) || vercelImageId <= 0) return;

    const [existing] = await db
        .select({ id: productImage.id })
        .from(productImage)
        .where(eq(productImage.productId, productId))
        .orderBy(asc(productImage.id))
        .limit(1);

    if (existing) {
        await db.update(productImage).set({ vercelImageId }).where(eq(productImage.id, existing.id));
    } else {
        await db.insert(productImage).values({ productId, vercelImageId });
    }

    revalidatePath('/manage/products');
    revalidatePath('/shop');
}

export async function updateProductById(data: Product) {
    await db
        .update(product)
        .set({
            name: data.name == null ? null : cleanHtmlEntitySymbols(data.name),
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

function getFormNumber(formData: FormData, key: string, fallback: number): number {
    const raw = formData.get(key);
    if (raw === null || raw === '') return fallback;
    const parsed = Number(raw);
    return Number.isNaN(parsed) ? fallback : parsed;
}

export async function updateProductFromForm(formData: FormData) {
    const id = Number(formData.get('id'));
    if (!id) return;
    const existing = await getProductById(id);
    if (!existing) return;
    const name = (formData.get('name') as string)?.trim() ?? existing.name ?? '';
    const itemNumber = (formData.get('itemNumber') as string)?.trim() ?? existing.itemNumber ?? '';
    const price = getFormNumber(formData, 'price', existing.price);
    const pieces = (formData.get('pieces') as string)?.trim() || '1';
    const weightInOunces = getFormNumber(formData, 'weightInOunces', existing.weightInOunces);
    const shippingBoxFactor = getFormNumber(formData, 'shippingBoxFactor', existing.shippingBoxFactor);
    const description = getFormRichText(formData, 'description', existing.description);
    const download = getFormRichText(formData, 'download', existing.download);
    const ingredients = getFormRichText(formData, 'ingredients', existing.ingredients);
    const nutrition = getFormRichText(formData, 'nutrition', existing.nutrition);
    const isActive = formData.get('isActive') === 'on' || formData.get('isActive') === 'true';
    const updated: Product = {
        ...existing,
        name,
        itemNumber,
        price,
        pieces,
        weightInOunces,
        shippingBoxFactor,
        description,
        download,
        ingredients,
        nutrition,
        isActive,
    };
    await updateProductById(updated);

    const categoryIds = formData
        .getAll('categoryIds')
        .map((value) => Number(value))
        .filter((id) => Number.isFinite(id) && id > 0);
    await setProductCategories(id, categoryIds);

    revalidatePath('/manage/products');
    revalidatePath('/shop');
}

export async function createProduct(data: Product) {
    await db.insert(product).values({
        id: data.id,
        name: data.name == null ? null : cleanHtmlEntitySymbols(data.name),
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
    await db.delete(productCategory).where(eq(productCategory.productId, id));
    await db.delete(productGroupProduct).where(eq(productGroupProduct.productId, id));
    await db.delete(product).where(eq(product.id, id));
}

function readLegacyBoolean(value: unknown, fallback = false): boolean {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'number') {
        return value !== 0;
    }
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true' || normalized === '1') return true;
        if (normalized === 'false' || normalized === '0') return false;
    }
    return fallback;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapLegacyProductRow(o: any) {
    const legacyIsActive = readLegacyBoolean(o.IsActive ?? o.isActive, false);
    const legacyIsRetail = readLegacyBoolean(o.IsRetail ?? o.isRetail, false);
    const legacyIsWholesale = readLegacyBoolean(o.IsWholesale ?? o.isWholesale, false);
    const rawName = o.Name == null ? null : String(o.Name);
    const isActive = !legacyIsRetail && !legacyIsWholesale ? false : legacyIsActive;

    return {
        id: o.Id,
        name: rawName == null ? null : cleanHtmlEntitySymbols(rawName),
        itemNumber: o.ItemNumber,
        description: o.Description,
        nutrition: o.Nutrition,
        ingredients: o.Ingredients,
        download: o.Download,
        price: o.WholesalePrice,
        pieces: o.Pieces,
        weightInOunces: o.Weight,
        isActive,
        shippingBoxFactor: o.ShippingBoxFactor,
        isWholesale: legacyIsWholesale ? 1 : 0,
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function processOldProducts(oldProducts: any[]) {
    try {
        const existingProducts = await db.query.product.findMany({
            orderBy: asc(product.id),
        });

        const rows = oldProducts.map(mapLegacyProductRow);

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
async function linkOldProductImageRows(oldProductImages: any[]): Promise<{ linked: number; skippedExisting: number; missingPaths: string[] }> {
    const vercelImages = await db.query.vercelImage.findMany({
        orderBy: asc(vercelImage.id),
    });

    const existingProductImages = await db.query.productImage.findMany({
        orderBy: asc(productImage.id),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: any[] = oldProductImages.map((o: any) => ({
        id: o.Id,
        productId: o.ProductId,
        path: o.Path,
        isDefault: o.IsDefault,
    }));

    let linked = 0;
    let skippedExisting = 0;
    const missingPaths: string[] = [];

    for (const p of rows) {
        const path = String(p.path ?? '').trim();
        if (!path) continue;

        const matchedVercelImage = vercelImages.find((vi) => vi.imageName.toUpperCase() === path.toUpperCase());
        if (!matchedVercelImage) {
            missingPaths.push(path);
            continue;
        }

        const existingImage = existingProductImages.find((ei) => ei.productId === p.productId && ei.vercelImageId === matchedVercelImage.id);
        if (existingImage) {
            skippedExisting++;
            continue;
        }

        await db.insert(productImage).values({
            productId: p.productId,
            vercelImageId: matchedVercelImage.id,
        });
        existingProductImages.push({ id: 0, productId: p.productId, vercelImageId: matchedVercelImage.id });
        linked++;
    }

    return { linked, skippedExisting, missingPaths };
}

export type ImportOldProductImagesResult = {
    found: number;
    linked: number;
    skippedExisting: number;
    missingPaths: string[];
};

export async function importOldProductImagesForProduct(productId: number): Promise<ImportOldProductImagesResult> {
    if (!Number.isFinite(productId) || productId <= 0) {
        return { found: 0, linked: 0, skippedExisting: 0, missingPaths: [] };
    }

    const { getProductImagesFromSweetshopOldByProductId } = await import('@/lib/db-sweetshop-old');
    const oldProductImages = await getProductImagesFromSweetshopOldByProductId(productId);
    const { linked, skippedExisting, missingPaths } = await linkOldProductImageRows(oldProductImages);

    if (linked > 0) {
        revalidatePath('/manage/products');
        revalidatePath('/shop');
    }

    return {
        found: oldProductImages.length,
        linked,
        skippedExisting,
        missingPaths,
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function processOldProductImages(oldProductImages: any[]) {
    try {
        await linkOldProductImageRows(oldProductImages);
    } catch (error) {
        console.error('Error processing old product images:', error);
        throw new Error('Failed to process old product images');
    }
}
