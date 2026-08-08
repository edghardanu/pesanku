import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tickets, users } from '@/lib/schema';
import { v4 as uuidv4 } from 'uuid';
import { eq, desc } from 'drizzle-orm';
import { getUserFromSession } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    // Verifikasi user harus login sebelum submit tiket
    const sessionUser = await getUserFromSession();
    if (!sessionUser) {
      return NextResponse.json({ message: 'Unauthorized — silakan login terlebih dahulu' }, { status: 401 });
    }

    const { category, customCategory, notes } = await req.json();

    if (!category || !notes) {
      return NextResponse.json({ message: 'Data tidak lengkap' }, { status: 400 });
    }

    const ticketId = uuidv4();

    await db.insert(tickets).values({
      id: ticketId,
      userId: sessionUser.id,   // ambil dari session, bukan dari body (mencegah spoofing)
      category,
      customCategory: customCategory || null,
      notes,
      status: 'open',
    });

    return NextResponse.json({ success: true, message: 'Tiket berhasil dikirim' });
  } catch (error) {
    console.error('Error submitting ticket:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Hanya admin yang dapat melihat semua tiket
    const sessionUser = await getUserFromSession();
    if (!sessionUser || sessionUser.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const allTickets = await db
      .select({
        id: tickets.id,
        category: tickets.category,
        customCategory: tickets.customCategory,
        notes: tickets.notes,
        status: tickets.status,
        createdAt: tickets.createdAt,
        userName: users.name,
        userPhone: users.phone,
        userRole: users.role,
      })
      .from(tickets)
      .innerJoin(users, eq(tickets.userId, users.id))
      .orderBy(desc(tickets.createdAt));

    return NextResponse.json({ tickets: allTickets });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
