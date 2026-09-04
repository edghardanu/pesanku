import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, payments, users } from '@/lib/schema';
import { getUserFromSession } from '@/lib/auth';
import { eq, and, sql } from 'drizzle-orm';
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

    const existingPayment = await db
      .select()
      .from(payments)
      .where(eq(payments.orderId, orderId))
      .get();

    if (existingPayment) {
      if (existingPayment.proofUrl?.startsWith('ipaymu:')) {
        const sessionId = existingPayment.proofUrl.split(':')[1];
        if (sessionId) {
          const env = process.env.IPAYMU_ENV || 'production';
          const baseUrl = env === 'sandbox' ? 'https://sandbox.ipaymu.com/payment' : 'https://my.ipaymu.com/payment';
          return NextResponse.json({
            message: 'Melanjutkan pembayaran sebelumnya',
            paymentUrl: `${baseUrl}/${sessionId}`,
            sessionId: sessionId,
            paymentId: existingPayment.id,
          }, { status: 200 });
        } else {
          // Invalid/empty session id, delete and let it recrate
          await db.delete(payments).where(eq(payments.id, existingPayment.id));
        }
      } else {
        return NextResponse.json({ error: 'Pembayaran sudah diproses sebelumnya' }, { status: 400 });
      }
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

    // Ambil settings untuk biaya (fee_aplikasi, fee_jasa, fee_admin)
    const { settings } = await import('@/lib/schema');
    const settingsData = await db.select().from(settings).where(
      sql`${settings.key} IN ('fee_aplikasi', 'fee_jasa', 'fee_admin')`
    ).all();

    let platformFees = 0;
    settingsData.forEach(s => {
      if (s.key === 'fee_aplikasi' || s.key === 'fee_jasa' || s.key === 'fee_admin') {
        platformFees += parseInt(s.value || '0', 10) || 0;
      }
    });

    const finalAmount = order.totalPrice + platformFees;

    // Buat pembayaran Redirect melalui iPaymu
    const result = await createRedirectPayment({
      orderId: orderId,
      productName: product?.name || 'Produk Pesanku',
      amount: finalAmount,
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
