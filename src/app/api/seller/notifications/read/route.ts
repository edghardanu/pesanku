import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, chatMessages } from '@/lib/schema';
import { inArray } from 'drizzle-orm';
import { getUserFromSession } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'penjual') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderIds, chatIds } = await req.json();

    if (orderIds && Array.isArray(orderIds) && orderIds.length > 0) {
      await db.update(orders).set({ isRead: true }).where(inArray(orders.id, orderIds));
    }
    
    if (chatIds && Array.isArray(chatIds) && chatIds.length > 0) {
      await db.update(chatMessages).set({ isRead: true }).where(inArray(chatMessages.id, chatIds));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mark read error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
