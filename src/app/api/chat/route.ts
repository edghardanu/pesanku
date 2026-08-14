import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chatMessages, orders, products, users } from "@/lib/schema";
import { and, asc, eq, ne } from "drizzle-orm";
import { getUserFromSession } from "@/lib/auth";
import crypto from "crypto";

async function getChatOrder(orderId: string) {
  return db
    .select({
      buyerId: orders.buyerId,
      productName: products.name,
      sellerId: products.sellerId,
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
    const orderId = searchParams.get("orderId");
    if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

    const user = await getUserFromSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (user) {
      // Mark messages not sent by standard user as read automatically
      const { and, not } = await import("drizzle-orm");
      await db.update(chatMessages)
        .set({ isRead: true })
        .where(
          and(
            eq(chatMessages.orderId, orderId),
            not(eq(chatMessages.senderId, user.id)),
            eq(chatMessages.isRead, false)
          )
        ).catch(() => {});
    }

    const orderData = await getChatOrder(orderId);
    if (!orderData) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (!canAccessChat(user.id, orderData)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existingMessage = await db
      .select({ id: chatMessages.id })
      .from(chatMessages)
      .where(eq(chatMessages.orderId, orderId))
      .get();

    if (!existingMessage) {
      // Auto-initialize chat with seller template!
      const msgId = `msg_${crypto.randomBytes(8).toString('hex')}`;
      await db.insert(chatMessages).values({
        id: msgId,
        orderId,
        senderId: orderData.sellerId,
        text: `Halo kak! Tadi kakak melakukan pemesanan untuk <b>${orderData.productName}</b> ya?`,
        isRead: false,
      });
    }

    // Membuka chat hanya menandai pesan dari lawan bicara sebagai telah dibaca.
    await db
      .update(chatMessages)
      .set({ isRead: true })
      .where(and(
        eq(chatMessages.orderId, orderId),
        ne(chatMessages.senderId, user.id),
        eq(chatMessages.isRead, false),
      ));

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
      .where(eq(chatMessages.orderId, orderId))
      .orderBy(asc(chatMessages.createdAt));

    return NextResponse.json({ messages });
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

    const msgId = `msg_${crypto.randomBytes(8).toString('hex')}`;
    
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
