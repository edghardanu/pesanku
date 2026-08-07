import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, products } from "@/lib/schema";
import { getUserFromSession } from "@/lib/auth";
import crypto from "crypto";
import { eq, and, sql } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'pembeli') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { productId } = await request.json();
    if (!productId) {
      return NextResponse.json({ error: "Missing productId" }, { status: 400 });
    }

    // Get product details
    const product = await db.select().from(products).where(eq(products.id, productId)).get();
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const orderId = `ORD-${Date.now().toString().slice(-6)}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const initialQty = product.preorderMinQty || 1;

    // Create order
    await db.insert(orders).values({
      id: orderId,
      productId: product.id,
      buyerId: user.id,
      qty: initialQty,
      totalPrice: product.price * initialQty,
      status: "waiting_verification",
    });

    return NextResponse.json({ success: true, orderId });
  } catch (error) {
    console.error("Order creation error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'pembeli') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const unreadOrders = await db.select().from(orders).where(
      and(
        eq(orders.buyerId, user.id),
        eq(orders.isRead, false)
      )
    );

    const activeOrders = await db.select().from(orders).where(
      and(
        eq(orders.buyerId, user.id),
        sql`${orders.status} != 'completed' AND ${orders.status} != 'cancelled'`
      )
    );

    return NextResponse.json({ 
      count: unreadOrders.length,
      hasActiveOrder: activeOrders.length > 0 
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'pembeli') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    await db.update(orders)
      .set({ isRead: true })
      .where(eq(orders.buyerId, user.id));
      
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
