import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { getUserFromSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const sessionUser = await getUserFromSession();
    if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await db.select().from(users).where(eq(users.id, sessionUser.id)).get();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json({ address: user.address || '' }, { status: 200 });
  } catch (error) {
    console.error('Failed to get buyer profile:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
