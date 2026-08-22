import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { otpCodes } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

// ============================================================
// HELPER: Generate 6-digit OTP
// ============================================================
function generateSixDigitOtp(): string {
  const randomNumber = crypto.randomInt(100000, 999999);
  return randomNumber.toString();
}

// ============================================================
// HELPER: Kirim email OTP menggunakan Gmail SMTP
// ============================================================
async function sendOtpEmail(recipientEmail: string, otpCode: string): Promise<void> {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpUser || !smtpPass) {
    throw new Error('Konfigurasi SMTP belum diatur. Pastikan SMTP_USER dan SMTP_PASS ada di .env.local');
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: (process.env.SMTP_PORT || '587') === '465',
    auth: { user: smtpUser, pass: smtpPass },
  });

  const appName = 'Pesanku';

  const plainTextContent = `Kode verifikasi ${appName} Anda: ${otpCode}

Kode ini berlaku selama 5 menit. Jangan bagikan kode ini kepada siapapun.

Jika Anda tidak meminta kode ini, abaikan email ini.

Salam,
Tim ${appName}`;

  const htmlTemplate = `<!DOCTYPE html>
<html lang="id">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;padding:32px 24px;">
  <tr>
    <td style="text-align:center;padding-bottom:24px;border-bottom:1px solid #e5e7eb;">
      <h1 style="color:#EA580C;font-size:22px;margin:0;">Pesanku</h1>
    </td>
  </tr>
  <tr>
    <td style="padding:28px 0;">
      <p style="color:#333333;font-size:15px;line-height:1.6;margin:0 0 8px;">Kode Verifikasi Anda</p>
      <p style="color:#555555;font-size:14px;line-height:1.6;margin:0 0 24px;">Gunakan kode berikut untuk menyelesaikan proses verifikasi. Kode berlaku selama <strong>5 menit</strong>.</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center">
            <div style="background-color:#FFF7ED;border:1px solid #FDBA74;border-radius:8px;padding:16px 24px;display:inline-block;">
              <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#EA580C;font-family:'Courier New',Courier,monospace;">${otpCode}</span>
            </div>
          </td>
        </tr>
      </table>
      <p style="color:#888888;font-size:13px;line-height:1.5;margin:24px 0 0;">Jangan bagikan kode ini kepada siapapun. Tim ${appName} tidak akan pernah meminta kode OTP Anda.</p>
      <p style="color:#888888;font-size:13px;line-height:1.5;margin:12px 0 0;">Jika Anda tidak meminta kode ini, abaikan email ini.</p>
    </td>
  </tr>
  <tr>
    <td style="padding-top:20px;border-top:1px solid #e5e7eb;text-align:center;">
      <p style="color:#aaaaaa;font-size:11px;margin:0;">${appName} - Sistem Preorder Makanan UMKM</p>
    </td>
  </tr>
</table>
</body>
</html>`;

  await transporter.sendMail({
    from: `"${appName}" <${smtpUser}>`,
    replyTo: smtpUser,
    to: recipientEmail,
    subject: `Kode Verifikasi ${appName} - ${otpCode}`,
    text: plainTextContent,
    html: htmlTemplate,
    headers: {
      'X-Priority': '1',
      'X-Mailer': 'Pesanku App',
    },
  });
}

// ============================================================
// POST: Generate OTP, simpan ke DB, dan kirim email
// ============================================================
export async function POST(request: Request) {
  try {
    const requestBody = await request.json();
    const inputEmail: string | undefined = requestBody.email;

    // Validasi input email
    if (!inputEmail || typeof inputEmail !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Alamat email wajib diisi.' },
        { status: 400 }
      );
    }

    const sanitizedEmail = inputEmail.trim().toLowerCase();

    // Validasi format email sederhana
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedEmail)) {
      return NextResponse.json(
        { success: false, message: 'Format email tidak valid.' },
        { status: 400 }
      );
    }

    // Generate OTP 6 digit
    const generatedOtpCode = generateSixDigitOtp();

    // Hitung waktu kedaluwarsa: 5 menit dari sekarang
    const nowTimestamp = new Date();
    const expiryTimestamp = new Date(nowTimestamp.getTime() + 5 * 60 * 1000);

    // Buat ID unik untuk record OTP
    const otpRecordId = `otp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // Tandai semua OTP lama di email ini sebagai sudah digunakan (invalidate)
    await db
      .update(otpCodes)
      .set({ isUsed: true })
      .where(and(eq(otpCodes.email, sanitizedEmail), eq(otpCodes.isUsed, false)));

    // Simpan OTP baru ke database
    await db.insert(otpCodes).values({
      id: otpRecordId,
      email: sanitizedEmail,
      code: generatedOtpCode,
      expiresAt: expiryTimestamp,
      isUsed: false,
    });

    // Kirim OTP via email
    await sendOtpEmail(sanitizedEmail, generatedOtpCode);

    return NextResponse.json({
      success: true,
      message: 'Kode OTP berhasil dikirim ke email Anda.',
    });
  } catch (error: unknown) {
    console.error('[OTP/SEND] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan server.';
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
