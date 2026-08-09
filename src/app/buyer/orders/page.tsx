import { db } from "@/lib/db";
import { orders, products, payments, sellerProfiles, users } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { getUserFromSession } from "@/lib/auth";
import ClientBuyerOrders from "@/components/ClientBuyerOrders";

export const dynamic = 'force-dynamic';

import { BuyerOrderViewItem } from "@/types";

export default async function BuyerOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; count?: string }>;
}) {
  const user = await getUserFromSession();
  const query = await searchParams;
  const parsedCheckoutCount = Number.parseInt(query.count || '', 10);
  const checkoutCount = user?.role === 'pembeli' && query.checkout === 'success' && Number.isInteger(parsedCheckoutCount)
    ? Math.min(Math.max(parsedCheckoutCount, 1), 50)
    : 0;

  let userOrders: BuyerOrderViewItem[] = [];
  
  if (user && user.role === 'pembeli') {
    // Fetch orders with product details and payment records
    userOrders = await db
      .select({
        orderId: orders.id,
        qty: orders.qty,
        totalPrice: orders.totalPrice,
        status: orders.status,
        notes: orders.notes,
        selectedVariant: orders.selectedVariant,
        selectedVariantPrice: orders.selectedVariantPrice,
        createdAt: orders.createdAt,
        productName: products.name,
        productImageUrl: products.imageUrl,
        storeName: sellerProfiles.storeName,
        minQty: products.minOrderQty,
        maxQty: products.maxOrderQty,
        processingTime: products.processingTime,
        paymentId: payments.id,
        paymentStatus: payments.verificationStatus,
        deliveryProofUrl: orders.deliveryProofUrl,
        rating: orders.rating,
        ratedAt: orders.ratedAt,
      })
      .from(orders)
      .innerJoin(products, eq(orders.productId, products.id))
      .innerJoin(users, eq(products.sellerId, users.id))
      .leftJoin(sellerProfiles, eq(users.id, sellerProfiles.userId))
      .leftJoin(payments, eq(orders.id, payments.orderId))
      .where(eq(orders.buyerId, user.id))
      .orderBy(desc(orders.createdAt));
  }

  return <ClientBuyerOrders orders={userOrders} user={user} checkoutCount={checkoutCount} />;
}
