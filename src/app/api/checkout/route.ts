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
    const { productId, qty, notes } = body;

    if (!productId || !qty) {
      return NextResponse.json({ error: 'Data pesanan tidak lengkap' }, { status: 400 });
    }

    // Pastikan produk valid
    const product = await db.select().from(products).where(eq(products.id, productId)).get();
    if (!product) {
      return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 });
    }

    const calculatedTotalPrice = product.price * qty;

    // Generate custom Order ID
    const orderId = `ORD-${Math.floor(10000 + Math.random() * 90000)}`;

    // Simpan Pesanan (Order)
    await db.insert(orders).values({
      id: orderId,
      productId: productId,
      buyerId: user.id,
      qty: qty,
      totalPrice: calculatedTotalPrice,
      notes: notes || '',
      status: 'waiting_verification',
    });

    // Update Progress Terkumpul pada Produk
    await db.update(products)
      .set({ 
        currentQty: (product.currentQty || 0) + qty,
        status: ((product.currentQty || 0) + qty) >= (product.preorderMinQty || 1) ? 'quota_reached' : product.status
      })
      .where(eq(products.id, productId));

    return NextResponse.json({ message: 'Pesanan berhasil dibuat. Menunggu pembayaran.', orderId }, { status: 201 });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server saat memproses pesanan' }, { status: 500 });
  }
}
