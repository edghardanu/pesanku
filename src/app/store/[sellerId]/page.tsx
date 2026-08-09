import { desc, eq, isNotNull, sql } from 'drizzle-orm';
import { notFound } from 'next/navigation';

import ClientStoreProfile from '@/components/ClientStoreProfile';
import { getUserFromSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { orders, products, sellerProfiles, users } from '@/lib/schema';
import { parseStoredProductVariants } from '@/lib/productVariants';

export const dynamic = 'force-dynamic';

export default async function StoreProfilePage({
  params,
}: {
  params: Promise<{ sellerId: string }>;
}) {
  const { sellerId } = await params;
  const user = await getUserFromSession();

  const seller = await db
    .select({
      id: users.id,
      ownerName: users.name,
      phone: users.phone,
      storeName: sellerProfiles.storeName,
      address: sellerProfiles.address,
      category: sellerProfiles.category,
      logoUrl: sellerProfiles.logoUrl,
      approvalStatus: sellerProfiles.approvalStatus,
    })
    .from(users)
    .innerJoin(sellerProfiles, eq(users.id, sellerProfiles.userId))
    .where(eq(users.id, sellerId))
    .get();

  if (!seller) notFound();

  const rawCatalog = await db
    .select({
      id: products.id,
      sellerId: products.sellerId,
      name: products.name,
      description: products.description,
      price: products.price,
      imageUrl: products.imageUrl,
      minQty: products.preorderMinQty,
      currentQty: products.currentQty,
      minOrderQty: products.minOrderQty,
      maxOrderQty: products.maxOrderQty,
      processingTime: products.processingTime,
      batchCategory: products.batchCategory,
      variantsJson: products.variantsJson,
      deadlineDate: products.deadlineDate,
      status: products.status,
      createdAt: products.createdAt,
    })
    .from(products)
    .where(eq(products.sellerId, sellerId))
    .orderBy(desc(products.createdAt));

  const productRatings = await db
    .select({
      productId: orders.productId,
      averageRating: sql<number>`AVG(${orders.rating})`,
      ratingCount: sql<number>`COUNT(${orders.rating})`,
    })
    .from(orders)
    .where(isNotNull(orders.rating))
    .groupBy(orders.productId);

  const ratingsByProduct = new Map(productRatings.map((item) => [item.productId, {
    averageRating: Number(item.averageRating) || 0,
    ratingCount: Number(item.ratingCount) || 0,
  }]));

  const catalog = rawCatalog.map(({ variantsJson, ...product }) => ({
    ...product,
    variants: parseStoredProductVariants(variantsJson),
    averageRating: ratingsByProduct.get(product.id)?.averageRating || 0,
    ratingCount: ratingsByProduct.get(product.id)?.ratingCount || 0,
  }));

  return <ClientStoreProfile seller={seller} products={catalog} user={user} />;
}
