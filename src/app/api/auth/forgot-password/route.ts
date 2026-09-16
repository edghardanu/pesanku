import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { SignJWT } from 'jose';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ message: 'Email harus diisi' }, { status: 400 });
    }

    // Check if user exists
    const existingUsers = await db.select().from(users).where(eq(users.email, email));
    if (existingUsers.length === 0) {
      // Return success anyway for security reasons to not reveal if email is registered
      // But actually, we don't send the email in this case.
      return NextResponse.json({ success: true, message: 'Jika email terdaftar, tautan reset password akan dikirimkan.' });
    }

    const user = existingUsers[0];

    // Generate strict JWT token that expires in 15 minutes
    const tokenSecret = process.env.JWT_SECRET || 'fallback-secret-for-dev-pesanku-app';
    const secretKey = new TextEncoder().encode(tokenSecret);

    const token = await new SignJWT({ email: user.email, intent: 'reset-password' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(secretKey);

    // Prepare link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || 'http://localhost:3000';
    const resetLink = `${baseUrl}/reset-password?token=${token}`;

    // Send email via nodemailer
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
    const isSecure = smtpPort === 465;

    if (!smtpUser || !smtpPass) {
      console.warn("SMTP_USER and SMTP_PASS are not set. Cannot send reset password email.");
      return NextResponse.json({ success: true, message: 'Jika email terdaftar, tautan reset password akan dikirimkan.' });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.hostinger.com',
      port: smtpPort,
      secure: isSecure,
      auth: { user: smtpUser, pass: smtpPass },
    });

    const appName = 'Pesanku';
    const htmlTemplate = `<!DOCTYPE html>
<html lang="id">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:550px;margin:0 auto;padding:32px 16px;background-color:#ffffff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.1);margin-top:20px;margin-bottom:20px;">
  <tr>
    <td style="text-align:center;padding-bottom:24px;border-bottom:1px solid #e5e7eb;">
      <h1 style="color:#800000;font-size:24px;margin:0;font-weight:700;">Pesanku</h1>
    </td>
  </tr>
  <tr>
    <td style="padding:28px 0;">
      <h2 style="color:#111827;font-size:18px;margin:0 0 12px;font-weight:600;">Pemulihan Kata Sandi</h2>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 24px;">
        Halo <strong>${user.name}</strong>,<br/>
        Kami menerima permintaan untuk mereset kata sandi akun <strong>${appName}</strong> Anda.
      </p>
      
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        <tr>
          <td align="center">
            <a href="${resetLink}" style="display:inline-block;background-color:#800000;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:8px;">
              Atur Ulang Kata Sandi
            </a>
          </td>
        </tr>
      </table>

      <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 16px;">
        Tautan ini hanya berlaku selama <strong>15 menit</strong>.
      </p>
      <p style="color:#6b7280;font-size:13px;line-height:1.5;margin:0 0 0;">
        Jika Anda tidak meminta tautan ini, Anda bisa mengabaikan email ini. Kata sandi Anda tidak akan berubah.
      </p>
    </td>
  </tr>
  <tr>
    <td style="padding-top:20px;border-top:1px solid #e5e7eb;text-align:center;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">&copy; ${new Date().getFullYear()} ${appName} - Sistem Preorder Makanan UMKM</p>
    </td>
  </tr>
</table>
</body>
</html>`;

    // Fire and forget email delivery
    transporter.sendMail({
      from: `"${appName} Security" <${smtpUser}>`,
      replyTo: smtpUser,
      to: user.email,
      subject: `Permintaan Reset Password Akun ${appName}`,
      html: htmlTemplate,
      headers: {
        'X-Mailer': `${appName} Mailer`,
        'Precedence': 'transactional'
      },
    }).catch(console.error);

    return NextResponse.json({ success: true, message: 'Jika email terdaftar, tautan reset password akan dikirimkan.' });
  } catch (error: any) {
    console.error('Forgot password POST error:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan sistem.' }, { status: 500 });
  }
}
