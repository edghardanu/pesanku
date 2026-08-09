import { and, eq, ne } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { getUserFromSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { productPromotions, promotionOffers } from '@/lib/schema';

export async function PATCH(request: Request) {
  try {
    const admin = await getUserFromSession();
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Akses admin diperlukan.' }, { status: 403 });
    }

    const body = await request.json() as { requestId?: unknown; status?: unknown };
    if (
      typeof body.requestId !== 'string'
      || (body.status !== 'approved' && body.status !== 'rejected')
    ) {
      return NextResponse.json({ error: 'Data keputusan promosi tidak valid.' }, { status: 400 });
    }

    const promotionRequest = await db.select({
      id: productPromotions.id,
      productId: productPromotions.productId,
      status: productPromotions.status,
      expiresAt: promotionOffers.expiresAt,
      offerActive: promotionOffers.isActive,
    })
      .from(productPromotions)
      .innerJoin(promotionOffers, eq(productPromotions.promotionId, promotionOffers.id))
      .where(eq(productPromotions.id, body.requestId))
      .get();

    if (!promotionRequest) {
      return NextResponse.json({ error: 'Pengajuan promosi tidak ditemukan.' }, { status: 404 });
    }
    if (promotionRequest.status !== 'pending') {
      return NextResponse.json({ error: 'Pengajuan ini sudah ditinjau sebelumnya.' }, { status: 409 });
    }
    if (
      body.status === 'approved'
      && (!promotionRequest.offerActive || promotionRequest.expiresAt.getTime() <= Date.now())
    ) {
      return NextResponse.json({ error: 'Paket promosi sudah tidak aktif atau melewati deadline.' }, { status: 409 });
    }

    if (body.status === 'approved') {
      const otherApproved = await db.select({
        id: productPromotions.id,
        expiresAt: promotionOffers.expiresAt,
        offerActive: promotionOffers.isActive,
      })
        .from(productPromotions)
        .innerJoin(promotionOffers, eq(productPromotions.promotionId, promotionOffers.id))
        .where(and(
          eq(productPromotions.productId, promotionRequest.productId),
          eq(productPromotions.status, 'approved'),
          ne(productPromotions.id, promotionRequest.id),
        ));

      if (otherApproved.some((item) => item.offerActive && item.expiresAt.getTime() > Date.now())) {
        return NextResponse.json({ error: 'Produk ini masih memiliki promosi aktif.' }, { status: 409 });
      }
    }

    const reviewedAt = new Date();
    await db.update(productPromotions).set({
      status: body.status,
      reviewedAt,
      reviewedBy: admin.id,
    }).where(eq(productPromotions.id, body.requestId));

    return NextResponse.json({
      message: body.status === 'approved' ? 'Promosi produk disetujui.' : 'Pengajuan promosi ditolak.',
      status: body.status,
      reviewedAt,
    });
  } catch (error) {
    console.error('Review promotion request error:', error);
    return NextResponse.json({ error: 'Gagal memproses pengajuan promosi.' }, { status: 500 });
  }
}
