import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { sellerProfiles, users } from '@/lib/schema';
import { getUserFromSession } from '@/lib/auth';
import cloudinary from '@/lib/cloudinary';

async function resolveImageUrl(
  imageUrl: unknown,
  currentUrl: string | null | undefined,
  folder: string
) {
  if (typeof imageUrl !== 'string') return undefined;

  if (imageUrl === currentUrl) return undefined;
  if (imageUrl.trim() === '') return null;

  if (imageUrl.startsWith('data:image')) {
    const hasCloudinaryConfig = Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );

    if (!hasCloudinaryConfig) {
      return imageUrl;
    }

    const uploadResponse = await cloudinary.uploader.upload(imageUrl, { folder });
    return uploadResponse.secure_url;
  }

  return imageUrl;
}

async function refreshAuthCookie(user: { id: string; role: string; email: string; name: string }) {
  const secret = new TextEncoder().encode(
    process.env.JWT_SECRET || 'fallback-secret-for-development'
  );

  const jwt = await new SignJWT({
    id: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);

  const cookieStore = await cookies();
  cookieStore.set('auth_token', jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function PUT(request: Request) {
  try {
    const sessionUser = await getUserFromSession();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await db
      .select()
      .from(users)
      .where(eq(users.id, sessionUser.id))
      .get();

    if (!currentUser) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const address = typeof body.address === 'string' ? body.address.trim() : '';

    if (!name) {
      return NextResponse.json({ error: 'Nama wajib diisi' }, { status: 400 });
    }

    const profileImageUrl = await resolveImageUrl(
      body.profileImageUrl,
      currentUser.profileImageUrl,
      'pesanku_profiles'
    );

    const userUpdateData: {
      name: string;
      phone: string | null;
      address: string | null;
      profileImageUrl?: string | null;
    } = {
      name,
      phone: phone || null,
      address: address || null,
    };

    if (profileImageUrl !== undefined) {
      userUpdateData.profileImageUrl = profileImageUrl;
    }

    await db.update(users)
      .set(userUpdateData)
      .where(eq(users.id, sessionUser.id));

    let updatedSellerProfile = null;

    if (currentUser.role === 'penjual') {
      const existingProfile = await db
        .select()
        .from(sellerProfiles)
        .where(eq(sellerProfiles.userId, sessionUser.id))
        .get();

      const storeName = typeof body.storeName === 'string' && body.storeName.trim()
        ? body.storeName.trim()
        : existingProfile?.storeName || name;
      const storeAddress = typeof body.storeAddress === 'string'
        ? body.storeAddress.trim()
        : existingProfile?.address || address;
      const category = typeof body.category === 'string' ? body.category.trim() : existingProfile?.category || '';
      const bankAccount = typeof body.bankAccount === 'string' ? body.bankAccount.trim() : existingProfile?.bankAccount || '';

      const logoUrl = await resolveImageUrl(
        body.logoUrl ?? body.profileImageUrl,
        existingProfile?.logoUrl,
        'pesanku_profiles'
      );

      const sellerUpdateData: {
        storeName: string;
        address: string | null;
        category: string | null;
        bankAccount: string | null;
        logoUrl?: string | null;
      } = {
        storeName,
        address: storeAddress || null,
        category: category || null,
        bankAccount: bankAccount || null,
      };

      if (logoUrl !== undefined) {
        sellerUpdateData.logoUrl = logoUrl;
      }

      if (existingProfile) {
        await db.update(sellerProfiles)
          .set(sellerUpdateData)
          .where(eq(sellerProfiles.userId, sessionUser.id));
      } else {
        await db.insert(sellerProfiles).values({
          id: crypto.randomUUID(),
          userId: sessionUser.id,
          storeName,
          address: storeAddress || null,
          category: category || null,
          bankAccount: bankAccount || null,
          logoUrl: logoUrl === undefined ? (profileImageUrl ?? currentUser.profileImageUrl) : logoUrl,
          approvalStatus: 'pending',
        });
      }

      updatedSellerProfile = {
        ...(existingProfile || {}),
        ...sellerUpdateData,
      };
    }

    await refreshAuthCookie({
      id: currentUser.id,
      role: currentUser.role,
      email: currentUser.email,
      name,
    });

    return NextResponse.json({
      message: 'Profil berhasil diperbarui',
      user: {
        id: currentUser.id,
        name,
        email: currentUser.email,
        role: currentUser.role,
        phone: phone || null,
        address: address || null,
        profileImageUrl: profileImageUrl === undefined ? currentUser.profileImageUrl : profileImageUrl,
      },
      sellerData: updatedSellerProfile,
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
