import { and, desc, eq, isNotNull, sql } from 'drizzle-orm';
import { notFound } from 'next/navigation';

import ClientStoreProfile from '@/components/ClientStoreProfile';
import { getUserFromSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { orders, products, sellerProfiles, users } from '@/lib/schema';
import { parseStoredProductVariants } from '@/lib/productVariants';

export const dynamic = 'force-dynamic';

export default async function StoreProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ storeName: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { storeName } = await params;
  const { view } = await searchParams;
  const showCatalog = view === 'katalog';
  const sessionUser = await getUserFromSession();
  let user = null;
  if (sessionUser) {
    user = await db.select().from(users).where(eq(users.id, sessionUser.id)).get() || null;
  }
  
  // storeName param can be: "nama-toko-{uuid}" or just "{uuid}"
  // We extract the UUID from the last 36-char segment
  const decodedParam = decodeURIComponent(storeName);
  
  // UUID regex (with or without prefix slug)
  const uuidMatch = decodedParam.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
  const sellerId = uuidMatch ? uuidMatch[1] : null;
  
  // If no UUID found, try to look up by store name directly
  let seller = null;
  
  if (sellerId) {
    seller = await db
      .select({
        id: users.id,
        ownerName: users.name,
        storeName: sellerProfiles.storeName,
        address: sellerProfiles.address,
        category: sellerProfiles.category,
        logoUrl: sellerProfiles.logoUrl,
        description: sellerProfiles.description,
        approvalStatus: sellerProfiles.approvalStatus,
        createdAt: users.createdAt,
      })
      .from(users)
      .innerJoin(sellerProfiles, eq(users.id, sellerProfiles.userId))
      .where(eq(users.id, sellerId))
      .get() || null;
  }
  
  // Fallback: lookup by exact store name
  if (!seller) {
    const decodedStoreName = decodedParam;
    seller = await db
      .select({
        id: users.id,
        ownerName: users.name,
        storeName: sellerProfiles.storeName,
        address: sellerProfiles.address,
        category: sellerProfiles.category,
        logoUrl: sellerProfiles.logoUrl,
        description: sellerProfiles.description,
        approvalStatus: sellerProfiles.approvalStatus,
        createdAt: users.createdAt,
      })
      .from(users)
      .innerJoin(sellerProfiles, eq(users.id, sellerProfiles.userId))
      .where(sql`lower(${sellerProfiles.storeName}) = lower(${decodedStoreName})`)
      .get() || null;
  }

  if (!seller) notFound();

  let catalog: Array<{
    id: string;
    sellerId: string;
    name: string;
    description: string | null;
    price: number;
    imageUrl: string | null;
    minQty: number | null;
    currentQty: number | null;
    minOrderQty: number | null;
    maxOrderQty: number | null;
    processingTime: string | null;
    batchCategory: string | null;
    deadlineDate: Date | null;
    status: string | null;
    createdAt: Date | null;
    variants: ReturnType<typeof parseStoredProductVariants>;
    averageRating: number;
    ratingCount: number;
  }> = [];

  if (showCatalog) {
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
      .where(eq(products.sellerId, seller.id))
      .orderBy(desc(products.createdAt));

    const productRatings = await db
      .select({
        productId: orders.productId,
        averageRating: sql<number>`AVG(${orders.rating})`,
        ratingCount: sql<number>`COUNT(${orders.rating})`,
      })
      .from(orders)
      .innerJoin(products, eq(orders.productId, products.id))
      .where(and(eq(products.sellerId, seller.id), isNotNull(orders.rating)))
      .groupBy(orders.productId);

    const ratingsByProduct = new Map(productRatings.map((item) => [item.productId, {
      averageRating: Number(item.averageRating) || 0,
      ratingCount: Number(item.ratingCount) || 0,
    }]));

    catalog = rawCatalog.map(({ variantsJson, ...product }) => ({
      ...product,
      variants: parseStoredProductVariants(variantsJson),
      averageRating: ratingsByProduct.get(product.id)?.averageRating || 0,
      ratingCount: ratingsByProduct.get(product.id)?.ratingCount || 0,
    }));
  }

  return <ClientStoreProfile seller={seller} products={catalog} showCatalog={showCatalog} user={user} />;
}
