import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { email, newPassword } = body;

    if (!email || !newPassword) {
      return NextResponse.json(
        { error: 'Email dan password baru wajib diisi' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password minimal 6 karakter' },
        { status: 400 }
      );
    }

    // Cek apakah user ada
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .get();

    if (!user) {
      return NextResponse.json(
        { error: 'Pengguna dengan email tersebut tidak ditemukan' },
        { status: 404 }
      );
    }

    // Hash password baru
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password di database
    await db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.email, email));

    return NextResponse.json({ message: 'Password berhasil diubah' });
  } catch (error) {
    console.error('Reset Password Error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
