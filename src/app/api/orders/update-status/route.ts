import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders } from '@/lib/schema';
import { getUserFromSession } from '@/lib/auth';
import { eq } from 'drizzle-orm';

export async function PUT(req: Request) {
  try {
    const user = await getUserFromSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { orderId, status, deliveryProofUrl } = await req.json();

    if (!orderId || !status) {
      return NextResponse.json({ error: 'Order ID dan status wajib diisi' }, { status: 400 });
    }

    const validStatuses = ['waiting_verification', 'verified', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 });
    }

    // Ambil detail pesanan
    const orderObj = await db.select().from(orders).where(eq(orders.id, orderId)).get();
    if (!orderObj) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 });
    }

    // Validasi Otoritas
    if (user.role === 'pembeli') {
      if (orderObj.buyerId !== user.id) {
        return NextResponse.json({ error: 'Unauthorized. Ini bukan pesanan Anda.' }, { status: 403 });
      }
      if (status !== 'completed') {
        return NextResponse.json({ error: 'Pembeli hanya dapat menyelesaikan pesanan.' }, { status: 403 });
      }
    } else if (user.role !== 'penjual') {
      return NextResponse.json({ error: 'Unauthorized. Hanya penjual atau pembeli terkait yang dapat mengubah status.' }, { status: 403 });
    }

    // Update status and optional delivery proof
    const updateFields: any = { status };
    if (deliveryProofUrl) {
      updateFields.deliveryProofUrl = deliveryProofUrl;
    }

    await db.update(orders)
      .set(updateFields)
      .where(eq(orders.id, orderId));

    return NextResponse.json({ message: 'Status pesanan berhasil diperbarui' }, { status: 200 });
  } catch (error) {
    console.error('Update order status error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan saat memperbarui status' }, { status: 500 });
  }
}
