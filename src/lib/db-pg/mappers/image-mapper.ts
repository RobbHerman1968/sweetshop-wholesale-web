/* eslint-disable @typescript-eslint/no-explicit-any */
'use server';

import { XrefImage } from '../entities/xrefImage-entity';
import { VercelImage } from '../server';

export async function xrefImageMapper(data: any) {
    const image: XrefImage = {} as XrefImage;
    image.id = data.id;
    image.productId = data.productId;
    image.imageName = data.imageName;

    return image;
}

export async function vercelImageMapper(data: any) {
    const image: VercelImage = {} as VercelImage;
    image.id = data.id;
    image.name = data.name;
    image.imageName = data.imageName;
    image.path = data.path;

    return image;
}
