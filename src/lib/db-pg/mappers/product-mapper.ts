/* eslint-disable @typescript-eslint/no-explicit-any */
'use server';

import { Product, ProductImage } from '../entities/product-entity';
import { vercelImageMapper } from '../mappers/image-mapper';

export async function productMapper(data: any) {
    const product: Product = {} as Product;
    product.id = data.id;
    product.name = data.name;
    product.itemNumber = data.itemNumber;
    product.description = data.description;
    product.nutrition = data.nutrition;
    product.ingredients = data.ingredients;
    product.download = data.download;
    product.price = data.price;
    product.pieces = data.pieces;
    product.weightInOunces = data.weightInOunces;
    product.isActive = data.isActive;
    product.shippingBoxFactor = data.shippingBoxFactor;
    product.productImages = [];

    if (data.productImages) {
        product.productImages = await Promise.all(data.productImages.map((pi: any) => productImageMapper(pi)));
    }
    return product;
}

export async function productImageMapper(data: any) {
    const productImage = {} as ProductImage;
    productImage.id = data.id;
    productImage.productId = data.productId;
    productImage.vercelImageId = data.vercelImageId;

    console.log(data);

    if (data.vercelImage) {
        productImage.vercelImage = await vercelImageMapper(data.vercelImage);
    }

    return productImage;
}
