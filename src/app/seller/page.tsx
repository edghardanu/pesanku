import { db } from "@/lib/db";
import { products, sellerProfiles, orders, users, payments, settings, productPromotions, promotionOffers } from "@/lib/schema";
import { and, eq, desc, gt, sql, ne } from "drizzle-orm";
import { getUserFromSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import ClientSellerDashboard from "@/components/ClientSellerDashboard";
import { OrderItem } from "@/types";
import { parseStoredProductVariants } from "@/lib/productVariants";

export const dynamic = 'force-dynamic';

export default async function SellerDashboard() {
  const user = await getUserFromSession();

  if (!user || user.role !== 'penjual') {
    redirect('/login');
  }

  // Fetch Seller Profile
  const profile = await db.select().from(sellerProfiles).where(eq(sellerProfiles.userId, user.id)).get();

  // Fetch Products
  const rawProducts = await db.select().from(products)
    .where(eq(products.sellerId, user.id))
    .orderBy(desc(products.createdAt));
  const myProducts = rawProducts.map(({ variantsJson, ...product }) => ({
    ...product,
    variants: parseStoredProductVariants(variantsJson),
  }));

  // Fetch Seller Orders & Payments
  const sellerOrdersWithDetails = await db.select({
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
    isRead: orders.isRead,
  })
    .from(orders)
    .innerJoin(products, eq(orders.productId, products.id))
    .innerJoin(users, eq(orders.buyerId, users.id))
    .leftJoin(payments, eq(orders.id, payments.orderId))
    .where(and(eq(products.sellerId, user.id), ne(orders.status, 'chat_only')))
    .orderBy(desc(orders.createdAt));

  const activeCount = myProducts.filter(p => p.status === 'active' || p.status === 'draft').length;
  const waitingCount = myProducts.filter(p => p.status === 'draft' && (p.currentQty || 0) < (p.preorderMinQty || 1)).length;
  const completedCount = myProducts.filter(p => p.status === 'completed').length;

  const feeSettings = await db.select().from(settings).all();
  let feeAdmin = 0;
  let feeAplikasi = 0;
  let feeJasa = 0;
  let penaltyPercentage = 10;
  feeSettings.forEach(f => {
    if (f.key === "fee_admin") feeAdmin = parseInt(f.value);
    if (f.key === "fee_aplikasi") feeAplikasi = parseInt(f.value);
    if (f.key === "fee_jasa") feeJasa = parseInt(f.value);
    if (f.key === "penalty_percentage") penaltyPercentage = parseInt(f.value);
  });

  const schedulePrefix = `preorder_schedule:${user.id}:`;
  const scheduleByOrder = new Map<string, Pick<OrderItem, 'deliveryDate' | 'fulfillmentStatus' | 'scheduleReason' | 'scheduleUpdatedAt'>>();
  feeSettings.forEach((setting) => {
    if (!setting.key.startsWith(schedulePrefix)) return;

    try {
      const parsed = JSON.parse(setting.value) as {
        deliveryDate?: unknown;
        fulfillmentStatus?: unknown;
        scheduleReason?: unknown;
        updatedAt?: unknown;
      };
      const validStatuses = ['scheduled', 'preparing', 'ready', 'shipped', 'delivered'];
      if (typeof parsed.deliveryDate !== 'string' || !validStatuses.includes(String(parsed.fulfillmentStatus))) return;

      scheduleByOrder.set(setting.key.slice(schedulePrefix.length), {
        deliveryDate: parsed.deliveryDate,
        fulfillmentStatus: parsed.fulfillmentStatus as OrderItem['fulfillmentStatus'],
        scheduleReason: typeof parsed.scheduleReason === 'string' && parsed.scheduleReason.trim()
          ? parsed.scheduleReason.trim()
          : null,
        scheduleUpdatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
      });
    } catch {
      // Ignore malformed legacy schedule metadata.
    }
  });

  const sellerOrders: OrderItem[] = sellerOrdersWithDetails.map((order) => ({
    ...order,
    ...scheduleByOrder.get(order.id),
  }));

  const sellerPromotionOffers = await db.select({
    id: promotionOffers.id,
    name: promotionOffers.name,
    price: promotionOffers.price,
    expiresAt: promotionOffers.expiresAt,
    isActive: promotionOffers.isActive,
    createdAt: promotionOffers.createdAt,
  })
    .from(promotionOffers)
    .where(and(eq(promotionOffers.isActive, true), gt(promotionOffers.expiresAt, new Date())))
    .orderBy(desc(promotionOffers.createdAt));

  const sellerPromotionRequests = await db.select({
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
    .where(eq(productPromotions.sellerId, user.id))
    .orderBy(desc(productPromotions.requestedAt));

  return (
    <ClientSellerDashboard
      profile={profile ?? undefined}
      myProducts={myProducts}
      activeCount={activeCount}
      waitingCount={waitingCount}
      completedCount={completedCount}
      userName={user.name}
      sellerOrders={sellerOrders}
      feeAdmin={feeAdmin}
      feeAplikasi={feeAplikasi}
      feeJasa={feeJasa}
      promotionOffers={sellerPromotionOffers}
      promotionRequests={sellerPromotionRequests}
      userEmail={user.email}
      penaltyPercentage={penaltyPercentage}
    />
  );
}
