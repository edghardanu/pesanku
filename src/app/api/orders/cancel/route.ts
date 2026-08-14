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

    const body = await req.json();
    const { orderId, allChats } = body;

    if (allChats) {
      const chatOnlyOrders = await db
        .select()
        .from(orders)
        .where(and(eq(orders.status, 'chat_only'), eq(orders.buyerId, user.id)))
        .all();

      const orderIds = chatOnlyOrders.map(o => o.id);
      if (orderIds.length > 0) {
        const { chatMessages } = await import('@/lib/schema');
        for (const id of orderIds) {
          await db.delete(chatMessages).where(eq(chatMessages.orderId, id));
          await db.delete(orders).where(eq(orders.id, id));
        }
      }
      return NextResponse.json({ message: 'Semua chat berhasil dihapus' }, { status: 200 });
    }

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

    // Hapus data chat terkait jika ada
    const { chatMessages } = await import('@/lib/schema');
    await db.delete(chatMessages).where(eq(chatMessages.orderId, orderId));

    // Hapus data pembayaran terkait jika ada
    await db.delete(payments).where(eq(payments.orderId, orderId));

    // Decrement currentQty from product
    const { products } = await import('@/lib/schema');
    const product = await db.select().from(products).where(eq(products.id, existingOrder.productId)).get();
    if (product && existingOrder.status !== 'cancelled' && existingOrder.status !== 'failed') {
      const newQty = Math.max(0, (product.currentQty || 0) - existingOrder.qty);
      const newStatus = newQty >= (product.preorderMinQty || 1) ? 'quota_reached' : 'active';
      await db.update(products).set({ currentQty: newQty, status: newStatus }).where(eq(products.id, product.id));
    }

    // Hapus data pesanan
    await db.delete(orders).where(eq(orders.id, orderId));

    return NextResponse.json({ message: 'Data berhasil dihapus' }, { status: 200 });
  } catch (error) {
    console.error('Cancel order error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan saat membatalkan pesanan' }, { status: 500 });
  }
}
