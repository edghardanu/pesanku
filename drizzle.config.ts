import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
// Fallback ke .env jika .env.local tidak ada
if (!process.env.TURSO_DATABASE_URL) {
  dotenv.config({ path: '.env' });
}

export default defineConfig({
  schema: './src/lib/schema.ts',
  out: './drizzle',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL || 'file:local.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
