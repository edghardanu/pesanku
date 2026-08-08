import { db } from "@/lib/db";
import { products, sellerProfiles, orders } from "@/lib/schema";
import { eq, desc, sql } from "drizzle-orm";
import ClientHome from "@/components/ClientHome";
import { getUserFromSession } from "@/lib/auth";

export const dynamic = 'force-dynamic';

import { ProductItem } from "@/types";

export default async function Home() {
  const user = await getUserFromSession();
  let totalSold = 0;
  let dbProducts: ProductItem[] = [];

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
        minOrderQty: products.minOrderQty,
        stock: products.stock,
        batchCategory: products.batchCategory,
        deadlineDate: products.deadlineDate,
        status: products.status,
        sellerName: sellerProfiles.storeName,
        sellerAddress: sellerProfiles.address,
        sellerAvatar: sellerProfiles.logoUrl,
        sellerLogoUrl: sellerProfiles.logoUrl,
      })
      .from(products)
      .innerJoin(sellerProfiles, eq(products.sellerId, sellerProfiles.userId))
      .orderBy(desc(products.createdAt));

    // Provide a fallback avatar for sellers without a profile image.
    dbProducts = rawProducts.map(p => ({
      ...p,
      sellerAvatar: p.sellerAvatar || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop",
    }));
  } catch (error) {
    console.error("Database error while fetching products/orders on homepage:", error);
    // Fallback gracefully without breaking the UI
  }

  return <ClientHome initialProducts={dbProducts} totalSold={totalSold} user={user} />;
}
