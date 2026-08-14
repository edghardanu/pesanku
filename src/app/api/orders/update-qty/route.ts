import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, products } from "@/lib/schema";
import { getUserFromSession } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'pembeli') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId, qty } = await request.json();
    if (!orderId || typeof qty !== 'number' || qty < 1) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    // Get order details
    const orderObj = await db.select().from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.buyerId, user.id)))
      .get();

    if (!orderObj) {
      return NextResponse.json({ error: "Order not found or unauthorized" }, { status: 404 });
    }

    // Get product details to check minimum/maximum order limits and price
    const product = await db.select().from(products)
      .where(eq(products.id, orderObj.productId))
      .get();

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Limit checks removed

    const unitPrice = orderObj.selectedVariantPrice ?? product.price;
    const newTotalPrice = unitPrice * qty;

    // Update order quantity and total price
    await db.update(orders)
      .set({
        qty,
        totalPrice: newTotalPrice
      })
      .where(eq(orders.id, orderId));

    return NextResponse.json({ success: true, totalPrice: newTotalPrice });
  } catch (error) {
    console.error("Update order qty error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
