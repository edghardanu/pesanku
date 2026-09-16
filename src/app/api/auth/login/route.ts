import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';

// Simple in-memory rate limiting (Anti Brute-Force mechanism)
// In production with a distributed system (serverless), normally this would use Redis.
const rateLimitMap = new Map<string, { count: number, resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limitWindow = 15 * 60 * 1000; // 15 minutes window
  const maxAttempts = 5; // Max 5 failed attempts

  const record = rateLimitMap.get(ip);
  if (!record) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + limitWindow });
    return true; 
  }

  if (now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + limitWindow });
    return true; 
  }

  if (record.count >= maxAttempts) {
    return false; // Rate limit exceeded
  }

  record.count += 1;
  return true;
}

function resetRateLimit(ip: string) {
  rateLimitMap.delete(ip);
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';

    // 1. Rate Limiting Protection
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { message: 'Terlalu banyak percobaan login. Silakan coba lagi dalam 15 menit.' }, 
        { status: 429 } // 429 Too Many Requests
      );
    }

    const body = await req.json();
    const { email, password } = body;

    // 2. Input Validation (Length bounds to prevent DoS via bcrypt overload)
    if (!email || !password) {
      return NextResponse.json({ message: 'Email dan password wajib diisi' }, { status: 400 });
    }
    
    // Validate maximum length according to standards
    if (email.length > 255 || password.length > 72) {
      return NextResponse.json({ message: 'Input melebihi batas karakter yang diizinkan' }, { status: 400 });
    }

    // 3. Cari user (Auth Identifier)
    const user = await db.select().from(users).where(eq(users.email, email)).get();
    
    // Prevent username enumeration by always using the same generic error
    if (!user) {
      return NextResponse.json({ message: 'Email atau password salah' }, { status: 401 });
    }

    // 4. Verifikasi password dengan standard aman (bcrypt)
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!isPasswordValid) {
      return NextResponse.json({ message: 'Email atau password salah' }, { status: 401 });
    }

    // Reset rate limit on successful authentication
    resetRateLimit(ip);

    // 5. Cek status aktif (Authorization check)
    if (user.status === 'pending') {
      return NextResponse.json({ 
        message: 'Akun Anda belum diverifikasi. Silakan masukkan kode OTP.',
        requiresOtp: true,
        email: user.email
      }, { status: 403 });
    } else if (user.status !== 'active') {
      return NextResponse.json({ message: 'Akun Anda belum aktif atau diblokir' }, { status: 403 });
    }

    // 6. Buat JWT Token
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

    // 7. Set HTTP-Only Secure Cookie (Session Security)
    const cookieStore = await cookies();
    cookieStore.set('auth_token', jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Proteksi ringan terhadap CSRF
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 hari
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
    // Generic server error (doesn't leak internal details)
    return NextResponse.json({ message: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
