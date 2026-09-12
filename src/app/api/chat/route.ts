import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chatMessages, orders, products, users } from "@/lib/schema";
import { and, asc, eq, ne, inArray, not, isNull } from "drizzle-orm";
import { getUserFromSession } from "@/lib/auth";
import crypto from "crypto";

async function getChatOrder(orderId: string) {
  return db
    .select({
      buyerId: orders.buyerId,
      productId: orders.productId,
      productName: products.name,
      sellerId: products.sellerId,
      status: orders.status,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .innerJoin(products, eq(orders.productId, products.id))
    .where(eq(orders.id, orderId))
    .get();
}

function canAccessChat(userId: string, order: { buyerId: string; sellerId: string }) {
  return userId === order.buyerId || userId === order.sellerId;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderIdParam = searchParams.get("orderId");
    const orderIdsParam = searchParams.get("orderIds");
    
    let orderIds: string[] = [];
    if (orderIdsParam) orderIds = orderIdsParam.split(',').map(s => s.trim()).filter(Boolean);
    else if (orderIdParam) orderIds = [orderIdParam];
    
    if (orderIds.length === 0) return NextResponse.json({ error: "orderId required" }, { status: 400 });

    const user = await getUserFromSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const firstOrderData = await getChatOrder(orderIds[0]);
    if (!firstOrderData) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (!canAccessChat(user.id, firstOrderData)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Now we have logic to query messages cross all requested orderIds in a Unified Chat context

    // Membuka chat hanya menandai pesan dari lawan bicara sebagai telah dibaca.
    if (user && orderIds.length > 0) {
      await db
        .update(chatMessages)
        .set({ isRead: true })
        .where(
          and(
            inArray(chatMessages.orderId, orderIds),
            ne(chatMessages.senderId, user.id),
            eq(chatMessages.isRead, false)
          )
        ).catch(() => { });
    }



    const messages = await db
      .select({
        id: chatMessages.id,
        text: chatMessages.text,
        senderId: chatMessages.senderId,
        createdAt: chatMessages.createdAt,
        isRead: chatMessages.isRead,
        role: users.role,
      })
      .from(chatMessages)
      .innerJoin(users, eq(chatMessages.senderId, users.id))
      .where(inArray(chatMessages.orderId, orderIds))
      .orderBy(asc(chatMessages.createdAt));

    return NextResponse.json({ messages, status: firstOrderData.status, productId: firstOrderData.productId });
  } catch (error) {
    console.error("Failed to load chat:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { orderId, text } = await request.json();
    if (!orderId || !text) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const orderData = await getChatOrder(orderId);
    if (!orderData) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (!canAccessChat(user.id, orderData)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Strict isolation: chat belongs exclusively to this single order
    const orderIds = [orderId];

    const msgId = `msg_${crypto.randomBytes(8).toString('hex')}`;

    // Insert for all order components inside the grouped checkout so they share it physically
    // or just insert onto the current order branch (other chat fetches will read from it globally via the same union logic)
    await db.insert(chatMessages).values({
      id: msgId,
      orderId,
      senderId: user.id,
      text,
      isRead: false,
    });

    return NextResponse.json({ success: true, id: msgId, isRead: false });
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getUserFromSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, text } = await request.json();
    if (!id || !text) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const existingMsg = await db.select().from(chatMessages).where(eq(chatMessages.id, id)).get();
    if (!existingMsg || existingMsg.senderId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await db.update(chatMessages).set({ text }).where(eq(chatMessages.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getUserFromSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const existingMsg = await db.select().from(chatMessages).where(eq(chatMessages.id, id)).get();
    if (!existingMsg || (existingMsg.senderId !== user.id && user.role !== 'admin')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await db.delete(chatMessages).where(eq(chatMessages.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
