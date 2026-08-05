import { db } from "@/lib/db";
import { orders, products, payments, sellerProfiles, users } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { getUserFromSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import ClientBuyerOrders from "@/components/ClientBuyerOrders";

export const dynamic = 'force-dynamic';

export default async function BuyerOrdersPage() {
  const user = await getUserFromSession();
  
  if (!user || user.role !== 'pembeli') {
    redirect('/login');
  }

  // Fetch orders with product details and payment records
  const userOrders = await db
    .select({
      orderId: orders.id,
      qty: orders.qty,
      totalPrice: orders.totalPrice,
      status: orders.status,
      createdAt: orders.createdAt,
      productName: products.name,
      productImageUrl: products.imageUrl,
      storeName: sellerProfiles.storeName,
      paymentId: payments.id,
      paymentStatus: payments.verificationStatus,
    })
    .from(orders)
    .innerJoin(products, eq(orders.productId, products.id))
    .innerJoin(users, eq(products.sellerId, users.id))
    .leftJoin(sellerProfiles, eq(users.id, sellerProfiles.userId))
    .leftJoin(payments, eq(orders.id, payments.orderId))
    .where(eq(orders.buyerId, user.id))
    .orderBy(desc(orders.createdAt));

  return <ClientBuyerOrders orders={userOrders} />;
}
