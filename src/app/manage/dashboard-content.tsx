'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { getOrderAddressesFromSweetshopOld, getOrderItemsFromSweetshopOld, getOrdersFromSweetshopOld, getProductImagesFromSweetshopOld, getProductsFromSweetshopOld } from '@/lib/db-sweetshop-old';
import { getMaxOrderId, getMaxOrderItemId, processOldOrders, processOldOrderItems, getMaxOrderAddressId, processOldOrderAddresses, processOldProducts, processOldProductImages } from '@/lib/db-pg/server';

export function DashboardContent() {
    const [loading, setLoading] = useState(false);

    async function handleGetOrders() {
        setLoading(true);
        try {
            const maxOrderId = await getMaxOrderId();
            console.log(maxOrderId);
            const orders = await getOrdersFromSweetshopOld(maxOrderId);
            console.log(orders.length);
            const processedOrders = await processOldOrders(orders);
            console.log(processedOrders);
        } finally {
            setLoading(false);
        }
    }

    async function handleGetOrderItems() {
        setLoading(true);
        try {
            const maxOrderItemId = await getMaxOrderItemId();
            console.log('Max Order Item ID', maxOrderItemId);
            const orderItems = await getOrderItemsFromSweetshopOld(maxOrderItemId);
            console.log('Order Items', orderItems.length);
            const processedOrderItems = await processOldOrderItems(orderItems);
            console.log('Processed Order Items', processedOrderItems);
        } finally {
            setLoading(false);
        }
    }

    async function handleGetOrderAddresses() {
        setLoading(true);
        try {
            const maxOrderAddressId = await getMaxOrderAddressId();
            console.log('Max Order Address ID', maxOrderAddressId);
            const orderAddresses = await getOrderAddressesFromSweetshopOld(maxOrderAddressId);
            console.log('Order Addresses', orderAddresses.length);
            const processedOrderAddresses = await processOldOrderAddresses(orderAddresses);
            console.log('Processed Order Addresses', processedOrderAddresses);
        } finally {
            setLoading(false);
        }
    }

    async function handleGetProducts() {
        setLoading(true);
        try {
            const products = await getProductsFromSweetshopOld();
            console.log('Products', products.length);
            const processedProducts = await processOldProducts(products);
            console.log('Processed Products', processedProducts);
        } finally {
            setLoading(false);
        }
    }

    async function handleGetProductImages() {
        setLoading(true);
        try {
            const productImages = await getProductImagesFromSweetshopOld();
            console.log('Product Images', productImages.length);
            const processedProductImages = await processOldProductImages(productImages);
            console.log('Processed Product Images', processedProductImages);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="mx-auto max-w-7xl h-full min-h-full">
            <h1 className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#7c5b44]">Dashboard</h1>
            <div className="flex gap-2 mb-2">
                <Button type="button" onClick={handleGetOrders} disabled={loading}>
                    {loading ? 'Loading…' : 'Get Orders'}
                </Button>

                <Button type="button" onClick={handleGetOrderItems} disabled={loading}>
                    {loading ? 'Loading…' : 'Get Order Items'}
                </Button>

                <Button type="button" onClick={handleGetOrderAddresses} disabled={loading}>
                    {loading ? 'Loading…' : 'Get Order Addresses'}
                </Button>
            </div>
            <div className="flex gap-2 mb-2">
                <Button type="button" onClick={handleGetProducts} disabled={loading}>
                    {loading ? 'Loading…' : 'Get Products'}
                </Button>
                <Button type="button" onClick={handleGetProductImages} disabled={loading}>
                    {loading ? 'Loading…' : 'Get Product Images'}
                </Button>
            </div>
        </div>
    );
}
