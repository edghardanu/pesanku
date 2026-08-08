import { notFound } from "next/navigation";
import { getUserFromSession } from "@/lib/auth";
import { getProductDetail } from "@/lib/productDetails";
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
    productData = await getProductDetail(id);
  }

  if (!productData) {
    notFound();
  }

  return (
    <ClientProductDetail product={productData} user={user} />
  );
}
