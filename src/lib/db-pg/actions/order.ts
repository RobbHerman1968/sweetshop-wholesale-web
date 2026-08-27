'use server';

import { db } from '@/lib/db-pg';
import { getAuthenticatedUserId } from '@/lib/auth-session';
import { getOrderExpectedDeliveryDatesFromSweetshopOld } from '@/lib/db-sweetshop-old';
import { and, asc, desc, eq, gte, ilike, isNotNull, lte, or, sql } from 'drizzle-orm';
import { orderMapper } from '../mappers/order-mapper';
import { Order } from '../entities/order-entity';
import { account, order, orderAddress, orderItem, orderLog, user } from '@/lib/drizzle/schema';
import moment from 'moment-timezone';
import { getUserAccounts } from '@/lib/db-pg/actions/account';

export type OrderDailyStat = {
    date: string;
    orderCount: number;
    revenue: number;
    avgOrderValue: number;
};

export type OrderMonthlyStat = {
    year: number;
    month: number;
    monthLabel: string;
    orderCount: number;
    revenue: number;
};

export type OrderYtdComparison = {
    year: number;
    orderCount: number;
    revenue: number;
    avgOrderValue: number;
    throughLabel: string;
};

export type OrderDashboardStats = {
    recentDaily: OrderDailyStat[];
    ytdDaily: OrderDailyStat[];
    monthlyByYear: OrderMonthlyStat[];
    availableYears: number[];
    ytdComparison: OrderYtdComparison[];
};

const CHICAGO = 'America/Chicago';
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
const chicagoDay = sql`("order"."orderDate" AT TIME ZONE 'America/Chicago')::date`;
const chicagoYear = sql`extract(year from ${chicagoDay})::int`;
const chicagoMonth = sql`extract(month from ${chicagoDay})::int`;

function normalizeDate(value: string | Date): string {
    return String(value).slice(0, 10);
}

function fillDailyGaps(rows: Array<{ date: string; orderCount: number; revenue: number }>, days: number): OrderDailyStat[] {
    const byDate = new Map(rows.map((row) => [row.date, row]));
    const start = moment.tz(CHICAGO).subtract(days - 1, 'days').startOf('day');
    const filled: OrderDailyStat[] = [];

    for (let i = 0; i < days; i++) {
        const date = start.clone().add(i, 'days').format('YYYY-MM-DD');
        const existing = byDate.get(date);
        const orderCount = existing?.orderCount ?? 0;
        const revenue = existing?.revenue ?? 0;
        filled.push({
            date,
            orderCount,
            revenue,
            avgOrderValue: orderCount > 0 ? revenue / orderCount : 0,
        });
    }

    return filled;
}

function fillDailyRange(rows: Array<{ date: string; orderCount: number; revenue: number }>, startDate: string, endDate: string): OrderDailyStat[] {
    const byDate = new Map(rows.map((row) => [row.date, row]));
    const start = moment.tz(startDate, CHICAGO).startOf('day');
    const end = moment.tz(endDate, CHICAGO).startOf('day');
    const filled: OrderDailyStat[] = [];

    for (let cursor = start.clone(); cursor.isSameOrBefore(end, 'day'); cursor.add(1, 'day')) {
        const date = cursor.format('YYYY-MM-DD');
        const existing = byDate.get(date);
        const orderCount = existing?.orderCount ?? 0;
        const revenue = existing?.revenue ?? 0;
        filled.push({
            date,
            orderCount,
            revenue,
            avgOrderValue: orderCount > 0 ? revenue / orderCount : 0,
        });
    }

    return filled;
}

async function fetchDailyAggregates(startUtc: string, endUtc: string) {
    return db
        .select({
            date: sql<string>`${chicagoDay}`,
            orderCount: sql<number>`count(*)::int`,
            revenue: sql<number>`coalesce(sum("order"."total"::numeric), 0)::float`,
        })
        .from(order)
        .where(and(isNotNull(order.orderDate), gte(order.orderDate, startUtc), lte(order.orderDate, endUtc)))
        .groupBy(chicagoDay)
        .orderBy(chicagoDay);
}

function ytdEndForYear(year: number, reference: moment.Moment): moment.Moment {
    if (year < reference.year()) {
        return moment
            .tz(CHICAGO)
            .year(year)
            .month(reference.month())
            .date(reference.date())
            .endOf('day');
    }

    if (year === reference.year()) {
        return reference.clone().endOf('day');
    }

    return moment.tz(CHICAGO).year(year).endOf('year');
}

export async function getOrderDailyStats(days = 90): Promise<OrderDailyStat[]> {
    const safeDays = Math.min(Math.max(days, 1), 365);
    const startDate = moment.tz(CHICAGO).subtract(safeDays - 1, 'days').startOf('day').utc().format();
    const endDate = moment.tz(CHICAGO).endOf('day').utc().format();
    const rows = await fetchDailyAggregates(startDate, endDate);

    return fillDailyGaps(
        rows.map((row) => ({
            date: normalizeDate(row.date),
            orderCount: Number(row.orderCount),
            revenue: Number(row.revenue),
        })),
        safeDays,
    );
}

export async function getOrderDashboardStats(): Promise<OrderDashboardStats> {
    const now = moment.tz(CHICAGO);
    const currentYear = now.year();
    const yearStart = now.clone().startOf('year');
    const recentStart = now.clone().subtract(89, 'days').startOf('day');

    const [recentRows, ytdRows, monthlyRows, yearBounds] = await Promise.all([
        fetchDailyAggregates(recentStart.utc().format(), now.clone().endOf('day').utc().format()),
        fetchDailyAggregates(yearStart.utc().format(), now.clone().endOf('day').utc().format()),
        db
            .select({
                year: sql<number>`${chicagoYear}`,
                month: sql<number>`${chicagoMonth}`,
                orderCount: sql<number>`count(*)::int`,
                revenue: sql<number>`coalesce(sum("order"."total"::numeric), 0)::float`,
            })
            .from(order)
            .where(isNotNull(order.orderDate))
            .groupBy(chicagoYear, chicagoMonth)
            .orderBy(chicagoYear, chicagoMonth),
        db
            .select({
                minYear: sql<number>`coalesce(min(${chicagoYear}), ${currentYear})::int`,
                maxYear: sql<number>`coalesce(max(${chicagoYear}), ${currentYear})::int`,
            })
            .from(order)
            .where(isNotNull(order.orderDate)),
    ]);

    const minYear = Number(yearBounds[0]?.minYear ?? currentYear);
    const maxYear = Number(yearBounds[0]?.maxYear ?? currentYear);
    const availableYears = Array.from({ length: maxYear - minYear + 1 }, (_, index) => maxYear - index);

    const monthlyByYear: OrderMonthlyStat[] = monthlyRows.map((row) => ({
        year: Number(row.year),
        month: Number(row.month),
        monthLabel: MONTH_LABELS[Number(row.month) - 1] ?? String(row.month),
        orderCount: Number(row.orderCount),
        revenue: Number(row.revenue),
    }));

    const ytdComparisonRows = await Promise.all(
        availableYears.map(async (year) => {
            const start = moment.tz(CHICAGO).year(year).startOf('year');
            const end = ytdEndForYear(year, now);
            const rows = await fetchDailyAggregates(start.utc().format(), end.utc().format());
            const orderCount = rows.reduce((sum, row) => sum + Number(row.orderCount), 0);
            const revenue = rows.reduce((sum, row) => sum + Number(row.revenue), 0);

            return {
                year,
                orderCount,
                revenue,
                avgOrderValue: orderCount > 0 ? revenue / orderCount : 0,
                throughLabel: year === currentYear ? `Through ${now.format('MMM D')}` : `Through ${end.format('MMM D, YYYY')}`,
            };
        }),
    );
    const ytdComparison = ytdComparisonRows;

    return {
        recentDaily: fillDailyGaps(
            recentRows.map((row) => ({
                date: normalizeDate(row.date),
                orderCount: Number(row.orderCount),
                revenue: Number(row.revenue),
            })),
            90,
        ),
        ytdDaily: fillDailyRange(
            ytdRows.map((row) => ({
                date: normalizeDate(row.date),
                orderCount: Number(row.orderCount),
                revenue: Number(row.revenue),
            })),
            yearStart.format('YYYY-MM-DD'),
            now.format('YYYY-MM-DD'),
        ),
        monthlyByYear,
        availableYears,
        ytdComparison,
    };
}

export async function getOrders() {
    const orders = await db.query.order.findMany({ orderBy: [desc(order.orderDate), desc(order.id)] });
    const out: Order[] = [];
    orders?.map(async (o) => {
        out.push(await orderMapper(o));
    });
    return out;
}

export type ManageOrderUserSummary = {
    id: number;
    userName: string;
    firstName: string | null;
    lastName: string | null;
    accountMateId: string | null;
};

export type ManageOrderAccountSummary = {
    id: number;
    name: string | null;
    accountMateId: string | null;
};

export type ManageOrderDetail = {
    order: typeof order.$inferSelect;
    items: (typeof orderItem.$inferSelect)[];
    addresses: (typeof orderAddress.$inferSelect)[];
    user: ManageOrderUserSummary | null;
    account: ManageOrderAccountSummary | null;
};

async function resolveAccountForManageOrder(
    orderId: number,
    orderUser: ManageOrderUserSummary | null,
): Promise<ManageOrderAccountSummary | null> {
    const [fromLog] = await db
        .select({ accountId: orderLog.accountId })
        .from(orderLog)
        .where(and(eq(orderLog.orderId, orderId), isNotNull(orderLog.accountId)))
        .orderBy(desc(orderLog.id))
        .limit(1);

    if (fromLog?.accountId != null) {
        const [row] = await db
            .select({
                id: account.id,
                name: account.name,
                accountMateId: account.accountMateId,
            })
            .from(account)
            .where(eq(account.id, fromLog.accountId))
            .limit(1);
        if (row) {
            return row;
        }
    }

    const accountMateId = orderUser?.accountMateId?.trim() || null;
    if (accountMateId) {
        const [row] = await db
            .select({
                id: account.id,
                name: account.name,
                accountMateId: account.accountMateId,
            })
            .from(account)
            .where(eq(account.accountMateId, accountMateId))
            .limit(1);
        if (row) {
            return row;
        }
    }

    if (orderUser?.id) {
        const linked = await getUserAccounts(orderUser.id);
        const first = linked[0];
        if (first) {
            return {
                id: first.id,
                name: first.name?.trim() || null,
                accountMateId: first.accountMateId?.trim() || null,
            };
        }
    }

    return null;
}

export async function getOrderByIdForManage(orderId: number): Promise<ManageOrderDetail | null> {
    const row = await db.query.order.findFirst({
        where: eq(order.id, orderId),
    });

    if (!row) {
        return null;
    }

    const [items, addresses, userRows] = await Promise.all([
        db.query.orderItem.findMany({
            where: eq(orderItem.orderId, orderId),
            orderBy: [asc(orderItem.id)],
        }),
        db.query.orderAddress.findMany({
            where: eq(orderAddress.orderId, orderId),
            orderBy: [asc(orderAddress.id)],
        }),
        db
            .select({
                id: user.id,
                userName: user.userName,
                firstName: user.firstName,
                lastName: user.lastName,
                accountMateId: user.accountMateId,
            })
            .from(user)
            .where(eq(user.id, row.userId))
            .limit(1),
    ]);

    const orderUser = userRows[0] ?? null;
    const orderAccount = await resolveAccountForManageOrder(orderId, orderUser);

    return {
        order: row,
        items,
        addresses,
        user: orderUser,
        account: orderAccount,
    };
}

export type ManageOrderListRow = {
    id: number;
    orderNumber: number | null;
    orderDate: string | null;
    userId: number;
    accountMateOrderNumber: number | null;
    total: string;
    shippingCode: string | null;
    isNewCustomerOrder: number;
    customerName: string | null;
};

export type UserOrderListRow = {
    id: number;
    orderNumber: number | null;
    orderDate: string | null;
    accountMateOrderNumber: number | null;
    total: string;
    shippingCode: string | null;
};

export async function getPaginatedOrdersForUser(
    userId: number,
    { page = 1, limit = 50 }: { page?: number; limit?: number } = {},
): Promise<{ data: UserOrderListRow[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> {
    if (!Number.isFinite(userId) || userId <= 0) {
        return { data: [], pagination: { total: 0, page: 1, limit, totalPages: 1 } };
    }

    const offset = (page - 1) * limit;

    const data = await db
        .select({
            id: order.id,
            orderNumber: order.orderNumber,
            orderDate: order.orderDate,
            accountMateOrderNumber: order.accountMateOrderNumber,
            total: order.total,
            shippingCode: order.shippingCode,
        })
        .from(order)
        .where(eq(order.userId, userId))
        .orderBy(desc(order.orderDate), desc(order.id))
        .limit(limit)
        .offset(offset);

    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(order).where(eq(order.userId, userId));
    const total = Number(count ?? 0);

    return {
        data,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.max(1, Math.ceil(total / limit)),
        },
    };
}

export async function getOrderByIdForUser(orderId: number, userId: number): Promise<ManageOrderDetail | null> {
    if (!Number.isFinite(orderId) || orderId <= 0 || !Number.isFinite(userId) || userId <= 0) {
        return null;
    }

    const row = await db.query.order.findFirst({
        where: and(eq(order.id, orderId), eq(order.userId, userId)),
    });

    if (!row) {
        return null;
    }

    const [items, addresses, userRows] = await Promise.all([
        db.query.orderItem.findMany({
            where: eq(orderItem.orderId, orderId),
            orderBy: [asc(orderItem.id)],
        }),
        db.query.orderAddress.findMany({
            where: eq(orderAddress.orderId, orderId),
            orderBy: [asc(orderAddress.id)],
        }),
        db
            .select({
                id: user.id,
                userName: user.userName,
                firstName: user.firstName,
                lastName: user.lastName,
                accountMateId: user.accountMateId,
            })
            .from(user)
            .where(eq(user.id, row.userId))
            .limit(1),
    ]);

    return {
        order: row,
        items,
        addresses,
        user: userRows[0] ?? null,
        account: await resolveAccountForManageOrder(orderId, userRows[0] ?? null),
    };
}

/** Order detail for the signed-in user only (ownership enforced in the query). */
export async function getOrderByIdForAuthenticatedUser(orderId: number): Promise<ManageOrderDetail | null> {
    const userId = await getAuthenticatedUserId();
    if (userId == null) {
        return null;
    }

    return getOrderByIdForUser(orderId, userId);
}

export async function getPaginatedOrdersForAuthenticatedUser(
    { page = 1, limit = 50 }: { page?: number; limit?: number } = {},
): Promise<{ data: UserOrderListRow[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> {
    const userId = await getAuthenticatedUserId();
    if (userId == null) {
        return { data: [], pagination: { total: 0, page: 1, limit, totalPages: 1 } };
    }

    return getPaginatedOrdersForUser(userId, { page, limit });
}

export async function getPaginatedOrdersFromDB({
    page = 1,
    limit = 50,
    dateFrom,
    dateTo,
    accountMateId,
    email,
}: {
    page?: number;
    limit?: number;
    dateFrom?: string;
    dateTo?: string;
    accountMateId?: string;
    email?: string;
}) {
    const offset = (page - 1) * limit;
    const accountMateIdTerm = accountMateId?.trim() ?? '';
    const emailTerm = email?.trim().toLowerCase() ?? '';

    const conditions = [];
    if (dateFrom) {
        conditions.push(gte(order.orderDate, `${dateFrom}T00:00:00.000Z`));
    }
    if (dateTo) {
        conditions.push(lte(order.orderDate, `${dateTo}T23:59:59.999Z`));
    }
    if (accountMateIdTerm) {
        // Prefix / exact match only — leading-wildcard ILIKE + correlated EXISTS was a full scan of ~47k orders.
        const normalized = accountMateIdTerm.toUpperCase();
        conditions.push(
            sql`upper(trim(coalesce(${user.accountMateId}, ''))) like ${`${normalized}%`}`,
        );
    }
    if (emailTerm) {
        conditions.push(
            or(
                ilike(sql`lower(trim(coalesce(${user.userName}, '')))`, `%${emailTerm}%`),
                sql`exists (
                    select 1 from account a
                    where nullif(trim(coalesce(${user.accountMateId}, '')), '') is not null
                      and lower(trim(coalesce(a."accountMateId", ''))) = lower(trim(${user.accountMateId}))
                      and lower(trim(coalesce(a."contactEmail", ''))) like ${`%${emailTerm}%`}
                )`,
                sql`exists (
                    select 1 from "orderAddress" oa
                    where oa."orderId" = ${order.id}
                    and lower(trim(coalesce(oa."emailAddress", ''))) like ${`%${emailTerm}%`}
                )`,
            ),
        );
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    let baseQuery = db
        .select({
            id: order.id,
            orderNumber: order.orderNumber,
            orderDate: order.orderDate,
            userId: order.userId,
            accountMateOrderNumber: order.accountMateOrderNumber,
            total: order.total,
            shippingCode: order.shippingCode,
            isNewCustomerOrder: order.isNewCustomerOrder,
            customerName: sql<string | null>`(
                select case
                    when label is not null and amid is not null then label || ' (' || amid || ')'
                    else coalesce(label, amid)
                end
                from (
                    select
                        coalesce(
                            (
                                select upper(nullif(trim(concat(coalesce(oa."firstName", ''), ' ', coalesce(oa."lastName", ''))), ''))
                                from "orderAddress" oa
                                where oa."orderId" = ${order.id}
                                  and (
                                    lower(trim(oa.type)) = 'b'
                                    or lower(trim(oa.type)) like '%bill%'
                                  )
                                order by oa.id
                                limit 1
                            ),
                            (
                                select nullif(trim(oa."emailAddress"), '')
                                from "orderAddress" oa
                                where oa."orderId" = ${order.id}
                                  and (
                                    lower(trim(oa.type)) = 'b'
                                    or lower(trim(oa.type)) like '%bill%'
                                  )
                                order by oa.id
                                limit 1
                            )
                        ) as label,
                        coalesce(
                            (
                                select upper(nullif(trim(a."accountMateId"), ''))
                                from account a
                                where nullif(trim(coalesce(${user.accountMateId}, '')), '') is not null
                                  and lower(trim(coalesce(a."accountMateId", ''))) = lower(trim(${user.accountMateId}))
                                order by a.id
                                limit 1
                            ),
                            upper(nullif(trim(${user.accountMateId}), ''))
                        ) as amid
                ) customer_parts
            )`,
        })
        .from(order)
        .leftJoin(user, eq(order.userId, user.id))
        .$dynamic();

    baseQuery = baseQuery.orderBy(desc(order.orderDate), desc(order.id)).limit(limit).offset(offset);

    const data = whereClause ? await baseQuery.where(whereClause) : await baseQuery;

    let countQuery = db
        .select({ count: sql<number>`count(distinct ${order.id})` })
        .from(order)
        .leftJoin(user, eq(order.userId, user.id))
        .$dynamic();

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

function oldDriverDateOnlyToUtcIso(d: Date | null | undefined): string | null {
    if (!d || Number.isNaN(new Date(d).getTime())) {
        return null;
    }

    const parsed = new Date(d);
    // Expected delivery is a calendar date — preserve the day in Central time.
    return moment
        .tz([parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()], 'America/Chicago')
        .startOf('day')
        .utc()
        .toISOString();
}

function mapOldOrderExpectedDeliveryDate(expectedDelivery: Date | null | undefined, orderDate: Date | null | undefined): string {
    return oldDriverDateOnlyToUtcIso(expectedDelivery) ?? oldDriverDateToUtcDate(orderDate ?? new Date('1970-01-01')).toISOString();
}

function mapOldExpectedDeliveryOnly(expectedDelivery: Date | null | undefined): string | null {
    return oldDriverDateOnlyToUtcIso(expectedDelivery);
}

const OLD_ORDER_EXPECTED_DELIVERY_KEYS = ['ExpectedDeliveryDate', 'expectedDeliveryDate'] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readOldOrderExpectedDelivery(row: any): Date | null | undefined {
    if (!row || typeof row !== 'object') {
        return null;
    }

    for (const key of OLD_ORDER_EXPECTED_DELIVERY_KEYS) {
        const value = row[key];
        if (value != null) {
            return value as Date;
        }
    }

    return null;
}

export type ExpectedDeliverySyncResult = {
    fetched: number;
    updated: number;
    skipped: number;
};

async function bulkUpdateExpectedDeliveryDates(updates: Array<{ id: number; expectedDeliveryDate: string }>) {
    if (updates.length === 0) {
        return;
    }

    const caseClauses = updates
        .map(({ id, expectedDeliveryDate }) => `WHEN ${Number(id)} THEN '${expectedDeliveryDate.replace(/'/g, "''")}'::timestamptz`)
        .join(' ');
    const idList = updates.map(({ id }) => Number(id)).join(', ');

    await db.execute(
        sql.raw(`
            UPDATE "order"
            SET "expectedDeliveryDate" = CASE id ${caseClauses} END
            WHERE id IN (${idList})
        `),
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateExpectedDeliveryDatesFromOldOrders(rows: any[]): Promise<ExpectedDeliverySyncResult> {
    let updated = 0;
    let skipped = 0;
    const chunkSize = 100;

    for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const updates: Array<{ id: number; expectedDeliveryDate: string }> = [];

        for (const row of chunk) {
            const expectedDeliveryDate = mapOldExpectedDeliveryOnly(readOldOrderExpectedDelivery(row));
            if (!expectedDeliveryDate) {
                skipped += 1;
                continue;
            }
            updates.push({ id: row.Id, expectedDeliveryDate });
        }

        if (updates.length > 0) {
            await bulkUpdateExpectedDeliveryDates(updates);
            updated += updates.length;
        }
    }

    return {
        fetched: rows.length,
        updated,
        skipped,
    };
}

export async function syncExpectedDeliveryDatesFromOldOrders(): Promise<ExpectedDeliverySyncResult> {
    const rows = await getOrderExpectedDeliveryDatesFromSweetshopOld();
    return updateExpectedDeliveryDatesFromOldOrders(rows);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
/** @deprecated Use syncExpectedDeliveryDatesFromOldOrders instead. */
export async function repairImportedOrderExpectedDeliveryDates(rows: any[]) {
    const result = await updateExpectedDeliveryDatesFromOldOrders(rows);
    return result.updated > 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function processOldOrders(orders: any[]) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rows: any[] = orders.map((o: any) => {
            const orderDateIso = oldDriverDateToUtcDate(o.OrderDate).toISOString();
            const promotionCodeRaw = o.PromotionCode != null ? String(o.PromotionCode).trim() : '';
            const promotionCode = promotionCodeRaw !== '' && !Number.isNaN(Number(promotionCodeRaw)) ? promotionCodeRaw : null;
            const promotionDiscountRaw = o.PromotionDiscount != null ? String(o.PromotionDiscount).trim() : '';
            const promotionDiscount = promotionDiscountRaw !== '' && !Number.isNaN(Number(promotionDiscountRaw)) ? promotionDiscountRaw : null;
            const accountMateOrderNum = o.AccountMateOrderNumber != null ? Number(o.AccountMateOrderNumber) : NaN;
            return {
                id: o.Id,
                userId: o.AccountId,
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
                expectedDeliveryDate: mapOldOrderExpectedDeliveryDate(readOldOrderExpectedDelivery(o), o.OrderDate),
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
