import { neon } from '@neondatabase/serverless';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from '@/lib/drizzle/schema';
import * as relations from '@/lib/drizzle/relations';

type AppDatabase = NeonHttpDatabase<typeof schema & typeof relations>;

let dbInstance: AppDatabase | undefined;

function getDb(): AppDatabase {
    if (dbInstance) {
        return dbInstance;
    }

    const connectionString = process.env.POSTGRES_URL;
    if (!connectionString) {
        throw new Error(
            'POSTGRES_URL is not set. Add it to .env.local, e.g. POSTGRES_URL="postgres://user:pass@host/db"',
        );
    }

    const sql = neon(connectionString);
    dbInstance = drizzle(sql, {
        schema: { ...schema, ...relations },
        logger: false,
    });

    return dbInstance;
}

export const db = new Proxy({} as AppDatabase, {
    get(_target, prop, receiver) {
        return Reflect.get(getDb(), prop, receiver);
    },
});
