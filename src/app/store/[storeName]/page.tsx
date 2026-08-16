import { eq, sql } from 'drizzle-orm';
import { notFound } from 'next/navigation';

import ClientStoreProfile from '@/components/ClientStoreProfile';
import { getUserFromSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { sellerProfiles, users } from '@/lib/schema';

export const dynamic = 'force-dynamic';

export default async function StoreProfilePage({
  params,
}: {
  params: Promise<{ storeName: string }>;
}) {
  const { storeName } = await params;
  const sessionUser = await getUserFromSession();
  let user = null;
  if (sessionUser) {
    user = await db.select().from(users).where(eq(users.id, sessionUser.id)).get() || null;
  }
  
  // storeName param can be: "nama-toko-{uuid}" or just "{uuid}"
  // We extract the UUID from the last 36-char segment
  const decodedParam = decodeURIComponent(storeName);
  
  // UUID regex (with or without prefix slug)
  const uuidMatch = decodedParam.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
  const sellerId = uuidMatch ? uuidMatch[1] : null;
  
  // If no UUID found, try to look up by store name directly
  let seller = null;
  
  if (sellerId) {
    seller = await db
      .select({
        id: users.id,
        ownerName: users.name,
        storeName: sellerProfiles.storeName,
        address: sellerProfiles.address,
        category: sellerProfiles.category,
        logoUrl: sellerProfiles.logoUrl,
        description: sellerProfiles.description,
        approvalStatus: sellerProfiles.approvalStatus,
        createdAt: users.createdAt,
      })
      .from(users)
      .innerJoin(sellerProfiles, eq(users.id, sellerProfiles.userId))
      .where(eq(users.id, sellerId))
      .get() || null;
  }
  
  // Fallback: lookup by exact store name
  if (!seller) {
    const decodedStoreName = decodedParam;
    seller = await db
      .select({
        id: users.id,
        ownerName: users.name,
        storeName: sellerProfiles.storeName,
        address: sellerProfiles.address,
        category: sellerProfiles.category,
        logoUrl: sellerProfiles.logoUrl,
        description: sellerProfiles.description,
        approvalStatus: sellerProfiles.approvalStatus,
        createdAt: users.createdAt,
      })
      .from(users)
      .innerJoin(sellerProfiles, eq(users.id, sellerProfiles.userId))
      .where(sql`lower(${sellerProfiles.storeName}) = lower(${decodedStoreName})`)
      .get() || null;
  }

  if (!seller) notFound();
  
  return <ClientStoreProfile seller={seller} user={user} />;
}
