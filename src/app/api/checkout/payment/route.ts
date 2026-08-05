import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { payments, orders } from '@/lib/schema';
import crypto from 'crypto';
import { getUserFromSession } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'pembeli') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
    }

    const body = await req.json();
    const { orderId, proofUrl } = body;

    if (!orderId || !proofUrl) {
      return NextResponse.json({ error: 'Data pembayaran tidak lengkap' }, { status: 400 });
    }

    // Pastikan pesanan adalah milik user ini
    const order = await db.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.buyerId, user.id))).get();
    if (!order) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 });
    }

    // Pastikan belum dibayar
    const existingPayment = await db.select().from(payments).where(eq(payments.orderId, orderId)).get();
    if (existingPayment) {
      return NextResponse.json({ error: 'Pembayaran untuk pesanan ini sudah ada' }, { status: 400 });
    }

    // Simpan Bukti Pembayaran
    const paymentId = crypto.randomUUID();
    await db.insert(payments).values({
      id: paymentId,
      orderId: orderId,
      proofUrl: proofUrl,
      verificationStatus: 'pending',
    });

    return NextResponse.json({ message: 'Bukti pembayaran berhasil disimpan', paymentId }, { status: 201 });
  } catch (error) {
    console.error('Payment upload error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server saat menyimpan bukti pembayaran' }, { status: 500 });
  }
}
