import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '@/lib/drizzle/schema';
import * as relations from '@/lib/drizzle/relations';

const connectionString = process.env.POSTGRES_URL;
if (!connectionString) {
  throw new Error(
    'POSTGRES_URL is not set. Add it to .env.local, e.g. POSTGRES_URL="postgres://user:pass@host/db"'
  );
}
const sql = neon(connectionString);
export const db = drizzle(sql, {
    schema: { ...schema, ...relations },
    logger: false,
});
