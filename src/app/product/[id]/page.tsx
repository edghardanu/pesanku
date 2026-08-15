import { notFound } from "next/navigation";
import { getUserFromSession } from "@/lib/auth";
import { getProductDetail } from "@/lib/productDetails";
import ClientProductDetail from "@/components/ClientProductDetail";
import { dummyProducts } from "@/lib/dummyData";
import { db } from "@/lib/db";
import { users, products, orders, payments, settings } from "@/lib/schema";
import { eq, and, desc, ne, sql } from "drizzle-orm";

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

  let productOrders = [];
  if (user && user.role === 'penjual' && !id.startsWith("dummy-")) {
    const rawOrders = await db.select({
      id: orders.id,
      productId: orders.productId,
      qty: orders.qty,
      totalPrice: orders.totalPrice,
      status: orders.status,
      notes: orders.notes,
      selectedVariant: orders.selectedVariant,
      selectedVariantPrice: orders.selectedVariantPrice,
      createdAt: orders.createdAt,
      productName: products.name,
      buyerName: users.name,
      buyerPhone: users.phone,
      buyerAddress: sql<string>`COALESCE(${orders.deliveryAddress}, ${users.address})`.as('buyerAddress'),
      requestedDeliveryDate: orders.deliveryDate,
      proofUrl: payments.proofUrl,
      deliveryProofUrl: orders.deliveryProofUrl,
      dispatchReceiptUrl: orders.dispatchReceiptUrl,
    })
    .from(orders)
    .innerJoin(products, eq(orders.productId, products.id))
    .innerJoin(users, eq(orders.buyerId, users.id))
    .leftJoin(payments, eq(orders.id, payments.orderId))
    .where(and(eq(orders.productId, id), ne(orders.status, 'chat_only')))
    .orderBy(desc(orders.createdAt));

    const feeSettings = await db.select().from(settings).all();
    const schedulePrefix = `preorder_schedule:${user.id}:`;
    const scheduleByOrder = new Map<string, any>();
    feeSettings.forEach((setting) => {
      if (!setting.key.startsWith(schedulePrefix)) return;
      try {
        const parsed = JSON.parse(setting.value);
        const validStatuses = ['scheduled', 'preparing', 'ready', 'shipped', 'delivered'];
        if (typeof parsed.deliveryDate !== 'string' || !validStatuses.includes(String(parsed.fulfillmentStatus))) return;
        scheduleByOrder.set(setting.key.slice(schedulePrefix.length), {
          deliveryDate: parsed.deliveryDate,
          fulfillmentStatus: parsed.fulfillmentStatus,
          scheduleUpdatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
        });
      } catch {}
    });

    productOrders = rawOrders.map((order) => ({
      ...order,
      ...scheduleByOrder.get(order.id),
    }));
  }

  return (
    <ClientProductDetail product={productData} user={user} orders={productOrders} />
  );
}
