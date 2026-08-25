import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chatMessages, orders } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getUserFromSession } from "@/lib/auth";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'pembeli') {
      return NextResponse.json({ error: "Silakan login sebagai pembeli terlebih dahulu untuk menggunakan fitur chat." }, { status: 401 });
    }

    const { productId, text, productOffer } = await request.json();
    if (!productId || !text) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Cek apakah sudah ada order chat_only atau order sungguhan untuk productId dan buyerId ini.
    // Jika belum ada order_id, kita buat mock order "chat_only"
    let orderRecord = await db.select()
      .from(orders)
      .where(and(eq(orders.productId, productId), eq(orders.buyerId, user.id)))
      .limit(1)
      .get();
      
    if (!orderRecord) {
      const newOrderId = `chat_order_${crypto.randomBytes(8).toString('hex')}`;
      await db.insert(orders).values({
        id: newOrderId,
        productId,
        buyerId: user.id,
        qty: 0,
        totalPrice: 0,
        status: 'chat_only',
        notes: 'Pre-sales chat thread'
      });
      
      orderRecord = { id: newOrderId } as any;
    }

    const orderId = orderRecord!.id;
    let finalMessage = text;

    if (productOffer) {
      const formattedPrice = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(productOffer.price || 0);
      finalMessage += `\n\n[PRODUK_OFFER|${productOffer.id}|${productOffer.name}|${formattedPrice}|${productOffer.image}]`;
    }
    
    await db.insert(chatMessages).values({
      id: `msg_${crypto.randomBytes(8).toString('hex')}`,
      orderId,
      senderId: user.id,
      text: finalMessage,
      isRead: false
    });

    return NextResponse.json({ success: true, orderId });
  } catch (error) {
    console.error("Presales Chat Error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
