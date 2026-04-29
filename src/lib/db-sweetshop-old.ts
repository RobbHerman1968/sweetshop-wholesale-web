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
};

async function fetchData(query: string): Promise<any[]> {
    try {
        // Connect to the database
        const pool = await sql.connect(config);

        // Run a query
        const result = await pool.request().query(query);

        // Close the connection
        await pool.close();

        return result.recordset;
    } catch (err) {
        console.error('SQL error', err);
        throw err;
    }
}

export async function getOrdersFromSweetshopOld(maxOrderId: number): Promise<any[]> {
    if (!maxOrderId) {
        maxOrderId = 0;
    }
    try {
        const query = `SELECT top 10000 * FROM [Order] where id > ${maxOrderId}`;
        // const query = 'SELECT top 10000 * FROM [Order] where id > 47816';
        const data = await fetchData(query);

        return data;
    } catch (err) {
        console.error('SQL error', err);
        throw err;
    }
}

export async function getOrderItemsFromSweetshopOld(maxOrderItemId: number): Promise<any[]> {
    if (!maxOrderItemId) {
        maxOrderItemId = 0;
    }
    try {
        const query = `SELECT top 10000 * FROM OrderItem where id > ${maxOrderItemId}`;
        const data = await fetchData(query);

        return data;
    } catch (err) {
        console.error('SQL error', err);
        throw err;
    }
}

export async function getOrderAddressesFromSweetshopOld(maxOrderAddressId: number): Promise<any[]> {
    if (!maxOrderAddressId) {
        maxOrderAddressId = 0;
    }
    try {
        const query = `SELECT top 10000 * FROM OrderAddress where id > ${maxOrderAddressId}`;
        const data = await fetchData(query);

        return data;
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
