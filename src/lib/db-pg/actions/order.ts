'use server';

import { db } from '@/lib/db-pg';
import { and, desc, gte, lte, sql } from 'drizzle-orm';
import { orderMapper } from '../mappers/order-mapper';
import { Order } from '../entities/order-entity';
import { order, orderAddress, orderItem } from '@/lib/drizzle/schema';
import moment from 'moment-timezone';

export async function getOrders() {
    const orders = await db.query.order.findMany({ orderBy: [desc(order.orderDate), desc(order.id)] });
    const out: Order[] = [];
    orders?.map(async (o) => {
        out.push(await orderMapper(o));
    });
    return out;
}

export async function getPaginatedOrdersFromDB({ page = 1, limit = 50, dateFrom, dateTo }: { page?: number; limit?: number; dateFrom?: string; dateTo?: string }) {
    const offset = (page - 1) * limit;

    const conditions = [];
    if (dateFrom) {
        conditions.push(gte(order.orderDate, `${dateFrom}T00:00:00.000Z`));
    }
    if (dateTo) {
        conditions.push(lte(order.orderDate, `${dateTo}T23:59:59.999Z`));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const data = await db.query.order.findMany({
        where: whereClause,
        orderBy: [desc(order.orderDate), desc(order.id)],
        limit,
        offset,
    });

    const countQuery = db.select({ count: sql<number>`count(*)` }).from(order);
    const countResult = whereClause ? await countQuery.where(whereClause) : await countQuery;
    const count = Number(countResult[0]?.count ?? 0);

    return {
        data,
        pagination: {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit) || 1,
        },
    };
}

// ONLY USED FOR MIGRATING OLD ORDERS FROM SWEETSHOP TO PG
export async function getMaxOrderId() {
    const maxOrderId = await db
        .select({ max: sql<number>`max(id)` })
        .from(order)
        .execute();
    return maxOrderId[0].max;
}

export async function getMaxOrderItemId() {
    const maxOrderId = await db
        .select({ max: sql<number>`max(id)` })
        .from(orderItem)
        .execute();
    return maxOrderId[0].max;
}

export async function getMaxOrderAddressId() {
    const maxOrderAddressId = await db
        .select({ max: sql<number>`max(id)` })
        .from(orderAddress)
        .execute();
    return maxOrderAddressId[0].max;
}

function oldDriverDateToUtcDate(d: Date): Date {
    // d currently represents what the driver assumed was UTC wall time.
    // Re-interpret that wall time as Chicago, then convert to true UTC instant.
    if (d) {
        return moment
            .tz(
                [
                    d.getUTCFullYear(),
                    d.getUTCMonth(), // 0-based
                    d.getUTCDate(),
                    d.getUTCHours(),
                    d.getUTCMinutes(),
                    d.getUTCSeconds(),
                    d.getUTCMilliseconds(),
                ],
                'America/Chicago',
            )
            .utc()
            .toDate();
    }

    return new Date('1970-01-01');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function processOldOrders(orders: any[]) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rows: any[] = orders.map((o: any) => {
            const orderDateIso = oldDriverDateToUtcDate(o.OrderDate).toISOString();
            const expectedDelivery = oldDriverDateToUtcDate(o.expectedDelivery).toISOString();
            const promotionCodeRaw = o.PromotionCode != null ? String(o.PromotionCode).trim() : '';
            const promotionCode = promotionCodeRaw !== '' && !Number.isNaN(Number(promotionCodeRaw)) ? promotionCodeRaw : null;
            const promotionDiscountRaw = o.PromotionDiscount != null ? String(o.PromotionDiscount).trim() : '';
            const promotionDiscount = promotionDiscountRaw !== '' && !Number.isNaN(Number(promotionDiscountRaw)) ? promotionDiscountRaw : null;
            const accountMateOrderNum = o.AccountMateOrderNumber != null ? Number(o.AccountMateOrderNumber) : NaN;
            return {
                id: o.Id,
                accountId: o.AccountId,
                orderNumber: Number(o.OrderNumber) || null,
                orderDate: orderDateIso,
                subTotal: o.SubTotal?.toString() ?? '0',
                shipping: o.ShippingCost?.toString() ?? '0',
                tax: o.Tax?.toString() ?? '0',
                promotionCode,
                promotionDiscount: promotionDiscount,
                total: o.Total?.toString() ?? '0',
                ccLastFour: o.CreditCardNumber ?? null,
                ccExp: o.CreditCardExpiration ?? null,
                ccType: o.CreditCardType ?? null,
                comment: o.Comment ?? null,
                expectedDeliveryDate: expectedDelivery ?? expectedDelivery ?? '1970-01-01T00:00:00.000Z',
                shippingCode: (o.ShippingCode != null ? String(o.ShippingCode).trim() : '') || '',
                accountMateReturnStatus: o.AccountMateReturnStatus ? o.AccountMateReturnStatus.trim() || null : null,
                accountMateTransactionId: o.AccountMateTransactionId ?? null,
                isNewCustomerOrder: o.IsNewCustomerOrder ? 1 : 0,
                accountMateOrderNumber: Number.isInteger(accountMateOrderNum) ? accountMateOrderNum : null,
            };
        });
        const chunkSize = 1000;
        for (let i = 0; i < rows.length; i += chunkSize) {
            const chunk = rows.slice(i, i + chunkSize);
            await db.insert(order).values(chunk);
        }
        return true;
    } catch (error) {
        console.error('Error processing old orders:', error);
        return false;
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function processOldOrderItems(orderItems: any[]) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rows: any[] = orderItems.map((o: any) => ({
            id: o.Id,
            orderId: o.OrderId,
            itemNumber: o.ItemNumber,
            productId: o.ProductId,
            name: o.Name,
            imagePath: o.Image,
            price: o.Price ? o.Price.toString() : '0',
            promotionPrice: o.PromotionPrice ? o.PromotionPrice.toString() : '0',
            quantity: o.Quantity,
            lineTotal: o.Total ? o.Total.toString() : '0',
            weight: o.Weight,
            variableData: o.VariableData,
            timeStamp: moment.utc(o.TimeStamp).toISOString(),
        }));
        const chunkSize = 1000;
        for (let i = 0; i < rows.length; i += chunkSize) {
            const chunk = rows.slice(i, i + chunkSize);
            await db.insert(orderItem).values(chunk);
        }
        return true;
    } catch (error) {
        console.error('Error processing old order items:', error);
        return false;
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function processOldOrderAddresses(orderAddresses: any[]) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rows: any[] = orderAddresses.map((o: any) => ({
            id: o.Id,
            orderId: o.OrderId,
            type: o.Type,
            firstName: o.FirstName,
            lastName: o.LastName,
            companyName: o.CompanyName,
            emailAddress: o.EmailAddress,
            phoneNumber: o.Phone,
            address1: o.Address1,
            address2: o.Address2,
            city: o.City,
            state: o.State,
            postalCode: o.ZipCode,
            country: o.Country,
        }));
        const chunkSize = 1000;
        for (let i = 0; i < rows.length; i += chunkSize) {
            const chunk = rows.slice(i, i + chunkSize);
            await db.insert(orderAddress).values(chunk);
        }
        return true;
    } catch (error) {
        console.error('Error processing old order items:', error);
        return false;
    }
}
