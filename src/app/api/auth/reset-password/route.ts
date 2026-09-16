import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { getUserFromSession } from '@/lib/auth';
import { jwtVerify } from 'jose';

export async function PUT(request: Request) {
  try {
    const sessionUser = await getUserFromSession();
    if (!sessionUser) {
      return NextResponse.json(
        { error: 'Anda harus login untuk mengubah password' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Password lama dan password baru wajib diisi' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password minimal 8 karakter' },
        { status: 400 }
      );
    }

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, sessionUser.id))
      .get();

    if (!user) {
      return NextResponse.json(
        { error: 'Pengguna tidak ditemukan' },
        { status: 404 }
      );
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: 'Password lama tidak sesuai' },
        { status: 401 }
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, user.id));

    return NextResponse.json({ message: 'Password berhasil diubah' });
  } catch (error) {
    console.error('Reset Password Error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { token, newPassword } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json({ message: 'Data tidak lengkap' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ message: 'Kata sandi baru minimal 8 karakter' }, { status: 400 });
    }

    const strongRegex = new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])");
    if (!strongRegex.test(newPassword)) {
      return NextResponse.json({ message: 'Kata sandi harus mengandung kombinasi huruf besar, huruf kecil, angka, dan lambang/simbol khusus' }, { status: 400 });
    }

    const tokenSecret = process.env.JWT_SECRET || 'fallback-secret-for-dev-pesanku-app';
    const secretKey = new TextEncoder().encode(tokenSecret);

    let payload;
    try {
      const { payload: verifiedPayload } = await jwtVerify(token, secretKey);
      payload = verifiedPayload;
    } catch (err: any) {
      if (err.code === 'ERR_JWT_EXPIRED') {
        return NextResponse.json({ message: 'Tautan pemulihan kata sandi sudah kedaluwarsa. Silakan minta tautan baru.' }, { status: 400 });
      }
      return NextResponse.json({ message: 'Tautan pemulihan kata sandi tidak valid.' }, { status: 400 });
    }

    const email = payload.email as string;
    const intent = payload.intent as string;

    if (!email || intent !== 'reset-password') {
      return NextResponse.json({ message: 'Tautan pemulihan kata sandi tidak valid.' }, { status: 400 });
    }

    const existingUsers = await db.select().from(users).where(eq(users.email, email));
    if (existingUsers.length === 0) {
      return NextResponse.json({ message: 'Pengguna tidak ditemukan.' }, { status: 404 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await db.update(users).set({ passwordHash }).where(eq(users.email, email));

    return NextResponse.json({ success: true, message: 'Kata sandi berhasil diubah.' });
  } catch (error: any) {
    console.error('Reset password POST error:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan saat mengatur ulang kata sandi.' }, { status: 500 });
  }
}

