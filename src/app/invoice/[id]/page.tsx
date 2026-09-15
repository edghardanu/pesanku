import { db } from "@/lib/db";
import { orders, products, users, sellerProfiles, settings, payments } from "@/lib/schema";
import { eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import ClientInvoice from "@/components/ClientInvoice";
import { getUserFromSession } from "@/lib/auth";

export default async function InvoicePage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ role?: string; ids?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;

  const user = await getUserFromSession();
  if (!user) {
    redirect("/login");
  }

  // Ambil semua IDs dari query param ?ids=id1,id2,... , fallback ke id tunggal
  const allIds = sp.ids ? sp.ids.split(',').filter(Boolean) : [id];

  const selectFields = {
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
    minOrderQty: products.minOrderQty,
    
    buyerName: users.name,
    buyerEmail: users.email,
    buyerPhone: users.phone,
    buyerAddress: users.address,
    
    sellerName: sellerProfiles.storeName,
    sellerAddress: sellerProfiles.address,

    paymentProofUrl: payments.proofUrl,
    paymentStatus: payments.verificationStatus,
  };

  // Fetch semua order dalam grup sekaligus
  const allOrderData = await db
    .select(selectFields)
    .from(orders)
    .innerJoin(products, eq(orders.productId, products.id))
    .innerJoin(users, eq(orders.buyerId, users.id))
    .innerJoin(sellerProfiles, eq(products.sellerId, sellerProfiles.userId))
    .leftJoin(payments, eq(orders.id, payments.orderId))
    .where(allIds.length > 1 ? inArray(orders.id, allIds) : eq(orders.id, id))
    .all();

  if (!allOrderData || allOrderData.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <h1>Invoice tidak ditemukan</h1>
      </div>
    );
  }

  const feeSettings = await db.select().from(settings).all();
  let checkoutFees: any[] = [];
  let hasCustomFees = false;
  feeSettings.forEach((f) => {
    if (f.key === 'checkout_fees_config') {
      try {
          checkoutFees = JSON.parse(f.value);
          hasCustomFees = true;
      } catch(e) {}
    }
  });

  if (!hasCustomFees) {
      let feeApp = 0, feeJasa = 0, feeAdmin = 0;
      feeSettings.forEach((f) => {
          if (f.key === "fee_aplikasi") feeApp = parseInt(f.value);
          if (f.key === "fee_jasa") feeJasa = parseInt(f.value);
          if (f.key === "fee_admin") feeAdmin = parseInt(f.value);
      });
      if (feeApp || feeApp === 0) checkoutFees.push({ id: 'aplikasi', name: 'Biaya Aplikasi', value: feeApp });
      if (feeJasa || feeJasa === 0) checkoutFees.push({ id: 'jasa', name: 'Biaya Jasa', value: feeJasa });
      if (feeAdmin || feeAdmin === 0) checkoutFees.push({ id: 'admin', name: 'Biaya Admin', value: feeAdmin });
  }

  const primaryOrder = allOrderData[0];
  const viewerRole = user.role === 'admin' ? 'admin' : (user.id === primaryOrder.sellerId ? 'seller' : 'buyer');

  return (
    <ClientInvoice
      order={primaryOrder}
      allOrders={allOrderData}
      checkoutFees={checkoutFees}
      viewerRole={viewerRole}
    />
  );
}
