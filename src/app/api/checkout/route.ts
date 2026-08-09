import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { getUserFromSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { orders, products } from '@/lib/schema';
import { findProductVariant, parseStoredProductVariants } from '@/lib/productVariants';

type CheckoutItemInput = {
  productId?: unknown;
  qty?: unknown;
  notes?: unknown;
  selectedVariant?: unknown;
};

export async function POST(req: Request) {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'pembeli') {
      return NextResponse.json({ error: 'Unauthorized. Hanya pembeli yang dapat memesan.' }, { status: 403 });
    }

    const body = await req.json();
    const rawItems: CheckoutItemInput[] = Array.isArray(body.items)
      ? body.items
      : [{ productId: body.productId, qty: body.qty, notes: body.notes, selectedVariant: body.selectedVariant }];

    if (rawItems.length < 1 || rawItems.length > 50) {
      return NextResponse.json({ error: 'Keranjang harus berisi 1 sampai 50 produk' }, { status: 400 });
    }

    const items = rawItems.map((item) => ({
      productId: typeof item.productId === 'string' ? item.productId : '',
      qty: Number(item.qty),
      notes: typeof item.notes === 'string' ? item.notes.slice(0, 500) : '',
      selectedVariant: typeof item.selectedVariant === 'string' ? item.selectedVariant.trim() : '',
    }));

    if (items.some((item) => !item.productId || !Number.isInteger(item.qty) || item.qty < 1)) {
      return NextResponse.json({ error: 'Data pesanan tidak lengkap' }, { status: 400 });
    }

    if (new Set(items.map((item) => item.productId)).size !== items.length) {
      return NextResponse.json({ error: 'Satu produk tidak boleh muncul dua kali dalam keranjang' }, { status: 400 });
    }

    return await db.transaction(async (tx) => {
      const validatedItems = [];
      let sellerId: string | null = null;

      for (const item of items) {
        const product = await tx.select().from(products).where(eq(products.id, item.productId)).get();
        if (!product) {
          return NextResponse.json({ error: 'Salah satu produk tidak ditemukan' }, { status: 404 });
        }

        if (sellerId && product.sellerId !== sellerId) {
          return NextResponse.json({ error: 'Checkout hanya dapat berisi produk dari satu toko' }, { status: 400 });
        }
        sellerId = product.sellerId;

        const deadlinePassed = Boolean(product.deadlineDate && product.deadlineDate.getTime() < Date.now());
        const preorderClosed = ['closed', 'processing', 'completed'].includes(product.status || '') || deadlinePassed;
        if (preorderClosed) {
          return NextResponse.json({ error: `Preorder ${product.name} telah ditutup` }, { status: 400 });
        }

        const minimumOrder = product.minOrderQty || 1;
        if (item.qty < minimumOrder) {
          return NextResponse.json({ error: `Minimal pemesanan ${product.name} adalah ${minimumOrder} porsi` }, { status: 400 });
        }

        if (product.maxOrderQty && item.qty > product.maxOrderQty) {
          return NextResponse.json({ error: `Maksimal pemesanan ${product.name} adalah ${product.maxOrderQty} porsi` }, { status: 400 });
        }

        const availableVariants = parseStoredProductVariants(product.variantsJson);
        const selectedVariantDetails = findProductVariant(availableVariants, item.selectedVariant);
        if (availableVariants.length > 0 && !selectedVariantDetails) {
          return NextResponse.json({ error: `Pilih varian yang tersedia untuk ${product.name}` }, { status: 400 });
        }

        if (availableVariants.length === 0 && item.selectedVariant) {
          return NextResponse.json({ error: `${product.name} tidak memiliki pilihan varian` }, { status: 400 });
        }

        const unitPrice = selectedVariantDetails?.price ?? product.price;
        validatedItems.push({ item, product, unitPrice, selectedVariantPrice: selectedVariantDetails?.price ?? null });
      }

      const orderIds: string[] = [];
      for (const [index, { item, product, unitPrice, selectedVariantPrice }] of validatedItems.entries()) {
        const orderId = `ORD-${Date.now().toString().slice(-6)}-${index + 1}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
        orderIds.push(orderId);

        await tx.insert(orders).values({
          id: orderId,
          productId: product.id,
          buyerId: user.id,
          qty: item.qty,
          totalPrice: unitPrice * item.qty,
          notes: item.notes,
          selectedVariant: item.selectedVariant || null,
          selectedVariantPrice,
          status: 'waiting_verification',
        });

        const nextCurrentQty = (product.currentQty || 0) + item.qty;
        await tx.update(products)
          .set({
            currentQty: nextCurrentQty,
            status: nextCurrentQty >= (product.preorderMinQty || 1) ? 'quota_reached' : product.status,
          })
          .where(eq(products.id, product.id));
      }

      return NextResponse.json({
        message: `${orderIds.length} pesanan berhasil dibuat. Menunggu pembayaran.`,
        orderId: orderIds[0],
        orderIds,
        itemCount: orderIds.length,
        totalQty: validatedItems.reduce((total, { item }) => total + item.qty, 0),
      }, { status: 201 });
    }, { behavior: 'immediate' });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server saat memproses pesanan' }, { status: 500 });
  }
}
