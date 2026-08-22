import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, sellerProfiles, otpCodes } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

// ============================================================
// HELPER: Generate 6-digit OTP
// ============================================================
function generateSixDigitOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

// ============================================================
// HELPER: Kirim OTP ke email pengguna Menggunakan Gmail SMTP
// ============================================================
async function sendRegistrationOtpEmail(recipientEmail: string, recipientName: string, otpCode: string): Promise<void> {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpUser || !smtpPass) {
    console.warn('[REGISTER OTP] SMTP_USER atau SMTP_PASS belum dikonfigurasi.');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: (process.env.SMTP_PORT || '587') === '465',
    auth: { user: smtpUser, pass: smtpPass },
  });

  const appName = 'Pesanku';
  const plainTextContent = `Halo ${recipientName},

Terima kasih telah mendaftar di ${appName}.

Kode verifikasi Anda: ${otpCode}

Kode ini berlaku selama 5 menit. Jangan bagikan kode ini kepada siapapun.

Jika Anda tidak merasa mendaftar di ${appName}, abaikan email ini.

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
      <p style="color:#333333;font-size:15px;line-height:1.6;margin:0 0 8px;">Halo <strong>${recipientName}</strong>,</p>
      <p style="color:#555555;font-size:14px;line-height:1.6;margin:0 0 24px;">Terima kasih telah mendaftar di ${appName}. Gunakan kode berikut untuk mengaktifkan akun Anda. Kode berlaku selama <strong>5 menit</strong>.</p>
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
      <p style="color:#888888;font-size:13px;line-height:1.5;margin:12px 0 0;">Jika Anda tidak merasa mendaftar, abaikan email ini.</p>
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
      'X-Mailer': 'Pesanku App'
    }
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, phone, password, role, storeName, address } = body;

    // Validasi input
    if (!name || !email || !password || !role) {
      return NextResponse.json({ message: 'Semua field wajib diisi' }, { status: 400 });
    }

    if (role === 'seller' && (!storeName || !address)) {
      return NextResponse.json({ message: 'Nama toko dan alamat wajib diisi untuk penjual' }, { status: 400 });
    }

    // Cek email apakah sudah ada
    const existingUser = await db.select().from(users).where(eq(users.email, email)).get();
    if (existingUser) {
      // Jika statusnya masih pending, artinya belum verifikasi OTP.
      // Kita hapus data lama yang belum diverifikasi agar mereka bisa daftar/kirim OTP ulang (reset).
      if (existingUser.status === 'pending') {
        if (existingUser.role === 'penjual') {
          await db.delete(sellerProfiles).where(eq(sellerProfiles.userId, existingUser.id));
        }
        await db.delete(users).where(eq(users.id, existingUser.id));
      } else {
        return NextResponse.json({ message: 'Email sudah terdaftar dan aktif. Silakan login.' }, { status: 400 });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // Generate ID
    const userId = crypto.randomUUID();

    // Insert user
    await db.insert(users).values({
      id: userId,
      name,
      email,
      phone: phone || null,
      passwordHash,
      role: role === 'seller' ? 'penjual' : 'pembeli',
      status: 'pending', // Akun berstatus pending sampai OTP diverifikasi
      address: address,
      profileImageUrl: body.logoUrl || null,
    });

    // Jika penjual, insert ke sellerProfiles
    if (role === 'seller') {
      await db.insert(sellerProfiles).values({
        id: crypto.randomUUID(),
        userId: userId,
        storeName: storeName,
        address: address,
        logoUrl: body.logoUrl || null,
        approvalStatus: 'pending', // Perlu approval admin sesuai PRD
      });
    }

    // === Generate OTP dan kirim ke email ===
    const generatedOtpCode = generateSixDigitOtp();
    const otpExpiryTime = new Date(Date.now() + 5 * 60 * 1000); // 5 menit
    const otpRecordId = `otp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // Simpan OTP ke database
    await db.insert(otpCodes).values({
      id: otpRecordId,
      email: email.trim().toLowerCase(),
      code: generatedOtpCode,
      expiresAt: otpExpiryTime,
      isUsed: false,
    });

    // Kirim OTP via email (non-blocking, jika SMTP belum diset tidak akan error)
    try {
      await sendRegistrationOtpEmail(email, name, generatedOtpCode);
    } catch (emailError) {
      console.error('[REGISTER] Gagal mengirim email OTP:', emailError);
      // Registrasi tetap berhasil meskipun email gagal kirim
    }

    return NextResponse.json({
      message: 'Registrasi berhasil! Kode verifikasi telah dikirim ke email Anda.',
      userId,
      requiresOtp: true,
      email: email.trim().toLowerCase(),
    }, { status: 201 });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
