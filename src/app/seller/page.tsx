import { db } from "@/lib/db";
import { products, sellerProfiles, orders, users, payments } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { getUserFromSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import ClientSellerDashboard from "@/components/ClientSellerDashboard";

export default async function SellerDashboard() {
  const user = await getUserFromSession();
  
  if (!user || user.role !== 'penjual') {
    redirect('/login');
  }

  // Fetch Seller Profile
  const profile = await db.select().from(sellerProfiles).where(eq(sellerProfiles.userId, user.id)).get();
  
  // Fetch Products
  const myProducts = await db.select().from(products)
    .where(eq(products.sellerId, user.id))
    .orderBy(desc(products.createdAt));

  // Fetch Seller Orders & Payments
  const sellerOrders = await db.select({
    id: orders.id,
    qty: orders.qty,
    totalPrice: orders.totalPrice,
    status: orders.status,
    createdAt: orders.createdAt,
    productName: products.name,
    buyerName: users.name,
    proofUrl: payments.proofUrl,
    deliveryProofUrl: orders.deliveryProofUrl,
  })
  .from(orders)
  .innerJoin(products, eq(orders.productId, products.id))
  .innerJoin(users, eq(orders.buyerId, users.id))
  .leftJoin(payments, eq(orders.id, payments.orderId))
  .where(eq(products.sellerId, user.id))
  .orderBy(desc(orders.createdAt));

  const activeCount = myProducts.filter(p => p.status === 'active' || p.status === 'draft').length;
  const waitingCount = myProducts.filter(p => p.status === 'draft' && (p.currentQty || 0) < (p.preorderMinQty || 1)).length;
  const completedCount = myProducts.filter(p => p.status === 'completed').length;

  return (
    <ClientSellerDashboard 
      profile={profile}
      myProducts={myProducts}
      activeCount={activeCount}
      waitingCount={waitingCount}
      completedCount={completedCount}
      userName={user.name}
      sellerOrders={sellerOrders}
    />
  );
}
