import { db } from "@/lib/db";
import { productPromotions, promotionOffers, products, users, orders, sellerProfiles } from "@/lib/schema";
import { eq, sql, desc } from "drizzle-orm";
import { getUserFromSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import ClientAdminDashboard from "@/components/ClientAdminDashboard";

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const user = await getUserFromSession();
  
  if (!user || user.role !== 'admin') {
    redirect('/login');
  }

  // Fetch Stats
  const usersCountResult = await db.select({ count: sql<number>`count(*)` }).from(users).get();
  const sellersCountResult = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, 'penjual')).get();
  const ordersCountResult = await db.select({ count: sql<number>`count(*)` }).from(orders).get();
  const escrowResult = await db.select({ total: sql<number>`sum(${orders.totalPrice})` }).from(orders).where(eq(orders.status, 'verified')).get();

  const stats = {
    totalUsers: usersCountResult?.count || 0,
    totalSellers: sellersCountResult?.count || 0,
    totalOrders: ordersCountResult?.count || 0,
    escrowBalance: escrowResult?.total || 0,
  };

  // Fetch UMKM List
  const umkmList = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    phone: users.phone,
    status: users.status,
    storeName: sellerProfiles.storeName,
    address: sellerProfiles.address,
    category: sellerProfiles.category,
    createdAt: users.createdAt,
  })
  .from(users)
  .leftJoin(sellerProfiles, eq(users.id, sellerProfiles.userId))
  .where(eq(users.role, 'penjual'))
  .orderBy(desc(users.createdAt));

  // Fetch Real Orders for Chart & Realtime analytics
  const ordersList = await db.select({
    id: orders.id,
    qty: orders.qty,
    totalPrice: orders.totalPrice,
    status: orders.status,
    createdAt: orders.createdAt,
  })
  .from(orders)
  .orderBy(desc(orders.createdAt));

  const adminPromotionOffers = await db.select({
    id: promotionOffers.id,
    name: promotionOffers.name,
    price: promotionOffers.price,
    expiresAt: promotionOffers.expiresAt,
    isActive: promotionOffers.isActive,
    createdAt: promotionOffers.createdAt,
  })
    .from(promotionOffers)
    .orderBy(desc(promotionOffers.createdAt));

  const promotionRequests = await db.select({
    id: productPromotions.id,
    promotionId: productPromotions.promotionId,
    productId: productPromotions.productId,
    sellerId: productPromotions.sellerId,
    status: productPromotions.status,
    requestedAt: productPromotions.requestedAt,
    reviewedAt: productPromotions.reviewedAt,
    offerName: promotionOffers.name,
    offerPrice: promotionOffers.price,
    expiresAt: promotionOffers.expiresAt,
    productName: products.name,
    storeName: sellerProfiles.storeName,
  })
    .from(productPromotions)
    .innerJoin(promotionOffers, eq(productPromotions.promotionId, promotionOffers.id))
    .innerJoin(products, eq(productPromotions.productId, products.id))
    .leftJoin(sellerProfiles, eq(productPromotions.sellerId, sellerProfiles.userId))
    .orderBy(desc(productPromotions.requestedAt));

  return (
    <ClientAdminDashboard 
      stats={stats}
      userName={user.name}
      umkmList={umkmList}
      ordersList={ordersList}
      promotionOffers={adminPromotionOffers}
      promotionRequests={promotionRequests}
    />
  );
}
