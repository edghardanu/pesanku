import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chatMessages, users } from "@/lib/schema";
import { eq, asc } from "drizzle-orm";
import { getUserFromSession } from "@/lib/auth";
import crypto from "crypto";

export async function GET(request: Request) {
  try {
    const user = await getUserFromSession();
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");
    if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

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

    if (messages.length === 0) {
      // Auto-initialize chat with seller template!
      const { orders, products } = await import("@/lib/schema");
      
      const orderData = await db
        .select({
          productName: products.name,
          sellerId: products.sellerId
        })
        .from(orders)
        .innerJoin(products, eq(orders.productId, products.id))
        .where(eq(orders.id, orderId))
        .get();

      if (orderData) {
        const msgId = `msg_${crypto.randomBytes(8).toString('hex')}`;
        await db.insert(chatMessages).values({
          id: msgId,
          orderId,
          senderId: orderData.sellerId,
          text: `Halo kak! Tadi kakak melakukan pemesanan untuk <b>${orderData.productName}</b> ya?`,
          isRead: false,
        });

        // Re-fetch the newly inserted message
        const newMessages = await db
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
          
        return NextResponse.json({ messages: newMessages });
      }
    }

    return NextResponse.json({ messages });
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { orderId, text } = await request.json();
    if (!orderId || !text) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const msgId = `msg_${crypto.randomBytes(8).toString('hex')}`;
    
    await db.insert(chatMessages).values({
      id: msgId,
      orderId,
      senderId: user.id,
      text,
    });

    return NextResponse.json({ success: true, id: msgId });
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
