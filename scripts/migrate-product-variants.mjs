import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const ensureColumn = async (tableName, columnName, definition, addedColumns) => {
  const tableInfo = await client.execute(`PRAGMA table_info(${tableName})`);
  const existingColumns = new Set(tableInfo.rows.map((row) => String(row.name)));

  if (!existingColumns.has(columnName)) {
    await client.execute(`ALTER TABLE ${tableName} ADD COLUMN ${definition}`);
    addedColumns.push(`${tableName}.${columnName}`);
  }
};

try {
  const addedColumns = [];

  await ensureColumn('products', 'variants_json', 'variants_json TEXT', addedColumns);
  await ensureColumn('orders', 'selected_variant', 'selected_variant TEXT', addedColumns);
  await ensureColumn('orders', 'selected_variant_price', 'selected_variant_price INTEGER', addedColumns);

  const productColumns = new Set(
    (await client.execute('PRAGMA table_info(products)')).rows.map((row) => String(row.name)),
  );
  const orderColumns = new Set(
    (await client.execute('PRAGMA table_info(orders)')).rows.map((row) => String(row.name)),
  );
  const verified = productColumns.has('variants_json')
    && orderColumns.has('selected_variant')
    && orderColumns.has('selected_variant_price');

  if (!verified) {
    throw new Error('Kolom varian produk gagal diverifikasi setelah migrasi.');
  }

  console.log(JSON.stringify({ addedColumns, verified }));
} finally {
  client.close();
}
