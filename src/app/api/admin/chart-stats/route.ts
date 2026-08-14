import { db } from "@/lib/db";
import { users, orders, products, sellerProfiles } from "@/lib/schema";
import { eq, ne, sql, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const usersCountResult = await db.select({ count: sql<number>`count(*)` }).from(users).get();
    const sellersCountResult = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, 'penjual')).get();
    const ordersCountResult = await db.select({ count: sql<number>`count(*)` }).from(orders).where(ne(orders.status, 'chat_only')).get();
    const escrowResult = await db.select({ total: sql<number>`sum(${orders.totalPrice})` }).from(orders).where(eq(orders.status, 'verified')).get();

    const ordersList = await db.select({
      id: orders.id,
      qty: orders.qty,
      totalPrice: orders.totalPrice,
      status: orders.status,
      notes: orders.notes,
      selectedVariant: orders.selectedVariant,
      deliveryDate: orders.deliveryDate,
      deliveryAddress: orders.deliveryAddress,
      adminSplitAmount: orders.adminSplitAmount,
      sellerSplitAmount: orders.sellerSplitAmount,
      createdAt: orders.createdAt,
      productName: products.name,
      storeName: sellerProfiles.storeName,
      buyerName: users.name,
      buyerPhone: users.phone,
      buyerAddress: users.address,
    })
    .from(orders)
    .leftJoin(products, eq(orders.productId, products.id))
    .leftJoin(sellerProfiles, eq(products.sellerId, sellerProfiles.userId))
    .leftJoin(users, eq(orders.buyerId, users.id))
    .where(ne(orders.status, 'chat_only'))
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
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Terjadi kesalahan.';
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
