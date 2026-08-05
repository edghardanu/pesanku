import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { getUserFromSession } from '@/lib/auth';

export async function PUT(request: Request) {
  try {
    const session = await getUserFromSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, status } = body;

    if (!userId || !status) {
      return NextResponse.json(
        { error: 'User ID dan status wajib diisi' },
        { status: 400 }
      );
    }

    if (!['active', 'inactive', 'pending'].includes(status)) {
      return NextResponse.json(
        { error: 'Status tidak valid' },
        { status: 400 }
      );
    }

    await db
      .update(users)
      .set({ status })
      .where(eq(users.id, userId));

    return NextResponse.json({ message: 'Status berhasil diperbarui' });
  } catch (error) {
    console.error('Update UMKM Status Error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
