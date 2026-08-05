import { db } from "@/lib/db";
import { products, sellerProfiles, orders } from "@/lib/schema";
import { eq, desc, sql } from "drizzle-orm";
import ClientHome from "@/components/ClientHome";

export default async function Home() {
  // Fetch total products sold
  const totalSoldResult = await db.select({ total: sql<number>`SUM(${orders.qty})` }).from(orders).get();
  const totalSold = totalSoldResult?.total || 0;

  // Fetch real products from database with seller details
  const rawProducts = await db
    .select({
      id: products.id,
      name: products.name,
      price: products.price,
      imageUrl: products.imageUrl,
      minQty: products.preorderMinQty,
      currentQty: products.currentQty,
      deadlineDate: products.deadlineDate,
      status: products.status,
      sellerName: sellerProfiles.storeName,
      sellerAddress: sellerProfiles.address,
    })
    .from(products)
    .innerJoin(sellerProfiles, eq(products.sellerId, sellerProfiles.userId))
    .orderBy(desc(products.createdAt));

  // Map to add hardcoded fields that aren't in schema yet
  const dbProducts = rawProducts.map(p => ({
    ...p,
    sellerAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop"
  }));

  return <ClientHome initialProducts={dbProducts} totalSold={totalSold} />;
}
