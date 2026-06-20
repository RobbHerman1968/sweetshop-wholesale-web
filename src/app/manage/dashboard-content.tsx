'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { getOrderAddressesFromSweetshopOld, getOrderItemsFromSweetshopOld, getOrdersFromSweetshopOld, getProductImagesFromSweetshopOld, getProductsFromSweetshopOld } from '@/lib/db-sweetshop-old';
import { getMaxOrderId, getMaxOrderItemId, processOldOrders, processOldOrderItems, getMaxOrderAddressId, processOldOrderAddresses, processOldProducts, processOldProductImages, syncAccountsFromLegacy, syncExpectedDeliveryDatesFromOldOrders, syncUsersFromLegacy, createDefaultUser } from '@/lib/db-pg/server';
import type { OrderDashboardStats } from '@/lib/db-pg/actions/order';
import { DashboardOrdersCharts } from './dashboard-orders-charts';

type DashboardContentProps = {
    orderStats: OrderDashboardStats;
};

export function DashboardContent({ orderStats }: DashboardContentProps) {
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
            <h1 className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#7c5b44]">Dashboard</h1>
            <DashboardOrdersCharts stats={orderStats} />
            <div className="flex flex-wrap gap-2 mb-2">
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
            {statusMessage ? <p className="mb-2 text-xs text-[#6e4a34]">{statusMessage}</p> : null}
            <div className="flex flex-wrap gap-2 mb-2">
                <Button type="button" onClick={handleSyncUsers} disabled={loading}>
                    {loading ? 'Syncing…' : 'Sync Users'}
                </Button>
                <Button type="button" onClick={handleCreateDefaultUser} disabled={loading}>
                    {loading ? 'Working…' : 'Create Default Admin'}
                </Button>
                <Button type="button" onClick={handleSyncAccounts} disabled={loading}>
                    {loading ? 'Syncing…' : 'Sync Accounts'}
                </Button>
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
