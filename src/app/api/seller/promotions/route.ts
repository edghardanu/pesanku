import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { getUserFromSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { productPromotions, products, promotionOffers } from '@/lib/schema';

export async function POST(request: Request) {
  try {
    const seller = await getUserFromSession();
    if (!seller || seller.role !== 'penjual') {
      return NextResponse.json({ error: 'Akses penjual diperlukan.' }, { status: 403 });
    }

    const body = await request.json() as { promotionId?: unknown; productId?: unknown };
    if (typeof body.promotionId !== 'string' || typeof body.productId !== 'string') {
      return NextResponse.json({ error: 'Paket promosi dan produk wajib dipilih.' }, { status: 400 });
    }

    const [offer, product] = await Promise.all([
      db.select().from(promotionOffers).where(eq(promotionOffers.id, body.promotionId)).get(),
      db.select({ id: products.id, name: products.name }).from(products)
        .where(and(eq(products.id, body.productId), eq(products.sellerId, seller.id))).get(),
    ]);

    if (!offer || !offer.isActive || offer.expiresAt.getTime() <= Date.now()) {
      return NextResponse.json({ error: 'Paket promosi tidak tersedia atau sudah berakhir.' }, { status: 409 });
    }
    if (!product) {
      return NextResponse.json({ error: 'Produk tidak ditemukan atau bukan milik toko Anda.' }, { status: 404 });
    }

    const openRequests = await db.select({
      status: productPromotions.status,
      expiresAt: promotionOffers.expiresAt,
      offerActive: promotionOffers.isActive,
    })
      .from(productPromotions)
      .innerJoin(promotionOffers, eq(productPromotions.promotionId, promotionOffers.id))
      .where(and(
        eq(productPromotions.productId, product.id),
        eq(productPromotions.sellerId, seller.id),
      ));

    const hasOpenRequest = openRequests.some((item) => (
      (item.status === 'pending' || item.status === 'approved')
      && item.offerActive
      && item.expiresAt.getTime() > Date.now()
    ));
    if (hasOpenRequest) {
      return NextResponse.json({ error: 'Produk ini masih memiliki pengajuan atau promosi aktif.' }, { status: 409 });
    }

    const promotionRequest = {
      id: crypto.randomUUID(),
      promotionId: offer.id,
      productId: product.id,
      sellerId: seller.id,
      status: 'pending' as const,
      requestedAt: new Date(),
      reviewedAt: null,
      offerName: offer.name,
      offerPrice: offer.price,
      expiresAt: offer.expiresAt,
      productName: product.name,
    };

    await db.insert(productPromotions).values({
      id: promotionRequest.id,
      promotionId: promotionRequest.promotionId,
      productId: promotionRequest.productId,
      sellerId: promotionRequest.sellerId,
      status: promotionRequest.status,
      requestedAt: promotionRequest.requestedAt,
    });

    return NextResponse.json({ message: 'Produk berhasil diajukan untuk promosi.', promotionRequest }, { status: 201 });
  } catch (error) {
    console.error('Create product promotion request error:', error);
    return NextResponse.json({ error: 'Gagal mengajukan promosi produk.' }, { status: 500 });
  }
}
