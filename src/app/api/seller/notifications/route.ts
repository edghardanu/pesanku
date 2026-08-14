import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chatMessages, orders, products, users } from '@/lib/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { getUserFromSession } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'penjual') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Get new/incoming orders (waiting_verification)
    const newOrders = await db.select({
      id: orders.id,
      productName: products.name,
      buyerName: users.name,
      createdAt: orders.createdAt,
      status: orders.status,
      qty: orders.qty,
      totalPrice: orders.totalPrice,
    })
    .from(orders)
    .innerJoin(products, eq(orders.productId, products.id))
    .innerJoin(users, eq(orders.buyerId, users.id))
    .where(and(
      eq(products.sellerId, user.id),
      eq(orders.status, 'waiting_verification'),
      eq(orders.isRead, false)
    ))
    .orderBy(desc(orders.createdAt));

    // 2. Get unread chats (where seller is the owner of the product, and sender is NOT seller, and isRead is false)
    const unreadChats = await db.select({
      id: chatMessages.id,
      orderId: chatMessages.orderId,
      text: chatMessages.text,
      senderName: users.name,
      productName: products.name,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .innerJoin(orders, eq(chatMessages.orderId, orders.id))
    .innerJoin(products, eq(orders.productId, products.id))
    .innerJoin(users, eq(chatMessages.senderId, users.id))
    .where(and(
      eq(products.sellerId, user.id),
      eq(chatMessages.isRead, false),
      sql`${chatMessages.senderId} != ${user.id}`
    ))
    .orderBy(desc(chatMessages.createdAt));
    
    // 3. Get all chat threads for the "Chat Pembeli" menu
    const chatThreads = await db.select({
      orderId: orders.id,
      productName: products.name,
      buyerName: users.name,
      latestMessage: sql<string>`(SELECT text FROM ${chatMessages} WHERE order_id = ${orders.id} AND sender_id = ${users.id} ORDER BY created_at DESC LIMIT 1)`,
      latestMessageAt: sql<string>`(SELECT created_at FROM ${chatMessages} WHERE order_id = ${orders.id} AND sender_id = ${users.id} ORDER BY created_at DESC LIMIT 1)`,
      unreadCount: sql<number>`SUM(CASE WHEN ${chatMessages.isRead} = 0 AND ${chatMessages.senderId} != ${user.id} THEN 1 ELSE 0 END)`,
    })
    .from(orders)
    .innerJoin(products, eq(orders.productId, products.id))
    .innerJoin(users, eq(orders.buyerId, users.id))
    .innerJoin(chatMessages, eq(orders.id, chatMessages.orderId))
    .where(eq(products.sellerId, user.id))
    .groupBy(orders.id)
    .orderBy(desc(sql`MAX(${chatMessages.createdAt})`));

    return NextResponse.json({
      newOrders,
      unreadChats,
      chatThreads
    });
  } catch (error) {
    console.error('Notifications Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
