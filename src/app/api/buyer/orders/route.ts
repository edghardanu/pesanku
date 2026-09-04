import { NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { db } from "@/lib/db";
import { orders, products, payments, sellerProfiles, users, chatMessages } from "@/lib/schema";
import { eq, desc, ne, and, sql } from "drizzle-orm";
import { getUserFromSession } from "@/lib/auth";
import { BuyerOrderViewItem } from "@/types";

export async function GET() {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'pembeli') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let userOrders: BuyerOrderViewItem[] = [];
    let unreadCounts: Record<string, number> = {};

    userOrders = await db
      .select({
        orderId: orders.id,
        qty: orders.qty,
        totalPrice: orders.totalPrice,
        status: orders.status,
        notes: orders.notes,
        selectedVariant: orders.selectedVariant,
        selectedVariantPrice: orders.selectedVariantPrice,
        createdAt: orders.createdAt,
        productId: products.id,
        productName: products.name,
        productPrice: products.price,
        productImageUrl: products.imageUrl,
        storeName: sellerProfiles.storeName,
        sellerId: products.sellerId,
        minQty: products.minOrderQty,
        maxQty: products.maxOrderQty,
        processingTime: products.processingTime,
        paymentId: payments.id,
        paymentStatus: payments.verificationStatus,
        paymentProofUrl: payments.proofUrl,
        deliveryProofUrl: orders.deliveryProofUrl,
        dispatchReceiptUrl: orders.dispatchReceiptUrl,
        trackingNumber: orders.trackingNumber,
        deliveryDate: orders.deliveryDate,
        cancelReason: orders.cancelReason,
        rating: orders.rating,
        ratedAt: orders.ratedAt,
        returnReason: orders.returnReason,
        returnProofUrl: orders.returnProofUrl,
        returnDate: orders.returnDate,
      })
      .from(orders)
      .innerJoin(products, eq(orders.productId, products.id))
      .innerJoin(users, eq(products.sellerId, users.id))
      .leftJoin(sellerProfiles, eq(users.id, sellerProfiles.userId))
      .leftJoin(payments, eq(orders.id, payments.orderId))
      .where(eq(orders.buyerId, user.id))
      .orderBy(desc(orders.createdAt));

    const unreadChats = await db
      .select({
        orderId: chatMessages.orderId,
        count: sql<number>`count(*)`.as('count'),
      })
      .from(chatMessages)
      .where(and(
        eq(chatMessages.isRead, false),
        ne(chatMessages.senderId, user.id)
      ))
      .groupBy(chatMessages.orderId);

    // Last message time per order
    const lastMessages = await db
      .select({
        orderId: chatMessages.orderId,
        lastAt: sql<number>`max(${chatMessages.createdAt})`.as('lastAt'),
      })
      .from(chatMessages)
      .groupBy(chatMessages.orderId);

    const lastMessageMap: Record<string, Date | null> = lastMessages.reduce((acc, row) => {
      acc[row.orderId] = row.lastAt ? new Date((row.lastAt as number) * 1000) : null;
      return acc;
    }, {} as Record<string, Date | null>);

    unreadCounts = unreadChats.reduce((acc, row) => {
      acc[row.orderId] = Number(row.count);
      return acc;
    }, {} as Record<string, number>);

    // Find if the seller has sent an approval or rejection for the orders
    const negotiationMessages = await db.select({
      orderId: chatMessages.orderId,
      text: chatMessages.text,
      createdAt: chatMessages.createdAt
    }).from(chatMessages)
      .innerJoin(users, eq(chatMessages.senderId, users.id))
      .where(and(
        eq(users.role, 'penjual'),
        sql`${chatMessages.text} LIKE '%SETUJUI%' OR ${chatMessages.text} LIKE '%belum dapat kami setujui%'`
      ))
      .orderBy(desc(chatMessages.createdAt));

    const negotiationMap: Record<string, 'approved' | 'rejected'> = {};
    for (const msg of negotiationMessages) {
      if (!negotiationMap[msg.orderId]) {
        if (msg.text.includes('SETUJUI')) {
          negotiationMap[msg.orderId] = 'approved';
        } else if (msg.text.includes('belum dapat kami setujui')) {
          negotiationMap[msg.orderId] = 'rejected';
        }
      }
    }

    // Auto-verify waiting_verification orders via iPaymu check
    const waitingOrders = userOrders.filter(o => o.status === 'waiting_verification');
    if (waitingOrders.length > 0) {
      try {
        const { checkTransactionStatus, fulfillOrderPayment } = await import('@/lib/ipaymu');
        for (const wo of waitingOrders) {
          try {
            const verifyData = await checkTransactionStatus(wo.orderId);
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
                await fulfillOrderPayment(wo.orderId, proofStr);
                wo.status = 'verified';
                wo.paymentStatus = 'approved';
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

    const uniqueOrders = new Map<string, typeof userOrders[0]>();

    for (const order of userOrders) {
      const existing = uniqueOrders.get(order.orderId);
      if (!existing) {
        uniqueOrders.set(order.orderId, {
          ...order,
          unreadCount: unreadCounts[order.orderId] || 0,
          lastMessageAt: lastMessageMap[order.orderId] ?? null,
          negotiationStatus: negotiationMap[order.orderId] ?? null,
        });
      } else {
        if (order.paymentStatus === 'approved' && existing.paymentStatus !== 'approved') {
          uniqueOrders.set(order.orderId, {
            ...order,
            unreadCount: unreadCounts[order.orderId] || 0,
            lastMessageAt: lastMessageMap[order.orderId] ?? null,
            negotiationStatus: negotiationMap[order.orderId] ?? null,
          });
        }
      }
    }

    return NextResponse.json({ orders: Array.from(uniqueOrders.values()) });
  } catch (error) {
    console.error("Error fetching buyer orders:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
