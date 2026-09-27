import crypto from 'crypto';
import { db } from '@/lib/db';
import { orders, payments, products, sellerBalances } from '@/lib/schema';
import { eq } from 'drizzle-orm';

/**
 * Fulfill an order when payment is confirmed via Flip webhook/callback.
 * Shared helper — previously in lib/ipaymu.ts, now standalone.
 */
export async function fulfillOrderPayment(orderId: string, proofUrlStr?: string) {
  const order = await db.select().from(orders).where(eq(orders.id, orderId)).get();
  if (!order) return false;

  const payment = await db.select().from(payments).where(eq(payments.orderId, orderId)).get();
  if (payment) {
    await db.update(payments).set({
      verificationStatus: 'approved',
      proofUrl: proofUrlStr || payment.proofUrl,
      verifiedAt: new Date(),
    }).where(eq(payments.id, payment.id));
  } else {
    await db.insert(payments).values({
      id: crypto.randomUUID(),
      orderId: orderId,
      proofUrl: proofUrlStr || 'flip:approved',
      verificationStatus: 'approved',
      verifiedAt: new Date(),
    });
  }

  if (order.status === 'waiting_verification') {
    await db.update(orders).set({ status: 'verified' }).where(eq(orders.id, orderId));
    try {
      const productObj = await db.select({ sellerId: products.sellerId }).from(products).where(eq(products.id, order.productId)).get();
      if (productObj) {
        const escrowAmount = order.adminSplitAmount ?? Math.floor((order.totalPrice || 0) * 0.5);
        const balanceObj = await db.select().from(sellerBalances).where(eq(sellerBalances.sellerId, productObj.sellerId)).get();
        if (!balanceObj) {
          await db.insert(sellerBalances).values({
            id: crypto.randomUUID(),
            sellerId: productObj.sellerId,
            availableBalance: 0,
            retainedBalance: escrowAmount,
          });
        } else {
          await db.update(sellerBalances)
            .set({ retainedBalance: (balanceObj.retainedBalance || 0) + escrowAmount })
            .where(eq(sellerBalances.id, balanceObj.id));
        }
      }
    } catch (balanceErr) {
      console.error('[fulfillOrderPayment] Balance retention error:', balanceErr);
    }
  }
  return true;
}
