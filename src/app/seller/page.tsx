import { db } from "@/lib/db";
import { products, sellerProfiles } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { getUserFromSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import ClientSellerDashboard from "@/components/ClientSellerDashboard";

export default async function SellerDashboard() {
  const user = await getUserFromSession();
  
  if (!user || user.role !== 'penjual') {
    redirect('/login');
  }

  // Fetch Seller Profile
  const profile = await db.select().from(sellerProfiles).where(eq(sellerProfiles.userId, user.id)).get();
  
  // Fetch Products
  const myProducts = await db.select().from(products)
    .where(eq(products.sellerId, user.id))
    .orderBy(desc(products.createdAt));

  const activeCount = myProducts.filter(p => p.status === 'active' || p.status === 'draft').length;
  const waitingCount = myProducts.filter(p => p.status === 'draft' && (p.currentQty || 0) < (p.preorderMinQty || 1)).length;
  const completedCount = myProducts.filter(p => p.status === 'completed').length;

  return (
    <ClientSellerDashboard 
      profile={profile}
      myProducts={myProducts}
      activeCount={activeCount}
      waitingCount={waitingCount}
      completedCount={completedCount}
      userName={user.name}
    />
  );
}
