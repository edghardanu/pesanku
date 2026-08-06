import { db } from "@/lib/db";
import { users, orders } from "@/lib/schema";
import { eq, sql, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const usersCountResult = await db.select({ count: sql<number>`count(*)` }).from(users).get();
    const sellersCountResult = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, 'penjual')).get();
    const ordersCountResult = await db.select({ count: sql<number>`count(*)` }).from(orders).get();
    const escrowResult = await db.select({ total: sql<number>`sum(${orders.totalPrice})` }).from(orders).where(eq(orders.status, 'verified')).get();

    const ordersList = await db.select({
      id: orders.id,
      qty: orders.qty,
      totalPrice: orders.totalPrice,
      status: orders.status,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .orderBy(desc(orders.createdAt));

    return NextResponse.json({
      stats: {
        totalUsers: usersCountResult?.count || 0,
        totalSellers: sellersCountResult?.count || 0,
        totalOrders: ordersCountResult?.count || 0,
        escrowBalance: escrowResult?.total || 0,
      },
      ordersList: ordersList.map(o => ({
        ...o,
        createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : new Date().toISOString()
      }))
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
