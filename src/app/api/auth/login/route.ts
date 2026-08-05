import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ message: 'Email dan password wajib diisi' }, { status: 400 });
    }

    // Cari user
    const user = await db.select().from(users).where(eq(users.email, email)).get();
    if (!user) {
      return NextResponse.json({ message: 'Email atau password salah' }, { status: 401 });
    }

    // Verifikasi password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json({ message: 'Email atau password salah' }, { status: 401 });
    }

    // Cek status aktif
    if (user.status !== 'active') {
      return NextResponse.json({ message: 'Akun Anda belum aktif atau diblokir' }, { status: 403 });
    }

    // Buat JWT Token
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || 'fallback-secret-for-development'
    );
    
    const alg = 'HS256';
    const jwt = await new SignJWT({ 
      id: user.id, 
      role: user.role, 
      email: user.email, 
      name: user.name 
    })
      .setProtectedHeader({ alg })
      .setIssuedAt()
      .setExpirationTime('7d') // Berlaku 7 hari
      .sign(secret);

    // Set HTTP-Only Cookie
    const cookieStore = await cookies();
    cookieStore.set('auth_token', jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 hari dalam detik
    });

    return NextResponse.json({ 
      message: 'Login berhasil', 
      user: {
        id: user.id,
        name: user.name,
        role: user.role
      } 
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
