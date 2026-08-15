import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { products } from '@/lib/schema';
import { eq, desc, and } from 'drizzle-orm';
import { parseStoredProductVariants } from '@/lib/productVariants';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sellerId = searchParams.get('sellerId');

    if (!sellerId) {
      return NextResponse.json({ message: 'Seller ID is required' }, { status: 400 });
    }

    const sellerProducts = await db.select().from(products)
      .where(and(eq(products.sellerId, sellerId), eq(products.status, 'active')))
      .orderBy(desc(products.createdAt));

    return NextResponse.json({
      products: sellerProducts.map(({ variantsJson, ...product }) => ({
        ...product,
        variants: parseStoredProductVariants(variantsJson),
      })),
    }, { status: 200 });
  } catch (error) {
    console.error('Fetch public products error:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
