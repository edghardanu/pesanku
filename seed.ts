import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { db } from './src/lib/db';
import { users, sellerProfiles, sellerBalances } from './src/lib/schema';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

async function seed() {
  console.log('Clearing old data...');
  await db.delete(sellerBalances);
  await db.delete(sellerProfiles);
  await db.delete(users);

  console.log('Seeding dummy accounts...');

  const passwordHash = await bcrypt.hash('password123', 10);

  try {
    // 1. Admin
    const adminId = crypto.randomUUID();
    await db.insert(users).values({
      id: adminId,
      name: 'Admin Utama',
      email: 'admin@pesanku.com',
      phone: '081234567890',
      passwordHash: passwordHash,
      role: 'admin',
      status: 'active',
    }).onConflictDoNothing({ target: users.email });
    console.log('✅ Admin account seeded');

    // 2. Pembeli
    const pembeliId = crypto.randomUUID();
    await db.insert(users).values({
      id: pembeliId,
      name: 'Budi Pembeli',
      email: 'budi@gmail.com',
      phone: '081234567891',
      passwordHash: passwordHash,
      role: 'pembeli',
      status: 'active',
    }).onConflictDoNothing({ target: users.email });
    console.log('✅ Pembeli account seeded');

    // 3. Penjual
    const penjualId = crypto.randomUUID();
    await db.insert(users).values({
      id: penjualId,
      name: 'Bu Ana (Toko)',
      email: 'ana@gmail.com',
      phone: '081234567892',
      passwordHash: passwordHash,
      role: 'penjual',
      status: 'active',
    }).onConflictDoNothing({ target: users.email });

    // Tambahkan Seller Profile untuk penjual
    await db.insert(sellerProfiles).values({
      id: crypto.randomUUID(),
      userId: penjualId,
      storeName: 'Toko Roti Ibu Ana',
      address: 'Jl. Sudirman No 123, Jakarta',
      category: 'Makanan Ringan',
      approvalStatus: 'approved',
    }).onConflictDoNothing();

    // Tambahkan Seller Balance
    await db.insert(sellerBalances).values({
      id: crypto.randomUUID(),
      sellerId: penjualId,
      retainedBalance: 0,
      availableBalance: 0,
    }).onConflictDoNothing();
    
    console.log('✅ Penjual account seeded');

    console.log('🎉 Seeding complete!');
  } catch (e) {
    console.error('Seed error:', e);
  }
  process.exit(0);
}

seed();
