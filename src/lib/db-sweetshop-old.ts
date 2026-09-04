/* eslint-disable @typescript-eslint/no-explicit-any */
'use server';

import * as sql from 'mssql';

// 162.214.102.127:1433;database=HLuker_sweetshop;user=HLuker_Herman1;password=The1AndOnly1_123;trustServerCertificate=true;encrypt=true"
const config: sql.config = {
    user: 'HLuker_Herman1',
    password: 'The1AndOnly1_123',
    server: '162.214.102.127', // e.g., 'localhost' or 'my.database.windows.net'
    database: 'HLuker_sweetshop',
    options: {
        trustedConnection: false, // optional, default is false
        trustServerCertificate: true, // change to true for local dev / self-signed certs
    },
    port: 1433, // optional, default is 1433
    pool: {
        max: 5,
        min: 0,
        idleTimeoutMillis: 30_000,
    },
};

let poolPromise: Promise<sql.ConnectionPool> | null = null;

async function getLegacyPool(): Promise<sql.ConnectionPool> {
    if (!poolPromise) {
        poolPromise = new sql.ConnectionPool(config)
            .connect()
            .then((pool) => {
                pool.on('error', (err) => {
                    console.error('[db-sweetshop-old] pool error', err);
                    poolPromise = null;
                });
                return pool;
            })
            .catch((err) => {
                poolPromise = null;
                throw err;
            });
    }

    return poolPromise;
}

async function fetchData(query: string): Promise<any[]> {
    try {
        const pool = await getLegacyPool();
        const result = await pool.request().query(query);
        return result.recordset;
    } catch (err) {
        console.error('SQL error', err);
        throw err;
    }
}

/** Legacy order ids stay below the new-site floor (50000). */
const LEGACY_ORDER_ID_CEILING = 50000;

export async function getOrdersFromSweetshopOld(maxOrderId: number): Promise<any[]> {
    let maxId = Number(maxOrderId) || 0;
    try {
        const batchSize = 10000;
        const allRows: any[] = [];

        while (true) {
            const query = `SELECT TOP ${batchSize} * FROM [Order] WHERE Id > ${maxId} AND Id < ${LEGACY_ORDER_ID_CEILING} ORDER BY Id`;
            const batch = await fetchData(query);
            if (!batch.length) {
                break;
            }

            allRows.push(...batch);
            maxId = Number(batch[batch.length - 1].Id ?? batch[batch.length - 1].id ?? maxId);

            if (batch.length < batchSize) {
                break;
            }
        }

        return allRows;
    } catch (err) {
        console.error('SQL error', err);
        throw err;
    }
}

export async function getOrderExpectedDeliveryDatesFromSweetshopOld(): Promise<any[]> {
    try {
        const batchSize = 10000;
        const allRows: any[] = [];
        let maxId = 0;

        while (true) {
            const query = `SELECT TOP ${batchSize} Id, ExpectedDeliveryDate FROM [Order] WHERE Id > ${maxId} AND ExpectedDeliveryDate IS NOT NULL ORDER BY Id`;
            const batch = await fetchData(query);
            if (!batch.length) {
                break;
            }

            allRows.push(...batch);
            maxId = batch[batch.length - 1].Id;

            if (batch.length < batchSize) {
                break;
            }
        }

        return allRows;
    } catch (err) {
        console.error('SQL error', err);
        throw err;
    }
}

export async function getAccountsFromSweetshopOld(): Promise<any[]> {
    try {
        const batchSize = 10000;
        const allRows: any[] = [];
        let maxId = 0;

        while (true) {
            const query = `SELECT TOP ${batchSize} * FROM [Account] WHERE Id > ${maxId} ORDER BY Id`;
            const batch = await fetchData(query);
            if (!batch.length) {
                break;
            }

            allRows.push(...batch);
            const lastRow = batch[batch.length - 1];
            maxId = Number(lastRow.Id ?? lastRow.id ?? maxId);
            console.log(`User sync: fetched ${allRows.length} legacy Account rows so far (last Id ${maxId})`);

            if (batch.length < batchSize) {
                break;
            }
        }

        return allRows;
    } catch (err) {
        console.error('SQL error', err);
        throw err;
    }
}

export async function getAccountOldFromSweetshopOld(): Promise<any[]> {
    try {
        const batchSize = 10000;
        const allRows: any[] = [];
        let maxId = 0;

        while (true) {
            const query = `SELECT TOP ${batchSize} * FROM [AccountOld] WHERE Id > ${maxId} ORDER BY Id`;
            const batch = await fetchData(query);
            if (!batch.length) {
                break;
            }

            allRows.push(...batch);
            const lastRow = batch[batch.length - 1];
            maxId = Number(lastRow.Id ?? lastRow.id ?? maxId);
            console.log(`Account sync: fetched ${allRows.length} legacy AccountOld rows so far (last Id ${maxId})`);

            if (batch.length < batchSize) {
                break;
            }
        }

        return allRows;
    } catch (err) {
        console.error('SQL error', err);
        throw err;
    }
}

export async function getOrderItemsFromSweetshopOld(maxOrderItemId: number): Promise<any[]> {
    let maxId = Number(maxOrderItemId) || 0;
    try {
        const batchSize = 10000;
        const allRows: any[] = [];

        while (true) {
            // Only items for legacy orders (OrderId below the new-site order id floor).
            const query = `SELECT TOP ${batchSize} * FROM OrderItem WHERE Id > ${maxId} AND OrderId < ${LEGACY_ORDER_ID_CEILING} ORDER BY Id`;
            const batch = await fetchData(query);
            if (!batch.length) {
                break;
            }

            allRows.push(...batch);
            maxId = Number(batch[batch.length - 1].Id ?? batch[batch.length - 1].id ?? maxId);

            if (batch.length < batchSize) {
                break;
            }
        }

        return allRows;
    } catch (err) {
        console.error('SQL error', err);
        throw err;
    }
}

export async function getOrderAddressesFromSweetshopOld(maxOrderAddressId: number): Promise<any[]> {
    let maxId = Number(maxOrderAddressId) || 0;
    try {
        const batchSize = 10000;
        const allRows: any[] = [];

        while (true) {
            // Only addresses for legacy orders (OrderId below the new-site order id floor).
            const query = `SELECT TOP ${batchSize} * FROM OrderAddress WHERE Id > ${maxId} AND OrderId < ${LEGACY_ORDER_ID_CEILING} ORDER BY Id`;
            const batch = await fetchData(query);
            if (!batch.length) {
                break;
            }

            allRows.push(...batch);
            maxId = Number(batch[batch.length - 1].Id ?? batch[batch.length - 1].id ?? maxId);

            if (batch.length < batchSize) {
                break;
            }
        }

        return allRows;
    } catch (err) {
        console.error('SQL error', err);
        throw err;
    }
}

export async function getAccountAddressesFromSweetshopOld(minId = 0): Promise<any[]> {
    try {
        const batchSize = 10000;
        const allRows: any[] = [];
        let maxId = minId;

        while (true) {
            const query = `SELECT TOP ${batchSize} * FROM AccountAddress WHERE Id > ${maxId} ORDER BY Id`;
            const batch = await fetchData(query);
            if (!batch.length) {
                break;
            }

            allRows.push(...batch);
            const lastRow = batch[batch.length - 1];
            maxId = Number(lastRow.Id ?? lastRow.id ?? maxId);
            console.log(`User address sync: fetched ${allRows.length} legacy AccountAddress rows so far (last Id ${maxId})`);

            if (batch.length < batchSize) {
                break;
            }
        }

        return allRows;
    } catch (err) {
        console.error('SQL error', err);
        throw err;
    }
}

export async function getProductsFromSweetshopOld(): Promise<any[]> {
    try {
        const query = 'SELECT * FROM Product';
        const data = await fetchData(query);
        return data;
    } catch (err) {
        console.error('SQL error', err);
        throw err;
    }
}

export async function getCategoriesFromSweetshopOld(): Promise<any[]> {
    try {
        const query = 'SELECT * FROM Category ORDER BY Id';
        const data = await fetchData(query);
        return data;
    } catch (err) {
        console.error('SQL error', err);
        throw err;
    }
}

export async function getCategoryProductsFromSweetshopOld(): Promise<any[]> {
    try {
        const batchSize = 10000;
        const allRows: any[] = [];
        let maxId = 0;

        while (true) {
            const query = `SELECT TOP ${batchSize} * FROM CategoryProduct WHERE Id > ${maxId} ORDER BY Id`;
            const batch = await fetchData(query);
            if (!batch.length) {
                break;
            }

            allRows.push(...batch);
            const lastRow = batch[batch.length - 1];
            maxId = Number(lastRow.Id ?? lastRow.id ?? maxId);
            console.log(`Product category sync: fetched ${allRows.length} legacy CategoryProduct rows so far (last Id ${maxId})`);

            if (batch.length < batchSize) {
                break;
            }
        }

        return allRows;
    } catch (err) {
        console.error('SQL error', err);
        throw err;
    }
}

export async function getProductImagesFromSweetshopOld(): Promise<any[]> {
    try {
        const query = 'SELECT * FROM ProductImage';
        const data = await fetchData(query);
        return data;
    } catch (err) {
        console.error('SQL error', err);
        throw err;
    }
}

export async function getProductImagesFromSweetshopOldByProductId(productId: number): Promise<any[]> {
    if (!Number.isFinite(productId) || productId <= 0) return [];

    try {
        const pool = await getLegacyPool();
        const result = await pool
            .request()
            .input('productId', sql.Int, productId)
            .query('SELECT * FROM ProductImage WHERE ProductId = @productId ORDER BY Id');
        return result.recordset;
    } catch (err) {
        console.error('SQL error', err);
        throw err;
    }
}

// ACCOUNT MATE
export async function getInvoiceHeaders(accountMateId: string): Promise<any[]> {
    try {
        const query = "SELECT * FROM arinvc WHERE ccustno = '" + accountMateId + "'";
        console.log('SQL query', query);
        const data = await fetchData(query);
        return data;
    } catch (err) {
        console.error('SQL error', err);
        throw err;
    }
}

export async function getInvoiceDetails(accountMateId: string): Promise<any[]> {
    try {
        const query = "SELECT * FROM aritrs where ccustno = '" + accountMateId + "'";
        const data = await fetchData(query);
        return data;
    } catch (err) {
        console.error('SQL error', err);
        throw err;
    }
}
