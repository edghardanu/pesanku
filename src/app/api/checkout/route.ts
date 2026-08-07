import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, products } from '@/lib/schema';
import { getUserFromSession } from '@/lib/auth';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'pembeli') {
      return NextResponse.json({ error: 'Unauthorized. Hanya pembeli yang dapat memesan.' }, { status: 403 });
    }

    const body = await req.json();
    const { productId, qty, totalPrice, notes } = body;

    if (!productId || !qty || !totalPrice) {
      return NextResponse.json({ error: 'Data pesanan tidak lengkap' }, { status: 400 });
    }

    // Pastikan produk valid
    const product = await db.select().from(products).where(eq(products.id, productId)).get();
    if (!product) {
      return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 });
    }

    // Generate custom Order ID
    const orderId = `ORD-${Math.floor(10000 + Math.random() * 90000)}`;

    // Simpan Pesanan (Order)
    await db.insert(orders).values({
      id: orderId,
      productId: productId,
      buyerId: user.id,
      qty: qty,
      totalPrice: totalPrice,
      notes: notes || '',
      status: 'waiting_verification',
    });

    return NextResponse.json({ message: 'Pesanan berhasil dibuat. Menunggu pembayaran.', orderId }, { status: 201 });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server saat memproses pesanan' }, { status: 500 });
  }
}
