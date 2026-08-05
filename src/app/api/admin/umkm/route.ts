import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, sellerProfiles, products, orders, payments, sellerBalances, payouts } from '@/lib/schema';
import { eq, inArray } from 'drizzle-orm';
import { getUserFromSession } from '@/lib/auth';

export async function DELETE(request: Request) {
  try {
    const session = await getUserFromSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID wajib diisi' },
        { status: 400 }
      );
    }

    // Dapatkan semua produk milik seller ini
    const sellerProducts = await db.select({ id: products.id }).from(products).where(eq(products.sellerId, userId));
    const productIds = sellerProducts.map(p => p.id);

    if (productIds.length > 0) {
      // Dapatkan semua pesanan untuk produk-produk ini
      const productOrders = await db.select({ id: orders.id }).from(orders).where(inArray(orders.productId, productIds));
      const orderIds = productOrders.map(o => o.id);

      if (orderIds.length > 0) {
        // Hapus pembayaran terkait pesanan
        await db.delete(payments).where(inArray(payments.orderId, orderIds));
        // Hapus pesanan
        await db.delete(orders).where(inArray(orders.id, orderIds));
      }
      
      // Hapus produk
      await db.delete(products).where(inArray(products.id, productIds));
    }

    // Hapus pencairan dana (payouts) terkait
    await db.delete(payouts).where(eq(payouts.sellerId, userId));
    
    // Hapus saldo (sellerBalances) terkait
    await db.delete(sellerBalances).where(eq(sellerBalances.sellerId, userId));
    
    // Hapus Profil Seller
    await db.delete(sellerProfiles).where(eq(sellerProfiles.userId, userId));
    
    // Terakhir, Hapus User
    await db.delete(users).where(eq(users.id, userId));

    return NextResponse.json({ message: 'UMKM berhasil dihapus' });
  } catch (error) {
    console.error('Delete UMKM Error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server saat menghapus UMKM' },
      { status: 500 }
    );
  }
}
