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
    const { orderId, allChats, cancelBankCode, cancelBankAccount } = body;

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

    // Jika pesanan belum dibayar, hapus sepenuhnya
    if (['waiting_verification', 'chat_only'].includes(existingOrder.status || '')) {
      // Hapus data chat terkait
      const { chatMessages } = await import('@/lib/schema');
      await db.delete(chatMessages).where(eq(chatMessages.orderId, orderId));

      // Hapus data pembayaran terkait
      await db.delete(payments).where(eq(payments.orderId, orderId));

      // Hapus data pesanan
      await db.delete(orders).where(eq(orders.id, orderId));
    } else {
      // Jika pesanan sudah dibayar (verified, preorder_running, processing), terapkan status cancelled dan kenakan denda
      const { settings, products, sellerBalances } = await import('@/lib/schema');
      const productObj = await db.select({ sellerId: products.sellerId }).from(products).where(eq(products.id, existingOrder.productId)).get();
      const sellerId = productObj?.sellerId || '';

      const schedulePrefix = `preorder_schedule:${sellerId}:${orderId}`;
      const scheduleSetting = await db.select().from(settings).where(eq(settings.key, schedulePrefix)).get();
      
      const penaltyDaysSetting = await db.select().from(settings).where(eq(settings.key, 'penalty_days')).get();
      const penaltyDays = penaltyDaysSetting ? parseInt(penaltyDaysSetting.value) || 1 : 1;

      let isHMinusOneOrCloser = false;
      if (scheduleSetting) {
         try {
           const parsed = JSON.parse(scheduleSetting.value);
           if (parsed.deliveryDate) {
              const deliveryTime = new Date(parsed.deliveryDate).getTime();
              const now = Date.now();
              const msInDays = penaltyDays * 24 * 60 * 60 * 1000;
              // If delivery is within configured penalty days (or in the past)
              if ((deliveryTime - now) <= msInDays) {
                 isHMinusOneOrCloser = true;
              }
           }
         } catch(e) {}
      }

      let penaltyPercentageAdmin = 0;
      let penaltyPercentageSeller = 0;
      let penaltyAdminAmount = 0;
      let penaltySellerAmount = 0;

      if (isHMinusOneOrCloser) {
        const penaltyAdminSetting = await db.select().from(settings).where(eq(settings.key, 'penalty_percentage_admin')).get();
        penaltyPercentageAdmin = penaltyAdminSetting ? parseInt(penaltyAdminSetting.value) : 0;

        const penaltySellerSetting = await db.select().from(settings).where(eq(settings.key, 'penalty_percentage_seller')).get();
        const legacyPenaltySetting = await db.select().from(settings).where(eq(settings.key, 'penalty_percentage')).get();
        penaltyPercentageSeller = penaltySellerSetting ? parseInt(penaltySellerSetting.value) : (legacyPenaltySetting ? parseInt(legacyPenaltySetting.value) : 0);

        penaltyAdminAmount = Math.round((penaltyPercentageAdmin / 100) * existingOrder.totalPrice);
        penaltySellerAmount = Math.round((penaltyPercentageSeller / 100) * existingOrder.totalPrice);
      }

      const penaltyAmount = penaltyAdminAmount + penaltySellerAmount;
      const refundAmount = existingOrder.totalPrice - penaltyAmount;

      if (cancelBankCode && cancelBankAccount && refundAmount > 0) {
        const { executeFlipDisbursement } = await import('@/lib/flip');
        const buyerBank = `${cancelBankCode} ${cancelBankAccount}`.trim();
        const disbursementRes = await executeFlipDisbursement({
          amount: refundAmount,
          bankAccount: buyerBank,
          referenceId: `CNL-${orderId}`,
          notes: `Pesanku - Refund Pembatalan Order ${orderId}`
        });

        if (!disbursementRes.success) {
          return NextResponse.json({ error: `Refund otomatis gagal: ${disbursementRes.error}` }, { status: 400 });
        }
      }

      await db.update(orders).set({
        status: 'cancelled',
        cancelReason: penaltyAmount > 0 
          ? `Dibatalkan oleh pembeli. Denda pinalti (H-${penaltyDays}): Rp ${penaltyAmount.toLocaleString('id-ID')} (Admin: Rp ${penaltyAdminAmount.toLocaleString('id-ID')}, Penjual: Rp ${penaltySellerAmount.toLocaleString('id-ID')})`
          : `Dibatalkan oleh pembeli tanpa denda pinalti (diluar periode H-${penaltyDays}).`,
        adminSplitAmount: penaltyAdminAmount,
        sellerSplitAmount: penaltySellerAmount
      }).where(eq(orders.id, orderId));

      // SESUAIKAN SALDO PENJUAL
      // Retained balance dikurangi bagian admin sebelumnya
      // Available balance disesuaikan agar hasil akhir balance yang diterima penjual murni = penaltyAmount 
      if (productObj) {
        // We reuse sellerId from early declaration
        const prevAdminSplit = existingOrder.adminSplitAmount ?? Math.floor((existingOrder.totalPrice || 0) * 0.5);
        const prevSellerSplit = existingOrder.sellerSplitAmount ?? Math.floor((existingOrder.totalPrice || 0) * 0.5);
        const availableAdjustment = penaltySellerAmount - prevSellerSplit;
        
        const balanceObj = await db.select().from(sellerBalances).where(eq(sellerBalances.sellerId, sellerId)).get();
        if (balanceObj) {
          await db.update(sellerBalances)
            .set({ 
              retainedBalance: Math.max(0, (balanceObj.retainedBalance || 0) - prevAdminSplit),
              availableBalance: (balanceObj.availableBalance || 0) + availableAdjustment,
             })
            .where(eq(sellerBalances.id, balanceObj.id));
        } else {
          const crypto = await import('crypto');
          await db.insert(sellerBalances).values({
            id: crypto.randomUUID(),
            sellerId: sellerId,
            retainedBalance: 0,
            availableBalance: availableAdjustment,
          });
        }
      }
    }

    // Decrement currentQty from product
    const { products } = await import('@/lib/schema');
    const product = await db.select().from(products).where(eq(products.id, existingOrder.productId)).get();
    if (product && existingOrder.status !== 'cancelled' && existingOrder.status !== 'failed') {
      const newQty = Math.max(0, (product.currentQty || 0) - existingOrder.qty);
      const newStatus = newQty >= (product.preorderMinQty || 1) ? 'quota_reached' : 'active';
      await db.update(products).set({ currentQty: newQty, status: newStatus }).where(eq(products.id, product.id));
    }

    return NextResponse.json({ message: 'Pesanan berhasil dibatalkan' }, { status: 200 });
  } catch (error) {
    console.error('Cancel order error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan saat membatalkan pesanan' }, { status: 500 });
  }
}
