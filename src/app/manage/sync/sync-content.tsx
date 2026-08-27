'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { getOrderAddressesFromSweetshopOld, getOrderItemsFromSweetshopOld, getOrdersFromSweetshopOld, getProductImagesFromSweetshopOld, getProductsFromSweetshopOld } from '@/lib/db-sweetshop-old';
import { syncAccountsFromLegacy } from '@/lib/db-pg/actions/account';
import {
    getMaxOrderAddressId,
    getMaxOrderId,
    getMaxOrderItemId,
    processOldOrderAddresses,
    processOldOrderItems,
    processOldOrders,
    syncExpectedDeliveryDatesFromOldOrders,
} from '@/lib/db-pg/actions/order';
import { loadProductOldImagesFromLegacy } from '@/lib/db-pg/actions/process-product-old-images';
import { syncProductCategoriesFromLegacy } from '@/lib/db-pg/actions/process-product-categories';
import { cleanProductNamesInDatabase } from '@/lib/db-pg/actions/process-product-names';
import { syncUserAddressesFromLegacy } from '@/lib/db-pg/actions/process-user-addresses';
import { createDefaultUser, syncUsersFromLegacy } from '@/lib/db-pg/actions/process-users';
import { processOldProductImages, processOldProducts } from '@/lib/db-pg/actions/product';

export function SyncContent() {
    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    async function handleGetOrders() {
        setLoading(true);
        setStatusMessage(null);
        try {
            const maxOrderId = await getMaxOrderId();
            console.log(maxOrderId);
            const orders = await getOrdersFromSweetshopOld(maxOrderId);
            console.log(orders.length);
            const processedOrders = await processOldOrders(orders);
            console.log(processedOrders);
            setStatusMessage(`Fetched ${orders.length} orders from legacy DB.`);
        } finally {
            setLoading(false);
        }
    }

    async function handleGetOrderItems() {
        setLoading(true);
        setStatusMessage(null);
        try {
            const maxOrderItemId = await getMaxOrderItemId();
            console.log('Max Order Item ID', maxOrderItemId);
            const orderItems = await getOrderItemsFromSweetshopOld(maxOrderItemId);
            console.log('Order Items', orderItems.length);
            const processedOrderItems = await processOldOrderItems(orderItems);
            console.log('Processed Order Items', processedOrderItems);
            setStatusMessage(`Fetched ${orderItems.length} order items from legacy DB.`);
        } finally {
            setLoading(false);
        }
    }

    async function handleGetOrderAddresses() {
        setLoading(true);
        setStatusMessage(null);
        try {
            const maxOrderAddressId = await getMaxOrderAddressId();
            console.log('Max Order Address ID', maxOrderAddressId);
            const orderAddresses = await getOrderAddressesFromSweetshopOld(maxOrderAddressId);
            console.log('Order Addresses', orderAddresses.length);
            const processedOrderAddresses = await processOldOrderAddresses(orderAddresses);
            console.log('Processed Order Addresses', processedOrderAddresses);
            setStatusMessage(`Fetched ${orderAddresses.length} order addresses from legacy DB.`);
        } finally {
            setLoading(false);
        }
    }

    async function handleSyncExpectedDeliveryDates() {
        setLoading(true);
        setStatusMessage(null);
        try {
            const result = await syncExpectedDeliveryDatesFromOldOrders();
            console.log('Synced expected delivery dates', result);
            setStatusMessage(`Fetched ${result.fetched} rows from old DB. Updated ${result.updated} orders${result.skipped ? `, skipped ${result.skipped}` : ''}.`);
        } catch (error) {
            console.error('Failed to sync expected delivery dates', error);
            setStatusMessage('Failed to sync expected delivery dates. Check the console for details.');
        } finally {
            setLoading(false);
        }
    }

    async function handleGetProducts() {
        setLoading(true);
        setStatusMessage(null);
        try {
            const products = await getProductsFromSweetshopOld();
            console.log('Products', products.length);
            const processedProducts = await processOldProducts(products);
            console.log('Processed Products', processedProducts);
            setStatusMessage(`Fetched ${products.length} products from legacy DB.`);
        } finally {
            setLoading(false);
        }
    }

    async function handleGetProductImages() {
        setLoading(true);
        setStatusMessage(null);
        try {
            const productImages = await getProductImagesFromSweetshopOld();
            console.log('Product Images', productImages.length);
            const processedProductImages = await processOldProductImages(productImages);
            console.log('Processed Product Images', processedProductImages);
            setStatusMessage(`Fetched ${productImages.length} product images from legacy DB.`);
        } finally {
            setLoading(false);
        }
    }

    async function handleSyncUsers() {
        setLoading(true);
        setStatusMessage(null);
        try {
            const result = await syncUsersFromLegacy();
            console.log('Synced users from legacy', result);
            setStatusMessage(
                `Fetched ${result.fetched} legacy Account rows. Inserted ${result.inserted}, updated ${result.updated}${result.skipped ? `, skipped ${result.skipped}` : ''}.`,
            );
        } catch (error) {
            console.error('Failed to sync users', error);
            const message = error instanceof Error ? error.message : 'Failed to sync users from legacy Account.';
            setStatusMessage(message);
        } finally {
            setLoading(false);
        }
    }

    async function handleSyncAccounts() {
        setLoading(true);
        setStatusMessage(null);
        try {
            const result = await syncAccountsFromLegacy();
            console.log('Synced accounts from legacy', result);
            setStatusMessage(
                `Fetched ${result.fetched} legacy accountOld rows. Inserted ${result.inserted}, updated ${result.updated}${result.skipped ? `, skipped ${result.skipped}` : ''}.`,
            );
        } catch (error) {
            console.error('Failed to sync accounts', error);
            const message = error instanceof Error ? error.message : 'Failed to sync accounts from legacy AccountOld.';
            setStatusMessage(message);
        } finally {
            setLoading(false);
        }
    }

    async function handleSyncUserAddresses() {
        setLoading(true);
        setStatusMessage(null);
        try {
            const result = await syncUserAddressesFromLegacy();
            console.log('Synced user addresses from legacy', result);
            setStatusMessage(
                `Fetched ${result.fetched} legacy AccountAddress rows. Inserted ${result.inserted}, updated ${result.updated}${result.skipped ? `, skipped ${result.skipped}` : ''}.`,
            );
        } catch (error) {
            console.error('Failed to sync user addresses', error);
            const message = error instanceof Error ? error.message : 'Failed to sync user addresses from legacy AccountAddress.';
            setStatusMessage(message);
        } finally {
            setLoading(false);
        }
    }

    async function handleLoadProductOldImages() {
        setLoading(true);
        setStatusMessage(null);
        try {
            const result = await loadProductOldImagesFromLegacy();
            console.log('Loaded product old images from legacy', result);
            setStatusMessage(
                `Fetched ${result.fetched} legacy ProductImage rows. Inserted ${result.inserted}, updated ${result.updated}${result.skipped ? `, skipped ${result.skipped}` : ''}.`,
            );
        } catch (error) {
            console.error('Failed to load product old images', error);
            const message = error instanceof Error ? error.message : 'Failed to load product old images from legacy ProductImage.';
            setStatusMessage(message);
        } finally {
            setLoading(false);
        }
    }

    async function handleSyncProductCategories() {
        setLoading(true);
        setStatusMessage(null);
        try {
            const result = await syncProductCategoriesFromLegacy();
            console.log('Synced product categories from legacy', result);
            setStatusMessage(
                `Categories: fetched ${result.categoriesFetched}, inserted ${result.categoriesInserted}, updated ${result.categoriesUpdated}${result.categoriesSkipped ? `, skipped ${result.categoriesSkipped}` : ''}. Links: fetched ${result.linksFetched}, inserted ${result.linksInserted}, updated ${result.linksUpdated}${result.linksSkipped ? `, skipped ${result.linksSkipped}` : ''}${result.linksRemoved ? `, removed ${result.linksRemoved}` : ''}.`,
            );
        } catch (error) {
            console.error('Failed to sync product categories', error);
            const message = error instanceof Error ? error.message : 'Failed to sync product categories from legacy.';
            setStatusMessage(message);
        } finally {
            setLoading(false);
        }
    }

    async function handleCleanProductNames() {
        setLoading(true);
        setStatusMessage(null);
        try {
            const result = await cleanProductNamesInDatabase();
            console.log('Cleaned product names', result);
            setStatusMessage(`Scanned ${result.scanned} products. Updated ${result.updated}, unchanged ${result.unchanged}.`);
        } catch (error) {
            console.error('Failed to clean product names', error);
            const message = error instanceof Error ? error.message : 'Failed to clean product names.';
            setStatusMessage(message);
        } finally {
            setLoading(false);
        }
    }

    async function handleCreateDefaultUser() {
        setLoading(true);
        setStatusMessage(null);
        try {
            const result = await createDefaultUser();
            setStatusMessage(`Default admin user ${result.action} (id ${result.id}).`);
        } catch (error) {
            console.error('Failed to create default user', error);
            const message = error instanceof Error ? error.message : 'Failed to create default admin user.';
            setStatusMessage(message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="mx-auto max-w-7xl h-full min-h-full">
            <h1 className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#7c5b44]">Sync</h1>
            <p className="mt-2 mb-4 text-xs text-[#6e4a34]">Import and sync data from the legacy Sweetshop database. Available on localhost only.</p>

            <section className="mb-6">
                <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Orders</h2>
                <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={handleGetOrders} disabled={loading}>
                        {loading ? 'Loading…' : 'Get Orders'}
                    </Button>
                    <Button type="button" onClick={handleGetOrderItems} disabled={loading}>
                        {loading ? 'Loading…' : 'Get Order Items'}
                    </Button>
                    <Button type="button" onClick={handleGetOrderAddresses} disabled={loading}>
                        {loading ? 'Loading…' : 'Get Order Addresses'}
                    </Button>
                    <Button type="button" onClick={handleSyncExpectedDeliveryDates} disabled={loading}>
                        {loading ? 'Syncing…' : 'Sync Expected Delivery Dates'}
                    </Button>
                </div>
            </section>

            <section className="mb-6">
                <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Users &amp; Accounts</h2>
                <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={handleSyncUsers} disabled={loading}>
                        {loading ? 'Syncing…' : 'Sync Users'}
                    </Button>
                    <Button type="button" onClick={handleCreateDefaultUser} disabled={loading}>
                        {loading ? 'Working…' : 'Create Default Admin'}
                    </Button>
                    <Button type="button" onClick={handleSyncAccounts} disabled={loading}>
                        {loading ? 'Syncing…' : 'Sync Accounts'}
                    </Button>
                    <Button type="button" onClick={handleSyncUserAddresses} disabled={loading}>
                        {loading ? 'Syncing…' : 'Sync User Addresses'}
                    </Button>
                </div>
            </section>

            <section className="mb-6">
                <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e4a34]">Products</h2>
                <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={handleGetProducts} disabled={loading}>
                        {loading ? 'Loading…' : 'Get Products'}
                    </Button>
                    <Button type="button" onClick={handleGetProductImages} disabled={loading}>
                        {loading ? 'Loading…' : 'Get Product Images'}
                    </Button>
                    <Button type="button" onClick={handleLoadProductOldImages} disabled={loading}>
                        {loading ? 'Loading…' : 'Load Product Old Images'}
                    </Button>
                    <Button type="button" onClick={handleSyncProductCategories} disabled={loading}>
                        {loading ? 'Syncing…' : 'Sync Product Categories'}
                    </Button>
                    <Button type="button" onClick={handleCleanProductNames} disabled={loading}>
                        {loading ? 'Cleaning…' : 'Clean Product Names'}
                    </Button>
                </div>
            </section>

            {statusMessage ? <p className="text-xs text-[#6e4a34]">{statusMessage}</p> : null}
        </div>
    );
}
