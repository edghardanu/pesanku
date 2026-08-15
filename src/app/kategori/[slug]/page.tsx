import { db } from "@/lib/db";
import { orders, productPromotions, products, promotionOffers, sellerProfiles, users } from "@/lib/schema";
import { and, desc, eq, gt, isNotNull, sql } from "drizzle-orm";
import ClientHome from "@/components/ClientHome";
import { getUserFromSession } from "@/lib/auth";
import { retryDatabaseRead } from "@/lib/retry-database-read";

export const dynamic = 'force-dynamic';

import { ProductItem } from "@/types";

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug).replace(/-/g, ' '); // E.g., 'Makanan Berat'
  
  const user = await getUserFromSession();
  let dbProducts: ProductItem[] = [];

  try {
    // Fetch real products from database with seller details
    const rawProducts = await retryDatabaseRead(async () => db
      .select({
        id: products.id,
        name: products.name,
        price: products.price,
        description: products.description,
        imageUrl: products.imageUrl,
        sellerId: products.sellerId,
        minQty: products.preorderMinQty,
        currentQty: products.currentQty,
        minOrderQty: products.minOrderQty,
        maxOrderQty: products.maxOrderQty,
        processingTime: products.processingTime,
        batchCategory: products.batchCategory,
        deadlineDate: products.deadlineDate,
        status: products.status,
        createdAt: products.createdAt,
        sellerName: sellerProfiles.storeName,
        storeName: sellerProfiles.storeName,
        sellerAddress: sellerProfiles.address,
        storeAddress: sellerProfiles.address,
        sellerAvatar: sellerProfiles.logoUrl,
        sellerLogoUrl: sellerProfiles.logoUrl,
        sellerApprovalStatus: sellerProfiles.approvalStatus,
        sellerPhone: users.phone,
      })
      .from(products)
      .innerJoin(sellerProfiles, eq(products.sellerId, sellerProfiles.userId))
      .innerJoin(users, eq(products.sellerId, users.id))
      .orderBy(desc(products.createdAt)));

    const ratingsByProduct = new Map<string, { averageRating: number; ratingCount: number }>();
    try {
      const productRatings = await retryDatabaseRead(async () => db
        .select({
          productId: orders.productId,
          averageRating: sql<number>`AVG(${orders.rating})`,
          ratingCount: sql<number>`COUNT(${orders.rating})`,
        })
        .from(orders)
        .where(isNotNull(orders.rating))
        .groupBy(orders.productId));

      productRatings.forEach((item) => ratingsByProduct.set(item.productId, {
        averageRating: Number(item.averageRating) || 0,
        ratingCount: Number(item.ratingCount) || 0,
      }));
    } catch (error) {
      console.error('Database error while fetching category ratings:', error);
    }

    const promotionsByProduct = new Map<string, { expiresAt: Date }>();
    try {
      const activePromotions = await retryDatabaseRead(async () => db.select({
        productId: productPromotions.productId,
        expiresAt: promotionOffers.expiresAt,
      })
        .from(productPromotions)
        .innerJoin(promotionOffers, eq(productPromotions.promotionId, promotionOffers.id))
        .where(and(
          eq(productPromotions.status, 'approved'),
          eq(promotionOffers.isActive, true),
          gt(promotionOffers.expiresAt, new Date()),
        )));
      activePromotions.forEach((promotion) => promotionsByProduct.set(promotion.productId, promotion));
    } catch (error) {
      console.error('Database error while fetching category promotions:', error);
    }

    // Provide a fallback avatar for sellers without a profile image.
    dbProducts = rawProducts.map(p => ({
      ...p,
      sellerAvatar: p.sellerAvatar || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop",
      averageRating: ratingsByProduct.get(p.id)?.averageRating || 0,
      ratingCount: ratingsByProduct.get(p.id)?.ratingCount || 0,
      isPromoted: promotionsByProduct.has(p.id),
      promotionLabel: promotionsByProduct.has(p.id) ? 'Paling Populer' : null,
      promotionExpiresAt: promotionsByProduct.get(p.id)?.expiresAt ?? null,
    })).sort((first, second) => Number(Boolean(second.isPromoted)) - Number(Boolean(first.isPromoted)));
  } catch (error) {
    console.error("Database error while fetching products on category page:", error);
  }

  return <ClientHome initialProducts={dbProducts} user={user} categoryFilter={decodedSlug} />;
}
