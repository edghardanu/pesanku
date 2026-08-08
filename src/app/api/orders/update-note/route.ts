import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders } from "@/lib/schema";
import { getUserFromSession } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'pembeli') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId, notes } = await request.json();
    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    // Make sure the order belongs to this buyer
    const order = await db.select().from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.buyerId, user.id)))
      .get();

    if (!order) {
      return NextResponse.json({ error: "Order not found or unauthorized" }, { status: 404 });
    }

    await db.update(orders)
      .set({ notes: notes ?? null })
      .where(eq(orders.id, orderId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update note error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
