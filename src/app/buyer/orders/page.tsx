import { db } from "@/lib/db";
import { orders, products, payments, sellerProfiles, users, settings } from "@/lib/schema";
import { eq, desc, ne, and } from "drizzle-orm";
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
  let unreadCounts: Record<string, number> = {};

  let fullUser = null;
  if (user) {
    const dbUser = await db.select().from(users).where(eq(users.id, user.id)).get();
    fullUser = {
      ...user,
      address: dbUser?.address || '',
      phone: dbUser?.phone || ''
    };
  }

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
        productId: products.id,
        productName: products.name,
        productImageUrl: products.imageUrl,
        storeName: sellerProfiles.storeName,
        sellerId: products.sellerId,
        minQty: products.minOrderQty,
        maxQty: products.maxOrderQty,
        processingTime: products.processingTime,
        paymentId: payments.id,
        paymentStatus: payments.verificationStatus,
        paymentProofUrl: payments.proofUrl,
        deliveryProofUrl: orders.deliveryProofUrl,
        dispatchReceiptUrl: orders.dispatchReceiptUrl,
        cancelReason: orders.cancelReason,
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

    // Fetch unread chat counts
    const { chatMessages } = await import('@/lib/schema');
    const { sql } = await import('drizzle-orm');

    const unreadChats = await db
      .select({
        orderId: chatMessages.orderId,
        count: sql<number>`count(*)`.as('count'),
      })
      .from(chatMessages)
      .where(and(
        eq(chatMessages.isRead, false),
        ne(chatMessages.senderId, user.id)
      ))
      .groupBy(chatMessages.orderId);

    unreadCounts = unreadChats.reduce((acc, row) => {
      acc[row.orderId] = Number(row.count);
      return acc;
    }, {} as Record<string, number>);

    // Fetch negotiation statuses
    const negotiationMessages = await db.select({
      orderId: chatMessages.orderId,
      text: chatMessages.text,
      createdAt: chatMessages.createdAt
    }).from(chatMessages)
      .innerJoin(users, eq(chatMessages.senderId, users.id))
      .where(and(
        eq(users.role, 'penjual'),
        sql`${chatMessages.text} LIKE '%SETUJUI%' OR ${chatMessages.text} LIKE '%belum dapat kami setujui%'`
      ))
      .orderBy(desc(chatMessages.createdAt));

    const negotiationMap: Record<string, 'approved' | 'rejected'> = {};
    for (const msg of negotiationMessages) {
      if (!negotiationMap[msg.orderId]) {
        if (msg.text.includes('SETUJUI')) {
          negotiationMap[msg.orderId] = 'approved';
        } else if (msg.text.includes('belum dapat kami setujui')) {
          negotiationMap[msg.orderId] = 'rejected';
        }
      }
    }

    userOrders = userOrders.map(order => ({
      ...order,
      unreadCount: unreadCounts[order.orderId] || 0,
      negotiationStatus: negotiationMap[order.orderId] ?? null
    }));
  }

  const allSettings = await db.select().from(settings).all();
  let penaltyPercentage = 0;
  let checkoutFees: any[] = [];
  let hasCustomFees = false;
  
  let adminPen = 0;
  let sellerPen = 0;
  let legacyPen = 0;
  let hasNewPenalties = false;
  let penaltyDays = 1;

  allSettings.forEach((f) => {
    if (f.key === "penalty_percentage_admin") { adminPen = parseInt(f.value); hasNewPenalties = true; }
    if (f.key === "penalty_percentage_seller") { sellerPen = parseInt(f.value); hasNewPenalties = true; }
    if (f.key === "penalty_percentage") legacyPen = parseInt(f.value);
    if (f.key === "penalty_days") penaltyDays = parseInt(f.value);
    if (f.key === 'checkout_fees_config') {
      try {
          checkoutFees = JSON.parse(f.value);
          hasCustomFees = true;
      } catch(e) {}
    }
  });

  penaltyPercentage = hasNewPenalties ? (adminPen + sellerPen) : legacyPen;

  if (!hasCustomFees) {
      let feeApp = 0, feeJasa = 0, feeAdmin = 0;
      allSettings.forEach((f) => {
          if (f.key === "fee_aplikasi") feeApp = parseInt(f.value);
          if (f.key === "fee_jasa") feeJasa = parseInt(f.value);
          if (f.key === "fee_admin") feeAdmin = parseInt(f.value);
      });
      checkoutFees = [];
      if (feeApp || feeApp === 0) checkoutFees.push({ id: 'aplikasi', name: 'Biaya Aplikasi', value: feeApp, description: 'Dibebankan kepada pembeli pada saat checkout dan ikut dipotong dari hasil saldo bersih penjual.' });
      if (feeJasa || feeJasa === 0) checkoutFees.push({ id: 'jasa', name: 'Biaya Jasa', value: feeJasa, description: 'Dibebankan kepada pembeli pada saat checkout dan ikut dipotong dari saldo bersih penjual.' });
      if (feeAdmin || feeAdmin === 0) checkoutFees.push({ id: 'admin', name: 'Biaya Admin', value: feeAdmin, description: 'Dibebankan kepada pembeli pada saat checkout dan ikut dipotong dari hasil saldo bersih penjual.' });
  }

  return <ClientBuyerOrders orders={userOrders} user={fullUser} checkoutCount={checkoutCount} checkoutFees={checkoutFees} penaltyPercentage={penaltyPercentage} penaltyDays={penaltyDays} />;
}
