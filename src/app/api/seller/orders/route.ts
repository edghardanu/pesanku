import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, products, users, payments } from '@/lib/schema';
import { getUserFromSession } from '@/lib/auth';
import { and, eq, desc, ne, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'penjual') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sellerOrders = await db.select({
      id: orders.id,
      buyerId: orders.buyerId,
      productId: orders.productId,
      qty: orders.qty,
      totalPrice: orders.totalPrice,
      status: orders.status,
      notes: orders.notes,
      selectedVariant: orders.selectedVariant,
      selectedVariantPrice: orders.selectedVariantPrice,
      createdAt: orders.createdAt,
      productName: products.name,
      buyerName: users.name,
      buyerPhone: users.phone,
      buyerAddress: sql<string>`COALESCE(${orders.deliveryAddress}, ${users.address})`.as('buyerAddress'),
      requestedDeliveryDate: orders.deliveryDate,
      minOrderQty: products.minOrderQty,
      proofUrl: payments.proofUrl,
      deliveryProofUrl: orders.deliveryProofUrl,
      dispatchReceiptUrl: orders.dispatchReceiptUrl,
      trackingNumber: orders.trackingNumber,
      adminSplitAmount: orders.adminSplitAmount,
      sellerSplitAmount: orders.sellerSplitAmount,
      returnReason: orders.returnReason,
      returnProofUrl: orders.returnProofUrl,
      returnDate: orders.returnDate,
      isRead: orders.isRead,
    })
      .from(orders)
      .innerJoin(products, eq(orders.productId, products.id))
      .innerJoin(users, eq(orders.buyerId, users.id))
      .leftJoin(payments, eq(orders.id, payments.orderId))
      .where(eq(products.sellerId, user.id))
      .orderBy(desc(orders.createdAt));

    // Auto-verify waiting_verification orders via iPaymu check
    const waitingOrders = sellerOrders.filter(o => o.status === 'waiting_verification');
    if (waitingOrders.length > 0) {
      try {
        const { checkTransactionStatus, fulfillOrderPayment } = await import('@/lib/ipaymu');
        for (const wo of waitingOrders) {
          try {
            const verifyData = await checkTransactionStatus(wo.id);
            if (verifyData.Status === 200 && verifyData.Data) {
              const rawStatus = verifyData.Data.Status ?? verifyData.Data.status;
              const statusNum = Number(rawStatus);
              const statusStr = String(rawStatus || '').toLowerCase();
              const paidStatusStr = String(verifyData.Data.PaidStatus || verifyData.Data.paidStatus || '').toLowerCase();

              const isPaid =
                statusNum === 1 ||
                statusNum === 6 ||
                statusNum === 7 ||
                statusStr === '1' ||
                statusStr === '6' ||
                statusStr === '7' ||
                statusStr === 'berhasil' ||
                statusStr === 'paid' ||
                statusStr === 'escrow' ||
                paidStatusStr === 'paid' ||
                paidStatusStr === 'berhasil';

              if (isPaid) {
                const proofStr = `ipaymu:${verifyData.Data.TransactionId || verifyData.Data.SessionId}:${verifyData.Data.PaymentChannel || 'va'}:paid`;
                await fulfillOrderPayment(wo.id, proofStr);
                wo.status = 'verified';
              }
            }
          } catch (chkErr) {
            // ignore individual order check error
          }
        }
      } catch (importErr) {
        // ignore
      }
    }

    const uniqueOrdersMap = new Map<string, typeof sellerOrders[0]>();
    for (const order of sellerOrders) {
      if (!uniqueOrdersMap.has(order.id)) {
        uniqueOrdersMap.set(order.id, order);
      }
    }

    return NextResponse.json({ orders: Array.from(uniqueOrdersMap.values()) });
  } catch (error) {
    console.error('Seller orders fetch error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
