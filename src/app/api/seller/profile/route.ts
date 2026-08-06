import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sellerProfiles } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { getUserFromSession } from '@/lib/auth';
import cloudinary from '@/lib/cloudinary';

export async function PUT(request: Request) {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'penjual') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { storeName, address, category, bankAccount, logoUrl } = body;

    if (!storeName) {
      return NextResponse.json({ error: 'Nama toko wajib diisi' }, { status: 400 });
    }

    let finalLogoUrl = undefined;
    
    // Jika logoUrl adalah base64, upload ke Cloudinary
    if (logoUrl && logoUrl.startsWith('data:image')) {
      try {
        const uploadResponse = await cloudinary.uploader.upload(logoUrl, {
          folder: 'pesanku_profiles',
        });
        finalLogoUrl = uploadResponse.secure_url;
      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        return NextResponse.json({ error: 'Gagal mengunggah foto profil' }, { status: 500 });
      }
    } else if (logoUrl === "") {
        finalLogoUrl = null; // Allow removing logo if needed, though usually not handled via empty string in forms, but good for completeness.
    }

    const updateData: any = {
        storeName,
        address,
        category,
        bankAccount
    };

    if (finalLogoUrl !== undefined) {
        updateData.logoUrl = finalLogoUrl;
    }

    await db.update(sellerProfiles)
      .set(updateData)
      .where(eq(sellerProfiles.userId, user.id));

    return NextResponse.json({ message: 'Profil berhasil diperbarui' });
  } catch (error) {
    console.error('Error updating seller profile:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
