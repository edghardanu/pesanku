import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { getUserFromSession } from '@/lib/auth';

export async function PUT(req: Request) {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { orderId, orderIds, adminSplitAmount, sellerSplitAmount } = await req.json();

    const ids = orderIds || (orderId ? [orderId] : []);

    if (ids.length === 0 || adminSplitAmount === undefined || sellerSplitAmount === undefined) {
      return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
    }

    const { inArray } = await import('drizzle-orm');
    
    // Calculate proportionate split for multiple orders
    const ordersList = await db.select().from(orders).where(inArray(orders.id, ids));
    const totalTransactionPrice = ordersList.reduce((sum, o) => sum + o.totalPrice, 0);

    for (const order of ordersList) {
      const ratio = totalTransactionPrice > 0 ? (order.totalPrice / totalTransactionPrice) : (1 / ordersList.length);
      await db.update(orders)
        .set({
          adminSplitAmount: Math.round(adminSplitAmount * ratio),
          sellerSplitAmount: Math.round(sellerSplitAmount * ratio),
        })
        .where(eq(orders.id, order.id));
    }

    return NextResponse.json({ message: 'Split updated successfully' });
  } catch (error) {
    console.error('Error updating order split:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
