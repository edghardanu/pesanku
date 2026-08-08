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
    const requestedQty = Number(qty);

    if (!productId || !Number.isInteger(requestedQty) || requestedQty < 1) {
      return NextResponse.json({ error: 'Data pesanan tidak lengkap' }, { status: 400 });
    }

    return await db.transaction(async (tx) => {
      const product = await tx.select().from(products).where(eq(products.id, productId)).get();
      if (!product) {
        return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 });
      }

      const minimumOrder = product.minOrderQty || 1;
      const availableStock = Math.max(0, (product.stock || 0) - (product.currentQty || 0));
      const deadlinePassed = Boolean(product.deadlineDate && product.deadlineDate.getTime() < Date.now());
      const preorderClosed = ['closed', 'processing', 'completed'].includes(product.status || '') || deadlinePassed;

      if (preorderClosed) {
        return NextResponse.json({ error: 'Masa preorder produk ini telah ditutup' }, { status: 400 });
      }

      if (requestedQty < minimumOrder) {
        return NextResponse.json({ error: `Minimal pemesanan adalah ${minimumOrder} porsi` }, { status: 400 });
      }

      if (product.maxOrderQty && requestedQty > product.maxOrderQty) {
        return NextResponse.json({ error: `Maksimal pemesanan adalah ${product.maxOrderQty} porsi` }, { status: 400 });
      }

      if (requestedQty > availableStock) {
        return NextResponse.json({ error: `Stok tersisa hanya ${availableStock} porsi` }, { status: 400 });
      }

      const calculatedTotalPrice = product.price * requestedQty;
      const orderId = `ORD-${Math.floor(10000 + Math.random() * 90000)}`;

      await tx.insert(orders).values({
        id: orderId,
        productId,
        buyerId: user.id,
        qty: requestedQty,
        totalPrice: calculatedTotalPrice,
        notes: notes || '',
        status: 'waiting_verification',
      });

      const nextCurrentQty = (product.currentQty || 0) + requestedQty;
      await tx.update(products)
        .set({
          currentQty: nextCurrentQty,
          status: nextCurrentQty >= (product.preorderMinQty || 1) ? 'quota_reached' : product.status,
        })
        .where(eq(products.id, productId));

      return NextResponse.json({ message: 'Pesanan berhasil dibuat. Menunggu pembayaran.', orderId }, { status: 201 });
    }, { behavior: 'immediate' });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server saat memproses pesanan' }, { status: 500 });
  }
}
