import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { otpCodes, users } from '@/lib/schema';
import { eq, and, desc } from 'drizzle-orm';

// ============================================================
// Rate Limiting: Proteksi brute-force OTP (maks 5 percobaan / 15 menit per email)
// ============================================================
const otpRateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkOtpRateLimit(email: string): boolean {
  const now = Date.now();
  const window = 15 * 60 * 1000; // 15 menit
  const maxAttempts = 5;

  const record = otpRateLimitMap.get(email);
  if (!record || now > record.resetTime) {
    otpRateLimitMap.set(email, { count: 1, resetTime: now + window });
    return true;
  }
  if (record.count >= maxAttempts) return false;
  record.count += 1;
  return true;
}

// ============================================================
// POST: Verifikasi OTP Registrasi & Aktifkan Akun
// ============================================================
export async function POST(request: Request) {
  try {
    const requestBody = await request.json();
    const inputEmail: string | undefined = requestBody.email;
    const inputOtpCode: string | undefined = requestBody.code;

    // --- Validasi input ---
    if (!inputEmail || typeof inputEmail !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Alamat email wajib diisi.' },
        { status: 400 }
      );
    }

    if (!inputOtpCode || typeof inputOtpCode !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Kode OTP wajib diisi.' },
        { status: 400 }
      );
    }

    const sanitizedEmail = inputEmail.trim().toLowerCase();
    const sanitizedOtpCode = inputOtpCode.trim();

    // Rate limiting: proteksi brute-force
    if (!checkOtpRateLimit(sanitizedEmail)) {
      return NextResponse.json(
        { success: false, message: 'Terlalu banyak percobaan verifikasi. Silakan coba lagi dalam 15 menit.' },
        { status: 429 }
      );
    }

    // Validasi format: harus tepat 6 digit angka
    if (!/^\d{6}$/.test(sanitizedOtpCode)) {
      return NextResponse.json(
        { success: false, message: 'Kode OTP harus berupa 6 digit angka.' },
        { status: 400 }
      );
    }

    // --- Cari OTP terbaru yang belum digunakan untuk email ini ---
    const matchingOtpRecords = await db
      .select()
      .from(otpCodes)
      .where(
        and(
          eq(otpCodes.email, sanitizedEmail),
          eq(otpCodes.isUsed, false)
        )
      )
      .orderBy(desc(otpCodes.createdAt))
      .limit(1);

    if (matchingOtpRecords.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Tidak ada kode OTP aktif untuk email ini. Silakan daftar ulang.' },
        { status: 400 }
      );
    }

    const latestOtpRecord = matchingOtpRecords[0];

    // --- Cek kedaluwarsa berdasarkan waktu real-time ---
    const currentTimestamp = new Date();
    const expiresAtValue = latestOtpRecord.expiresAt;
    let otpExpiryTimestamp: Date;

    if (expiresAtValue instanceof Date) {
      otpExpiryTimestamp = expiresAtValue;
    } else if (typeof expiresAtValue === 'number') {
      // Jika disimpan sebagai unix seconds oleh Drizzle
      otpExpiryTimestamp = new Date(expiresAtValue * 1000);
    } else {
      otpExpiryTimestamp = new Date(expiresAtValue as unknown as number);
    }

    if (currentTimestamp > otpExpiryTimestamp) {
      await db
        .update(otpCodes)
        .set({ isUsed: true })
        .where(eq(otpCodes.id, latestOtpRecord.id));

      return NextResponse.json(
        { success: false, message: 'Kode OTP sudah kedaluwarsa. Silakan daftar ulang untuk mendapatkan kode baru.' },
        { status: 400 }
      );
    }

    // --- Cocokkan kode OTP ---
    if (latestOtpRecord.code !== sanitizedOtpCode) {
      return NextResponse.json(
        { success: false, message: 'Kode OTP salah. Periksa kembali dan coba lagi.' },
        { status: 400 }
      );
    }

    // --- Kode cocok & belum kedaluwarsa → BERHASIL ---
    // 1. Tandai OTP sebagai sudah digunakan
    await db
      .update(otpCodes)
      .set({ isUsed: true })
      .where(eq(otpCodes.id, latestOtpRecord.id));

    // 2. Aktifkan akun pengguna (ubah status dari 'pending' menjadi 'active')
    await db
      .update(users)
      .set({ status: 'active' })
      .where(eq(users.email, sanitizedEmail));

    return NextResponse.json({
      success: true,
      message: 'Verifikasi berhasil! Akun Anda telah aktif. Silakan login.',
    });
  } catch (error: unknown) {
    console.error('[OTP/VERIFY-REGISTER] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan server.';
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
