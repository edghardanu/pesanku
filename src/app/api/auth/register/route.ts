import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, sellerProfiles } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, phone, password, role, storeName, address } = body;

    // Validasi input
    if (!name || !email || !password || !role) {
      return NextResponse.json({ message: 'Semua field wajib diisi' }, { status: 400 });
    }

    if (role === 'seller' && (!storeName || !address)) {
      return NextResponse.json({ message: 'Nama toko dan alamat wajib diisi untuk penjual' }, { status: 400 });
    }

    // Cek email apakah sudah ada
    const existingUser = await db.select().from(users).where(eq(users.email, email)).get();
    if (existingUser) {
      return NextResponse.json({ message: 'Email sudah terdaftar' }, { status: 400 });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // Generate ID
    const userId = crypto.randomUUID();

    // Insert user
    await db.insert(users).values({
      id: userId,
      name,
      email,
      phone: phone || null,
      passwordHash,
      role: role === 'seller' ? 'penjual' : 'pembeli',
      status: 'active',
    });

    // Jika penjual, insert ke sellerProfiles
    if (role === 'seller') {
      await db.insert(sellerProfiles).values({
        id: crypto.randomUUID(),
        userId: userId,
        storeName: storeName,
        address: address,
        approvalStatus: 'pending', // Perlu approval admin sesuai PRD
      });
    }

    return NextResponse.json({ message: 'Registrasi berhasil', userId }, { status: 201 });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
