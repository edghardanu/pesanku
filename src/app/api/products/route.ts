import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { products, orders } from '@/lib/schema';
import { getUserFromSession } from '@/lib/auth';
import cloudinary from '@/lib/cloudinary';
import crypto from 'crypto';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(req: Request) {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'penjual') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const myProducts = await db.select().from(products)
      .where(eq(products.sellerId, user.id))
      .orderBy(desc(products.createdAt));

    return NextResponse.json({ products: myProducts }, { status: 200 });
  } catch (error) {
    console.error('Fetch products error:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getUserFromSession();
    
    if (!user || user.role !== 'penjual') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, price, imageUrl, minQty, deadline, minOrderQty, maxOrderQty, batchCategory } = body;

    if (!name || !price) {
      return NextResponse.json({ message: 'Nama dan harga produk wajib diisi' }, { status: 400 });
    }

    // Business Rule 1: Deadline tidak bisa diatur jika minQty belum ada
    if (deadline && (!minQty || minQty < 1)) {
      return NextResponse.json({ message: 'Minimal kuota wajib diisi sebelum mengatur deadline' }, { status: 400 });
    }

    let finalImageUrl = imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&h=400&fit=crop';

    // Jika imageUrl adalah base64, upload ke Cloudinary
    if (imageUrl && imageUrl.startsWith('data:image')) {
      try {
        const uploadResponse = await cloudinary.uploader.upload(imageUrl, {
          folder: 'pesanku_products',
        });
        finalImageUrl = uploadResponse.secure_url;
      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        return NextResponse.json({ message: 'Gagal mengunggah gambar produk' }, { status: 500 });
      }
    }

    const parsedMinQty = minQty ? parseInt(minQty) : 10;
    const parsedPrice = parseInt(price);
    
    // Parse deadline
    let deadlineDate = null;
    if (deadline) {
      deadlineDate = new Date(deadline);
    }

    const productId = crypto.randomUUID();

    await db.insert(products).values({
      id: productId,
      sellerId: user.id,
      name,
      description: description || null,
      price: parsedPrice,
      imageUrl: finalImageUrl,
      preorderMinQty: parsedMinQty,
      deadlineDate: deadlineDate,
      minOrderQty: minOrderQty ? parseInt(minOrderQty) : 1,
      maxOrderQty: maxOrderQty ? parseInt(maxOrderQty) : null,
      batchCategory: batchCategory || null,
      status: 'draft',
    });

    return NextResponse.json({ message: 'Produk berhasil dibuat', id: productId }, { status: 201 });
  } catch (error) {
    console.error('Create product error:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getUserFromSession();
    
    if (!user || user.role !== 'penjual') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ message: 'ID produk diperlukan' }, { status: 400 });
    }

    // Check if product has orders
    const existingOrders = await db.select().from(orders).where(eq(orders.productId, id)).limit(1);
    if (existingOrders.length > 0) {
      return NextResponse.json({ message: 'Tidak dapat menghapus produk karena sudah ada pesanan masuk. Silakan ubah kuota atau tunggu pesanan selesai.' }, { status: 400 });
    }

    await db.delete(products).where(and(eq(products.id, id), eq(products.sellerId, user.id)));

    return NextResponse.json({ message: 'Produk berhasil dihapus' }, { status: 200 });
  } catch (error: any) {
    console.error('Delete product error:', error);
    if (error?.message?.includes('FOREIGN KEY')) {
       return NextResponse.json({ message: 'Produk tidak dapat dihapus karena terkait dengan data pesanan yang masih ada.' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Terjadi kesalahan pada server saat menghapus produk' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getUserFromSession();
    
    if (!user || user.role !== 'penjual') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, name, price, minQty, imageUrl, minOrderQty, maxOrderQty, batchCategory } = body;

    if (!id || !name || !price || !minQty) {
      return NextResponse.json({ message: 'Data produk tidak lengkap' }, { status: 400 });
    }

    let finalImageUrl = imageUrl;
    
    // Check if the seller owns this product
    const existingProduct = await db.select().from(products).where(and(eq(products.id, id), eq(products.sellerId, user.id))).get();
    if (!existingProduct) {
        return NextResponse.json({ message: 'Produk tidak ditemukan atau akses ditolak' }, { status: 404 });
    }

    // Jika imageUrl adalah base64, upload ke Cloudinary
    if (imageUrl && imageUrl.startsWith('data:image')) {
      try {
        const uploadResponse = await cloudinary.uploader.upload(imageUrl, {
          folder: 'pesanku_products',
        });
        finalImageUrl = uploadResponse.secure_url;
      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        return NextResponse.json({ message: 'Gagal mengunggah gambar produk' }, { status: 500 });
      }
    }

    await db.update(products)
      .set({
        name,
        price: parseInt(price),
        preorderMinQty: parseInt(minQty),
        minOrderQty: minOrderQty ? parseInt(minOrderQty) : 1,
        maxOrderQty: maxOrderQty ? parseInt(maxOrderQty) : null,
        batchCategory: batchCategory || null,
        ...(finalImageUrl ? { imageUrl: finalImageUrl } : {})
      })
      .where(and(eq(products.id, id), eq(products.sellerId, user.id)));

    return NextResponse.json({ message: 'Produk berhasil diperbarui' }, { status: 200 });
  } catch (error) {
    console.error('Update product error:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}

