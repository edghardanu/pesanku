import { notFound } from "next/navigation";
import { getUserFromSession } from "@/lib/auth";
import { getProductDetail } from "@/lib/productDetails";
import ClientProductDetail from "@/components/ClientProductDetail";
import { dummyProducts } from "@/lib/dummyData";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";

export const dynamic = 'force-dynamic';

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  // Dapatkan user aktif (jika ada)
  const sessionUser = await getUserFromSession();
  let user = null;
  if (sessionUser) {
    user = await db.select().from(users).where(eq(users.id, sessionUser.id)).get() || null;
  }

  let productData;

  if (id.startsWith("dummy-")) {
    productData = dummyProducts.find(p => p.id === id);
  } else {
    productData = await getProductDetail(id);
  }

  if (!productData) {
    notFound();
  }

  return (
    <ClientProductDetail product={productData} user={user} />
  );
}
