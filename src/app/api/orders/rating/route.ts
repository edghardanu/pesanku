import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { getUserFromSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { orders } from '@/lib/schema';

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'pembeli') {
      return NextResponse.json({ error: 'Hanya pembeli yang dapat memberikan rating.' }, { status: 401 });
    }

    const body = await request.json() as { orderId?: unknown; rating?: unknown };
    const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
    const rating = typeof body.rating === 'number' ? body.rating : Number.NaN;

    if (!orderId || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating harus berupa angka bulat dari 1 sampai 5.' }, { status: 400 });
    }

    const order = await db
      .select({ id: orders.id, status: orders.status })
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.buyerId, user.id)))
      .get();

    if (!order) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan atau bukan milik Anda.' }, { status: 404 });
    }

    if (order.status !== 'completed') {
      return NextResponse.json({ error: 'Rating dapat diberikan setelah pesanan selesai.' }, { status: 409 });
    }

    const ratedAt = new Date();
    await db
      .update(orders)
      .set({ rating, ratedAt })
      .where(and(eq(orders.id, orderId), eq(orders.buyerId, user.id)));

    return NextResponse.json({ success: true, rating, ratedAt: ratedAt.toISOString() });
  } catch (error) {
    console.error('Update product rating error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan saat menyimpan rating.' }, { status: 500 });
  }
}
