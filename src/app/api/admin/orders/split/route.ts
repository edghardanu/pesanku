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

    const { orderId, adminSplitAmount, sellerSplitAmount } = await req.json();

    if (!orderId || adminSplitAmount === undefined || sellerSplitAmount === undefined) {
      return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
    }

    await db.update(orders)
      .set({
        adminSplitAmount,
        sellerSplitAmount,
      })
      .where(eq(orders.id, orderId));

    return NextResponse.json({ message: 'Split updated successfully' });
  } catch (error) {
    console.error('Error updating order split:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
