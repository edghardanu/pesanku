import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { products } from '@/lib/schema';
import { getUserFromSession } from '@/lib/auth';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const user = await getUserFromSession();
    
    if (!user || user.role !== 'penjual') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, price, imageUrl, minQty, deadline } = body;

    if (!name || !price) {
      return NextResponse.json({ message: 'Nama dan harga produk wajib diisi' }, { status: 400 });
    }

    // Business Rule 1: Deadline tidak bisa diatur jika minQty belum ada
    if (deadline && (!minQty || minQty < 1)) {
      return NextResponse.json({ message: 'Minimal kuota wajib diisi sebelum mengatur deadline' }, { status: 400 });
    }

    const parsedMinQty = minQty ? parseInt(minQty) : 10;
    const parsedPrice = parseInt(price);
    
    // Parse deadline
    let deadlineDate = null;
    if (deadline) {
      deadlineDate = new Date(deadline);
    }

    const productId = crypto.randomUUID();

    await db.insert(products).values({
      id: productId,
      sellerId: user.id,
      name,
      description: description || null,
      price: parsedPrice,
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&h=400&fit=crop',
      preorderMinQty: parsedMinQty,
      deadlineDate: deadlineDate,
      status: 'draft',
    });

    return NextResponse.json({ message: 'Produk berhasil dibuat', id: productId }, { status: 201 });
  } catch (error) {
    console.error('Create product error:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
