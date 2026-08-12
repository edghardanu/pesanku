import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

try {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS promotion_offers (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS product_promotions (
      id TEXT PRIMARY KEY NOT NULL,
      promotion_id TEXT NOT NULL REFERENCES promotion_offers(id),
      product_id TEXT NOT NULL REFERENCES products(id),
      seller_id TEXT NOT NULL REFERENCES users(id),
      status TEXT DEFAULT 'pending',
      requested_at INTEGER DEFAULT (strftime('%s', 'now')),
      reviewed_at INTEGER,
      reviewed_by TEXT REFERENCES users(id)
    )
  `);

  await client.execute('CREATE INDEX IF NOT EXISTS promotion_offers_expiry_idx ON promotion_offers(is_active, expires_at)');
  await client.execute('CREATE INDEX IF NOT EXISTS product_promotions_product_idx ON product_promotions(product_id, status)');
  await client.execute('CREATE INDEX IF NOT EXISTS product_promotions_seller_idx ON product_promotions(seller_id, requested_at)');

  const tables = await client.execute(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('promotion_offers', 'product_promotions') ORDER BY name",
  );
  const verified = tables.rows.length === 2;
  if (!verified) throw new Error('Tabel promosi gagal diverifikasi setelah migrasi.');

  console.log(JSON.stringify({ tables: tables.rows.map((row) => row.name), verified }));
} finally {
  client.close();
}
