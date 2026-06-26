import { neon } from '@neondatabase/serverless';

function cleanHtmlEntitySymbols(value) {
    return value
        .replaceAll('&trade;', '™')
        .replaceAll('&reg;', '®')
        .replaceAll('&copy;', '©');
}

const connectionString = process.env.POSTGRES_URL;
if (!connectionString) {
    console.error('POSTGRES_URL is not set');
    process.exit(1);
}

const sql = neon(connectionString);

const rows = await sql`SELECT id, name FROM product WHERE name IS NOT NULL AND (name LIKE '%&trade;%' OR name LIKE '%&reg;%' OR name LIKE '%&copy;%')`;

let updated = 0;
for (const row of rows) {
    const cleanedName = cleanHtmlEntitySymbols(row.name);
    if (cleanedName === row.name) continue;
    await sql`UPDATE product SET name = ${cleanedName} WHERE id = ${row.id}`;
    console.log(`Updated product ${row.id}: ${row.name} -> ${cleanedName}`);
    updated += 1;
}

console.log(`Done. ${updated} updated out of ${rows.length} matching rows.`);
