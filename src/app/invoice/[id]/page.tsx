import { db } from "@/lib/db";
import { orders, products, users, sellerProfiles, settings } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import ClientInvoice from "@/components/ClientInvoice";
import { getUserFromSession } from "@/lib/auth";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getUserFromSession();
  if (!user) {
    redirect("/login");
  }

  const orderData = await db
    .select({
      id: orders.id,
      qty: orders.qty,
      totalPrice: orders.totalPrice,
      status: orders.status,
      notes: orders.notes,
      selectedVariant: orders.selectedVariant,
      selectedVariantPrice: orders.selectedVariantPrice,
      createdAt: orders.createdAt,
      buyerId: orders.buyerId,
      sellerId: products.sellerId,
      
      productName: products.name,
      productPrice: products.price,
      
      buyerName: users.name,
      buyerEmail: users.email,
      buyerPhone: users.phone,
      buyerAddress: users.address,
      
      sellerName: sellerProfiles.storeName,
      sellerAddress: sellerProfiles.address,
    })
    .from(orders)
    .innerJoin(products, eq(orders.productId, products.id))
    .innerJoin(users, eq(orders.buyerId, users.id))
    .innerJoin(sellerProfiles, eq(products.sellerId, sellerProfiles.userId))
    .where(eq(orders.id, id))
    .get();

  if (!orderData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <h1>Invoice tidak ditemukan</h1>
      </div>
    );
  }

  const feeSettings = await db.select().from(settings).all();
  let feeAplikasi = 0;
  let feeJasa = 0;
  let feeAdmin = 0;
  feeSettings.forEach(f => {
    if (f.key === "fee_aplikasi") feeAplikasi = parseInt(f.value);
    if (f.key === "fee_jasa") feeJasa = parseInt(f.value);
    if (f.key === "fee_admin") feeAdmin = parseInt(f.value);
  });

  const viewerRole = user.role === 'admin' ? 'admin' : (user.id === orderData.sellerId ? 'seller' : 'buyer');

  return <ClientInvoice order={orderData} feeAplikasi={feeAplikasi} feeJasa={feeJasa} feeAdmin={feeAdmin} viewerRole={viewerRole} />;
}
