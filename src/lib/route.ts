import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, products } from "@/lib/schema";
import { getUserFromSession } from "@/lib/auth";
import crypto from "crypto";
import { eq, and, sql } from "drizzle-orm";
import { findProductVariant, parseStoredProductVariants } from "@/lib/productVariants";

export async function POST(request: Request) {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'pembeli') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { productId, selectedVariant } = await request.json();
    if (!productId) {
      return NextResponse.json({ error: "Missing productId" }, { status: 400 });
    }

    // Get product details
    const product = await db.select().from(products).where(eq(products.id, productId)).get();
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const availableVariants = parseStoredProductVariants(product.variantsJson);
    const normalizedVariant = typeof selectedVariant === 'string' ? selectedVariant.trim() : '';
    const selectedVariantDetails = findProductVariant(availableVariants, normalizedVariant);
    if (availableVariants.length > 0 && !selectedVariantDetails) {
      return NextResponse.json({ error: "Pilih varian produk yang tersedia" }, { status: 400 });
    }
    if (availableVariants.length === 0 && normalizedVariant) {
      return NextResponse.json({ error: "Produk ini tidak memiliki pilihan varian" }, { status: 400 });
    }

    const orderId = `ORD-${Date.now().toString().slice(-6)}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const initialQty = product.preorderMinQty || 1;
    const unitPrice = selectedVariantDetails?.price ?? product.price;

    // Create order
    await db.insert(orders).values({
      id: orderId,
      productId: product.id,
      buyerId: user.id,
      qty: initialQty,
      totalPrice: unitPrice * initialQty,
      selectedVariant: normalizedVariant || null,
      selectedVariantPrice: selectedVariantDetails?.price ?? null,
      status: "waiting_verification",
    });

    return NextResponse.json({ success: true, orderId });
  } catch (error) {
    console.error("Order creation error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'pembeli') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    const unreadOrders = await db.select().from(orders).where(
      and(
        eq(orders.buyerId, user.id),
        eq(orders.isRead, false)
      )
    );

    const activeOrdersQuery = productId
      ? and(
          eq(orders.buyerId, user.id),
          eq(orders.productId, productId),
          sql`${orders.status} != 'completed' AND ${orders.status} != 'cancelled'`
        )
      : and(
          eq(orders.buyerId, user.id),
          sql`${orders.status} != 'completed' AND ${orders.status} != 'cancelled'`
        );

    const activeOrders = await db.select().from(orders).where(activeOrdersQuery);

    // Also fetch ALL active orders (by any product) to return activeProductIds
    const allActiveOrders = await db.select({ productId: orders.productId }).from(orders).where(
      and(
        eq(orders.buyerId, user.id),
        sql`${orders.status} != 'completed' AND ${orders.status} != 'cancelled'`
      )
    );

    const activeProductIds = [...new Set(allActiveOrders.map(o => o.productId))];

    return NextResponse.json({ 
      count: unreadOrders.length,
      hasActiveOrder: activeOrders.length > 0,
      activeProductIds,
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'pembeli') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    await db.update(orders)
      .set({ isRead: true })
      .where(eq(orders.buyerId, user.id));
      
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
