import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

try {
  const tableInfo = await client.execute('PRAGMA table_info(orders)');
  const existingColumns = new Set(tableInfo.rows.map((row) => String(row.name)));
  const addedColumns = [];

  if (!existingColumns.has('rating')) {
    await client.execute('ALTER TABLE orders ADD COLUMN rating INTEGER');
    addedColumns.push('rating');
  }

  if (!existingColumns.has('rated_at')) {
    await client.execute('ALTER TABLE orders ADD COLUMN rated_at INTEGER');
    addedColumns.push('rated_at');
  }

  const updatedTableInfo = await client.execute('PRAGMA table_info(orders)');
  const updatedColumns = new Set(updatedTableInfo.rows.map((row) => String(row.name)));
  const verified = ['rating', 'rated_at'].every((column) => updatedColumns.has(column));

  if (!verified) {
    throw new Error('Kolom rating gagal diverifikasi setelah migrasi.');
  }

  console.log(JSON.stringify({ addedColumns, verified }));
} finally {
  client.close();
}
