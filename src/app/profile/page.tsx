import { getUserFromSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import ClientProfile from "@/components/ClientProfile";
import { db } from "@/lib/db";
import { users, sellerProfiles } from "@/lib/schema";
import { eq } from "drizzle-orm";

export default async function ProfilePage() {
  const user = await getUserFromSession();
  
  if (!user) {
    redirect("/login");
  }

  // Fetch complete user data
  const userData = await db.select().from(users).where(eq(users.id, user.id)).get();
  
  if (!userData) {
    redirect("/login");
  }

  let sellerData = null;
  if (userData.role === 'penjual') {
    sellerData = await db.select().from(sellerProfiles).where(eq(sellerProfiles.userId, user.id)).get();
  }

  return <ClientProfile user={userData} sellerData={sellerData} />;
}
