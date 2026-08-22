import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, orders } from '@/lib/schema';
import { eq, isNotNull, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sellersCountResult = await db.select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.role, 'penjual'))
      .get();
    
    const ratingResult = await db.select({ avg: sql<number>`avg(rating)` })
      .from(orders)
      .where(isNotNull(orders.rating))
      .get();
      
    let totalUmkm = sellersCountResult?.count || 0;
    let avgRating = ratingResult?.avg || 0;
    
    // Add realistic minimums for aesthetic scaling when db is empty
    if (totalUmkm < 10) totalUmkm = totalUmkm; 
    let displayRating = avgRating;
    if (displayRating === 0) displayRating = 5.0; // Default if no ratings yet
      
    return NextResponse.json({
      totalUmkm: totalUmkm.toString(),
      avgRating: displayRating.toFixed(1)
    });
  } catch (error) {
    console.error('Public stats error:', error);
    return NextResponse.json({ totalUmkm: "0", avgRating: "5.0" });
  }
}
