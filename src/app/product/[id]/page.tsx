import { db } from "@/lib/db";
import { products, sellerProfiles, users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getUserFromSession } from "@/lib/auth";
import ClientProductDetail from "@/components/ClientProductDetail";
import { dummyProducts } from "@/lib/dummyData";

export const dynamic = 'force-dynamic';

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  // Dapatkan user aktif (jika ada)
  const user = await getUserFromSession();

  let productData;

  if (id.startsWith("dummy-")) {
    productData = dummyProducts.find(p => p.id === id);
  } else {
    // Dapatkan detail produk beserta info toko penjual
    productData = await db
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
        batchCategory: products.batchCategory,
        deadlineDate: products.deadlineDate,
        status: products.status,
        storeName: sellerProfiles.storeName,
        storeAddress: sellerProfiles.address,
        sellerName: users.name,
      })
      .from(products)
      .innerJoin(users, eq(products.sellerId, users.id))
      .leftJoin(sellerProfiles, eq(users.id, sellerProfiles.userId))
      .where(eq(products.id, id))
      .get();
  }

  if (!productData) {
    notFound();
  }

  return (
    <ClientProductDetail product={productData} user={user} />
  );
}
