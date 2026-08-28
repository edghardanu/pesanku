import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, payments, users } from '@/lib/schema';
import { getUserFromSession } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';
import { createRedirectPayment } from '@/lib/ipaymu';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'pembeli') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
    }

    const body = await req.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID wajib diisi' }, { status: 400 });
    }

    // Pastikan pesanan ada dan milik user ini
    const order = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.buyerId, user.id)))
      .get();

    if (!order) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 });
    }

    if (order.status !== 'waiting_verification') {
      return NextResponse.json({ error: 'Pesanan sudah tidak bisa dibayar pada tahap ini' }, { status: 400 });
    }

    // Pastikan belum ada pembayaran
    const existingPayment = await db
      .select()
      .from(payments)
      .where(eq(payments.orderId, orderId))
      .get();

    if (existingPayment) {
      return NextResponse.json({ error: 'Pembayaran sudah diproses sebelumnya' }, { status: 400 });
    }

    // Ambil data produk untuk nama produk dan mengetahui Penjual
    const { products, sellerProfiles } = await import('@/lib/schema');
    const product = await db.select().from(products).where(eq(products.id, order.productId)).get();

    // Ambil detail Penjual untuk VA iPaymu (jika ada)
    let sellerVa = undefined;
    let sellerSplitAmount = undefined;
    if (product) {
      const sellerProfile = await db.select().from(sellerProfiles).where(eq(sellerProfiles.userId, product.sellerId)).get();
      if (sellerProfile && sellerProfile.ipaymuVa) {
        sellerVa = sellerProfile.ipaymuVa;
        // Gunakan split yang tersimpan di order (jika null, default ke 50%)
        sellerSplitAmount = order.sellerSplitAmount ?? Math.floor(order.totalPrice * 0.5);
      }
    }

    // Ambil data lengkap user (termasuk no HP) dari database
    const userRecord = await db.select().from(users).where(eq(users.id, user.id)).get();

    // Buat pembayaran Redirect melalui iPaymu
    const result = await createRedirectPayment({
      orderId: orderId,
      productName: product?.name || 'Produk Pesanku',
      amount: order.totalPrice,
      buyerName: user.name,
      buyerEmail: user.email,
      buyerPhone: userRecord?.phone || '08000000000',
      qty: order.qty,
      sellerVa: sellerVa,
      sellerSplitAmount: sellerSplitAmount,
    });

    // Simpan data pembayaran awal di database (pending)
    const paymentId = crypto.randomUUID();
    await db.insert(payments).values({
      id: paymentId,
      orderId: orderId,
      proofUrl: `ipaymu:${result.SessionId}`,
      verificationStatus: 'pending',
    });

    return NextResponse.json({
      message: 'Berhasil membuat link pembayaran',
      paymentUrl: result.Url,
      sessionId: result.SessionId,
      paymentId,
    }, { status: 200 });

  } catch (error) {
    console.error('iPaymu create-payment error:', error);
    const errMsg = error instanceof Error ? error.message : 'Terjadi kesalahan pada server';
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
