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
    const rawItems: any[] = Array.isArray(body.items)
      ? body.items
      : [{ productId: body.productId, qty: body.qty, notes: body.notes, selectedVariant: body.selectedVariant, deliveryDate: body.deliveryDate, deliveryAddress: body.deliveryAddress, chatOrderId: body.chatOrderId }];

    if (rawItems.length < 1 || rawItems.length > 50) {
      return NextResponse.json({ error: 'Keranjang harus berisi 1 sampai 50 produk' }, { status: 400 });
    }

    const items = rawItems.map((item) => ({
      productId: typeof item.productId === 'string' ? item.productId : '',
      qty: Number(item.qty),
      notes: typeof item.notes === 'string' ? item.notes.slice(0, 500) : '',
      selectedVariant: typeof item.selectedVariant === 'string' ? item.selectedVariant.trim() : '',
      deliveryDate: typeof item.deliveryDate === 'string' ? item.deliveryDate : null,
      deliveryAddress: typeof item.deliveryAddress === 'string' ? item.deliveryAddress : null,
      chatOrderId: typeof item.chatOrderId === 'string' ? item.chatOrderId : null,
    }));

    if (items.some((item) => !item.productId || !Number.isInteger(item.qty) || item.qty < 1 || !item.deliveryDate)) {
      return NextResponse.json({ error: 'Data pesanan tidak lengkap atau tanggal belum diisi' }, { status: 400 });
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

        // const deadlinePassed = Boolean(product.deadlineDate && product.deadlineDate.getTime() < Date.now());
        // const preorderClosed = ['closed', 'processing', 'completed'].includes(product.status || '') || deadlinePassed;
        // if (preorderClosed) {
        //   return NextResponse.json({ error: `Preorder ${product.name} telah ditutup` }, { status: 400 });
        // }

        // Limit checks removed as per requirement
        const availableVariants = parseStoredProductVariants(product.variantsJson);
        const selectedVariantDetails = findProductVariant(availableVariants, item.selectedVariant);
        // Variant is now optional

        const unitPrice = selectedVariantDetails?.price ?? product.price;
        validatedItems.push({ item, product, unitPrice, selectedVariantPrice: selectedVariantDetails?.price ?? null });
      }

      const orderIds: string[] = [];
      for (const [index, { item, product, unitPrice, selectedVariantPrice }] of validatedItems.entries()) {
        const orderId = item.chatOrderId || `ORD-${Date.now().toString().slice(-6)}-${index + 1}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
        orderIds.push(orderId);

        const totalPrice = unitPrice * item.qty;
        const sellerSplit = Math.floor(totalPrice * 0.5);
        const adminSplit = totalPrice - sellerSplit;

        if (item.chatOrderId) {
          // Verify it's actually their order
          const existingOrder = await tx.select().from(orders).where(eq(orders.id, item.chatOrderId)).get();
          if (existingOrder && existingOrder.buyerId === user.id && (existingOrder.status === 'chat_only' || existingOrder.status === 'waiting_verification')) {
            await tx.update(orders).set({
              qty: item.qty,
              totalPrice,
              notes: item.notes,
              selectedVariant: item.selectedVariant || null,
              selectedVariantPrice,
              status: 'waiting_verification',
              deliveryDate: item.deliveryDate,
              deliveryAddress: item.deliveryAddress,
              sellerSplitAmount: sellerSplit,
              adminSplitAmount: adminSplit,
            }).where(eq(orders.id, item.chatOrderId));
          } else {
            // Fallback securely
            const fbOrderId = `ORD-${Date.now().toString().slice(-6)}-${index + 1}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
            orderIds[orderIds.length - 1] = fbOrderId;
            await tx.insert(orders).values({
              id: fbOrderId,
              productId: product.id,
              buyerId: user.id,
              qty: item.qty,
              totalPrice,
              notes: item.notes,
              selectedVariant: item.selectedVariant || null,
              selectedVariantPrice,
              status: 'waiting_verification',
              deliveryDate: item.deliveryDate,
              deliveryAddress: item.deliveryAddress,
              sellerSplitAmount: sellerSplit,
              adminSplitAmount: adminSplit,
            });
          }
        } else {
          await tx.insert(orders).values({
            id: orderId,
            productId: product.id,
            buyerId: user.id,
            qty: item.qty,
            totalPrice,
            notes: item.notes,
            selectedVariant: item.selectedVariant || null,
            selectedVariantPrice,
            status: 'waiting_verification',
            deliveryDate: item.deliveryDate,
            deliveryAddress: item.deliveryAddress,
            sellerSplitAmount: sellerSplit,
            adminSplitAmount: adminSplit,
          });
        }

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
