import { VercelImage } from './vercel-entity';

export type ProductImage = {
    id: number;
    productId: number;
    vercelImageId: number;

    vercelImage: VercelImage;
};

export type Product = {
    id: number;
    name: string;
    itemNumber: string;
    description: string;
    nutrition: string | undefined;
    ingredients: string | undefined;
    download: string | undefined;
    price: number;
    pieces: string;
    weightInOunces: number;
    isActive: boolean;
    shippingBoxFactor: number;
    isWholesale: boolean;

    productImages: ProductImage[];
};

export type ProductImageNew = {
    id: number;
    productId: number;
    vercelImageId: number;
};
