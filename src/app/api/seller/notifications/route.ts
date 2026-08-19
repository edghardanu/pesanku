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
    // We use JS grouping to avoid unsupported raw SQL subquery bugs and schema inconsistencies
    const allChats = await db.select({
      id: chatMessages.id,
      orderId: chatMessages.orderId,
      text: chatMessages.text,
      isRead: chatMessages.isRead,
      senderId: chatMessages.senderId,
      createdAt: chatMessages.createdAt,
      productName: products.name,
      buyerName: users.name,
      qty: orders.qty,
      totalPrice: orders.totalPrice,
      buyerId: orders.buyerId,
    })
    .from(chatMessages)
    .innerJoin(orders, eq(chatMessages.orderId, orders.id))
    .innerJoin(products, eq(orders.productId, products.id))
    .innerJoin(users, eq(orders.buyerId, users.id))
    .where(eq(products.sellerId, user.id))
    .orderBy(desc(chatMessages.createdAt));

    const threadsMap = new Map();
    allChats.forEach(chat => {
      if (!threadsMap.has(chat.buyerId)) {
        threadsMap.set(chat.buyerId, {
          orderId: chat.orderId,
          productName: chat.productName,
          buyerName: chat.buyerName,
          qty: chat.qty,
          totalPrice: chat.totalPrice,
          latestMessage: chat.text,
          latestMessageAt: chat.createdAt,
          unreadCount: 0
        });
      }
      if (!chat.isRead && chat.senderId !== user.id) {
        threadsMap.get(chat.buyerId).unreadCount++;
      }
    });

    const chatThreads = Array.from(threadsMap.values());

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
