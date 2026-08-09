import { desc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { getUserFromSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { promotionOffers } from '@/lib/schema';

const getAdmin = async () => {
  const user = await getUserFromSession();
  return user?.role === 'admin' ? user : null;
};

export async function GET() {
  try {
    if (!await getAdmin()) {
      return NextResponse.json({ error: 'Akses admin diperlukan.' }, { status: 403 });
    }

    const offers = await db.select().from(promotionOffers).orderBy(desc(promotionOffers.createdAt));
    return NextResponse.json({ offers });
  } catch (error) {
    console.error('Fetch promotion offers error:', error);
    return NextResponse.json({ error: 'Gagal memuat paket promosi.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Akses admin diperlukan.' }, { status: 403 });
    }

    const body = await request.json() as { name?: unknown; price?: unknown; expiresAt?: unknown };
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const price = typeof body.price === 'number' ? body.price : Number(body.price);
    const expiresAt = typeof body.expiresAt === 'string' ? new Date(body.expiresAt) : new Date(Number.NaN);

    if (name.length < 2 || name.length > 80) {
      return NextResponse.json({ error: 'Nama promosi harus terdiri dari 2–80 karakter.' }, { status: 400 });
    }
    if (!Number.isSafeInteger(price) || price < 0 || price > 1_000_000_000) {
      return NextResponse.json({ error: 'Harga promosi harus berupa Rupiah yang valid.' }, { status: 400 });
    }
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
      return NextResponse.json({ error: 'Deadline promosi harus berada di masa mendatang.' }, { status: 400 });
    }

    const offer = {
      id: crypto.randomUUID(),
      name,
      price,
      expiresAt,
      isActive: true,
      createdBy: admin.id,
      createdAt: new Date(),
    };
    await db.insert(promotionOffers).values(offer);

    return NextResponse.json({ message: 'Paket promosi berhasil diterbitkan.', offer }, { status: 201 });
  } catch (error) {
    console.error('Create promotion offer error:', error);
    return NextResponse.json({ error: 'Gagal membuat paket promosi.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    if (!await getAdmin()) {
      return NextResponse.json({ error: 'Akses admin diperlukan.' }, { status: 403 });
    }

    const body = await request.json() as { id?: unknown; isActive?: unknown };
    if (typeof body.id !== 'string' || typeof body.isActive !== 'boolean') {
      return NextResponse.json({ error: 'ID dan status paket promosi tidak valid.' }, { status: 400 });
    }

    const offer = await db.select({ id: promotionOffers.id }).from(promotionOffers)
      .where(eq(promotionOffers.id, body.id)).get();
    if (!offer) {
      return NextResponse.json({ error: 'Paket promosi tidak ditemukan.' }, { status: 404 });
    }

    await db.update(promotionOffers).set({ isActive: body.isActive }).where(eq(promotionOffers.id, body.id));
    return NextResponse.json({ message: body.isActive ? 'Paket promosi diaktifkan.' : 'Paket promosi dinonaktifkan.' });
  } catch (error) {
    console.error('Update promotion offer error:', error);
    return NextResponse.json({ error: 'Gagal memperbarui paket promosi.' }, { status: 500 });
  }
}
