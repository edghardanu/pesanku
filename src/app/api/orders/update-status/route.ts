import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, products, sellerBalances } from '@/lib/schema';
import { getUserFromSession } from '@/lib/auth';
import { eq } from 'drizzle-orm';

export async function PUT(req: Request) {
  try {
    const user = await getUserFromSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { orderId, status, deliveryProofUrl, dispatchReceiptUrl, cancelReason } = await req.json() as {
      orderId?: string;
      status?: unknown;
      deliveryProofUrl?: unknown;
      dispatchReceiptUrl?: unknown;
      cancelReason?: string;
    };

    if (!orderId || !status) {
      return NextResponse.json({ error: 'Order ID dan status wajib diisi' }, { status: 400 });
    }

    const validStatuses = ['waiting_verification', 'verified', 'processing', 'completed', 'cancelled', 'failed', 'preorder_running'] as const;
    type OrderStatusUpdate = (typeof validStatuses)[number];
    const isValidStatus = (value: unknown): value is OrderStatusUpdate =>
      typeof value === 'string' && validStatuses.includes(value as OrderStatusUpdate);

    if (!isValidStatus(status)) {
      return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 });
    }

    // Ambil detail pesanan
    const orderObj = await db.select().from(orders).where(eq(orders.id, orderId)).get();
    if (!orderObj) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 });
    }

    // Validasi Otoritas
    if (user.role !== 'admin') {
      if (user.role === 'pembeli') {
        if (orderObj.buyerId !== user.id) {
          return NextResponse.json({ error: 'Unauthorized. Ini bukan pesanan Anda.' }, { status: 403 });
        }
        if (status !== 'completed' && status !== 'cancelled') {
          return NextResponse.json({ error: 'Pembeli hanya dapat menyelesaikan pesanan.' }, { status: 403 });
        }
      } else if (user.role !== 'penjual') {
        return NextResponse.json({ error: 'Unauthorized. Role tidak dikenali.' }, { status: 403 });
      }
    }

    // Ambil detail produk untuk mengetahui sellerId
    const productObj = await db.select({ sellerId: products.sellerId }).from(products).where(eq(products.id, orderObj.productId)).get();
    if (!productObj) {
      return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 });
    }
    const sellerId = productObj.sellerId;

    if (user.role === 'penjual' && sellerId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized. Pesanan ini bukan milik toko Anda.' }, { status: 403 });
    }

    // Fungsi upsert balance
    const addBalance = async (sid: string, amount: number) => {
      const balanceObj = await db.select().from(sellerBalances).where(eq(sellerBalances.sellerId, sid)).get();
      if (!balanceObj) {
        await db.insert(sellerBalances).values({ id: crypto.randomUUID(), sellerId: sid, availableBalance: amount, retainedBalance: 0 });
      } else {
        await db.update(sellerBalances).set({ availableBalance: (balanceObj.availableBalance || 0) + amount }).where(eq(sellerBalances.id, balanceObj.id));
      }
    };

    // Update status and optional delivery proof
    const updateFields: { status: OrderStatusUpdate; deliveryProofUrl?: string; dispatchReceiptUrl?: string; cancelReason?: string } = { status };
    if (typeof deliveryProofUrl === 'string' && deliveryProofUrl) {
      updateFields.deliveryProofUrl = deliveryProofUrl;
    }
    if (typeof dispatchReceiptUrl === 'string' && dispatchReceiptUrl) {
      updateFields.dispatchReceiptUrl = dispatchReceiptUrl;
    }
    if (status === 'cancelled' && cancelReason) {
      updateFields.cancelReason = cancelReason;
    }

    await db.update(orders)
      .set(updateFields)
      .where(eq(orders.id, orderId));

    // LOGIC PEMBAGIAN SALDO 
    if (status === 'processing' && orderObj.status !== 'processing' && orderObj.status !== 'completed') {
       // Saat pembayaran penuh: Admin 50%, Penjual 50% (sesuai db splitAmount, default 50%)
       const currentSellerSplit = orderObj.sellerSplitAmount ?? ((orderObj.totalPrice || 0) * 0.5);
       await addBalance(sellerId, currentSellerSplit);
    } else if (status === 'completed' && orderObj.status !== 'completed') {
       // Saat klik pesanan selesai: Admin melepaskan sisa 50% ke Penjual
       const currentAdminHeld = orderObj.adminSplitAmount ?? ((orderObj.totalPrice || 0) * 0.5);
       await addBalance(sellerId, currentAdminHeld);
    }

    return NextResponse.json({ message: 'Status pesanan berhasil diperbarui' }, { status: 200 });
  } catch (error) {
    console.error('Update order status error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan saat memperbarui status' }, { status: 500 });
  }
}
