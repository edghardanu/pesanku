import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, products, users, payments } from '@/lib/schema';
import { getUserFromSession } from '@/lib/auth';
import { and, eq, desc, ne, sql } from 'drizzle-orm';

export async function GET() {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'penjual') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sellerOrders = await db.select({
      id: orders.id,
      productId: orders.productId,
      qty: orders.qty,
      totalPrice: orders.totalPrice,
      status: orders.status,
      notes: orders.notes,
      selectedVariant: orders.selectedVariant,
      selectedVariantPrice: orders.selectedVariantPrice,
      createdAt: orders.createdAt,
      productName: products.name,
      buyerName: users.name,
      buyerPhone: users.phone,
      buyerAddress: sql<string>`COALESCE(${orders.deliveryAddress}, ${users.address})`.as('buyerAddress'),
      requestedDeliveryDate: orders.deliveryDate,
      proofUrl: payments.proofUrl,
      deliveryProofUrl: orders.deliveryProofUrl,
      dispatchReceiptUrl: orders.dispatchReceiptUrl,
      adminSplitAmount: orders.adminSplitAmount,
      sellerSplitAmount: orders.sellerSplitAmount,
    })
    .from(orders)
    .innerJoin(products, eq(orders.productId, products.id))
    .innerJoin(users, eq(orders.buyerId, users.id))
    .leftJoin(payments, eq(orders.id, payments.orderId))
    .where(and(eq(products.sellerId, user.id), ne(orders.status, 'chat_only')))
    .orderBy(desc(orders.createdAt));

    return NextResponse.json({ orders: sellerOrders });
  } catch (error) {
    console.error('Seller orders fetch error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
