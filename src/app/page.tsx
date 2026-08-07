import { db } from "@/lib/db";
import { products, sellerProfiles, orders } from "@/lib/schema";
import { eq, desc, sql } from "drizzle-orm";
import ClientHome from "@/components/ClientHome";
import { dummyProducts } from "@/lib/dummyData";
import { getUserFromSession } from "@/lib/auth";

export default async function Home() {
  const user = await getUserFromSession();
  let totalSold = 0;
  let dbProducts: any[] = [];

  try {
    // Fetch total products sold
    const totalSoldResult = await db.select({ total: sql<number>`SUM(${orders.qty})` }).from(orders).get();
    totalSold = totalSoldResult?.total || 0;

    // Fetch real products from database with seller details
    const rawProducts = await db
      .select({
        id: products.id,
        name: products.name,
        price: products.price,
        description: products.description,
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
    dbProducts = rawProducts.map(p => ({
      ...p,
      sellerAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop"
    }));
  } catch (error) {
    console.error("Database error while fetching products/orders on homepage:", error);
    // Fallback gracefully without breaking the UI
  }

  const allProducts = [...dbProducts, ...dummyProducts];

  return <ClientHome initialProducts={allProducts} totalSold={totalSold} user={user} />;
}
