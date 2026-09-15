import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, products, users, payments, chatMessages } from '@/lib/schema';
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
        const {
          checkTransactionStatus,
          fulfillOrderPayment,
          getIpaymuPaidProof,
          getIpaymuTransactionLookupId,
          isIpaymuTransactionPaid,
        } = await import('@/lib/ipaymu');
        for (const wo of waitingOrders) {
          try {
            const lookupId = getIpaymuTransactionLookupId(wo.proofUrl, wo.id);
            const verifyData = await checkTransactionStatus(lookupId);
            if (isIpaymuTransactionPaid(verifyData)) {
              await fulfillOrderPayment(wo.id, getIpaymuPaidProof(verifyData, lookupId));
              wo.status = 'verified';
            }
          } catch (chkErr) {
            // ignore individual order check error
          }
        }
      } catch (importErr) {
        // ignore
      }
    }

    const lastMessages = await db
      .select({
        orderId: chatMessages.orderId,
        lastAt: sql<number>`max(${chatMessages.createdAt})`.as('lastAt'),
        hasSellerReply: sql<number>`MAX(CASE WHEN ${chatMessages.senderId} = ${user.id} THEN 1 ELSE 0 END)`.as('hasSellerReply'),
      })
      .from(chatMessages)
      .groupBy(chatMessages.orderId);

    const chatInfoMap: Record<string, { lastAt: Date | null, isResponded: boolean }> = lastMessages.reduce((acc, row) => {
      acc[row.orderId] = {
        lastAt: row.lastAt ? new Date((row.lastAt as number) * 1000) : null,
        isResponded: row.hasSellerReply === 1
      };
      return acc;
    }, {} as Record<string, { lastAt: Date | null, isResponded: boolean }>);

    const uniqueOrdersMap = new Map<string, any>();
    for (const order of sellerOrders) {
      if (!uniqueOrdersMap.has(order.id)) {
        uniqueOrdersMap.set(order.id, {
          ...order,
          lastMessageAt: chatInfoMap[order.id]?.lastAt ?? null,
          isResponded: chatInfoMap[order.id]?.isResponded ?? false
        });
      }
    }

    return NextResponse.json({ orders: Array.from(uniqueOrdersMap.values()) });
  } catch (error) {
    console.error('Seller orders fetch error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
