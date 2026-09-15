import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, payments, users } from '@/lib/schema';
import { getUserFromSession } from '@/lib/auth';
import { eq, and, sql } from 'drizzle-orm';
import { createFlipBill } from '@/lib/flip';
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
      if (existingPayment.proofUrl?.startsWith('flip:')) {
        const billId = existingPayment.proofUrl.split(':')[1];
        if (billId) {
          // You ideally should redirect to flip's pending link, but Flip Bill Url is generally stateless.
          // By default we can just throw error down below or fetch the link. For now we just recreate it by deleting.
          await db.delete(payments).where(eq(payments.id, existingPayment.id));
        }
      } else if (existingPayment.proofUrl?.startsWith('ipaymu:')) {
        await db.delete(payments).where(eq(payments.id, existingPayment.id));
      } else {
        return NextResponse.json({ error: 'Pembayaran sudah diproses sebelumnya' }, { status: 400 });
      }
    }

    // Ambil data produk untuk nama produk
    const { products } = await import('@/lib/schema');
    const product = await db.select().from(products).where(eq(products.id, order.productId)).get();

    // Ambil data lengkap user (termasuk no HP) dari database
    const userRecord = await db.select().from(users).where(eq(users.id, user.id)).get();

    // Ambil settings untuk biaya (checkout_fees_config)
    const { settings } = await import('@/lib/schema');
    const settingsData = await db.select().from(settings).where(
      sql`${settings.key} IN ('fee_aplikasi', 'fee_jasa', 'fee_admin', 'checkout_fees_config')`
    ).all();

    let platformFees = 0;
    let hasCustomFees = false;
    
    settingsData.forEach(s => {
      if (s.key === 'checkout_fees_config') {
        try {
          const feesList = JSON.parse(s.value);
          if (Array.isArray(feesList)) {
            feesList.forEach(fee => {
              platformFees += (parseInt(fee.value, 10) || 0);
            });
            hasCustomFees = true;
          }
        } catch(e) {}
      }
    });

    if (!hasCustomFees) {
      settingsData.forEach(s => {
        if (s.key === 'fee_aplikasi' || s.key === 'fee_jasa' || s.key === 'fee_admin') {
          platformFees += parseInt(s.value || '0', 10) || 0;
        }
      });
    }

    const finalAmount = order.totalPrice + platformFees;

    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    const proto = req.headers.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https');
    const origin = req.headers.get('origin');
    const customBaseUrl = origin || (host ? `${proto}://${host}` : undefined);
    
    let siteBaseUrl = customBaseUrl || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    siteBaseUrl = siteBaseUrl.replace(/\/+$/, '');

    const productName = product?.name || 'Produk Pesanku';
    const title = order.qty > 1 ? `${productName} (x${order.qty})` : productName;

    // Buat pembayaran Redirect melalui Flip
    const result = await createFlipBill({
      title: `Pembayaran Pesanku: ${orderId}`,
      amount: finalAmount,
      type: 'SINGLE',
      sender_name: user.name,
      sender_email: user.email,
      sender_phone_number: userRecord?.phone || '08000000000',
      redirect_url: `${siteBaseUrl}/payment/return?order_id=${orderId}`,
      step: 2
    });

    // Simpan data pembayaran awal di database (pending)
    const paymentId = crypto.randomUUID();
    await db.insert(payments).values({
      id: paymentId,
      orderId: orderId,
      proofUrl: `flip:${result.billId}`,
      verificationStatus: 'pending',
    });

    return NextResponse.json({
      message: 'Berhasil membuat link pembayaran Flip',
      paymentUrl: result.paymentUrl,
      sessionId: result.billId,
      paymentId,
    }, { status: 200 });

  } catch (error) {
    // Log detail error HANYA di server, JANGAN kirim ke klien karena bisa mengekspos informasi sensitif
    console.error('Flip create-payment error:', error);
    return NextResponse.json({ error: 'Gagal membuat link pembayaran. Silakan coba beberapa saat lagi atau hubungi admin.' }, { status: 500 });
  }
}
