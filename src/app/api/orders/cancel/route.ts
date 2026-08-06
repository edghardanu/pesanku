import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, payments } from '@/lib/schema';
import { getUserFromSession } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';

export async function DELETE(req: Request) {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'pembeli') {
      return NextResponse.json({ error: 'Unauthorized. Hanya pembeli yang dapat membatalkan pesanan.' }, { status: 403 });
    }

    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID wajib diisi' }, { status: 400 });
    }

    // Cari pesanan milik pembeli
    const existingOrder = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.buyerId, user.id)))
      .get();

    if (!existingOrder) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan atau Anda tidak memiliki akses' }, { status: 404 });
    }

    // Hapus data pembayaran terkait jika ada
    await db.delete(payments).where(eq(payments.orderId, orderId));

    // Hapus data pesanan
    await db.delete(orders).where(eq(orders.id, orderId));

    return NextResponse.json({ message: 'Pesanan berhasil dibatalkan' }, { status: 200 });
  } catch (error) {
    console.error('Cancel order error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan saat membatalkan pesanan' }, { status: 500 });
  }
}
