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
        productName: products.name,
        productImageUrl: products.imageUrl,
        storeName: sellerProfiles.storeName,
        sellerId: products.sellerId,
        minQty: products.minOrderQty,
        maxQty: products.maxOrderQty,
        processingTime: products.processingTime,
        paymentId: payments.id,
        paymentStatus: payments.verificationStatus,
        deliveryProofUrl: orders.deliveryProofUrl,
        dispatchReceiptUrl: orders.dispatchReceiptUrl,
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

    userOrders = userOrders.map(order => ({
      ...order,
      unreadCount: unreadCounts[order.orderId] || 0,
      lastMessageAt: lastMessageMap[order.orderId] ?? null,
    }));

    return NextResponse.json({ orders: userOrders });
  } catch (error) {
    console.error("Error fetching buyer orders:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
