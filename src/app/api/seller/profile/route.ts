import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sellerProfiles } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { getUserFromSession } from '@/lib/auth';

export async function PUT(request: Request) {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'penjual') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { storeName, address, category, bankAccount } = body;

    if (!storeName) {
      return NextResponse.json({ error: 'Nama toko wajib diisi' }, { status: 400 });
    }

    await db.update(sellerProfiles)
      .set({
        storeName,
        address,
        category,
        bankAccount
      })
      .where(eq(sellerProfiles.userId, user.id));

    return NextResponse.json({ message: 'Profil berhasil diperbarui' });
  } catch (error) {
    console.error('Error updating seller profile:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
