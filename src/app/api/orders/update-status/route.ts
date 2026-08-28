import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, products, sellerBalances, settings } from '@/lib/schema';
import { getUserFromSession } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import cloudinary from '@/lib/cloudinary';
import crypto from 'crypto';

export async function PUT(req: Request) {
  try {
    const user = await getUserFromSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { orderId, status, deliveryProofUrl, dispatchReceiptUrl, cancelReason, returnReason, returnProofUrl, returnBankCode, returnBankAccount } = await req.json() as {
      orderId?: string;
      status?: unknown;
      deliveryProofUrl?: unknown;
      dispatchReceiptUrl?: unknown;
      cancelReason?: string;
      returnReason?: string;
      returnProofUrl?: string;
      returnBankCode?: string;
      returnBankAccount?: string;
    };

    if (!orderId || !status) {
      return NextResponse.json({ error: 'Order ID dan status wajib diisi' }, { status: 400 });
    }

    const validStatuses = ['waiting_verification', 'verified', 'processing', 'completed', 'cancelled', 'failed', 'preorder_running', 'return_pending', 'returned'] as const;
    type OrderStatusUpdate = (typeof validStatuses)[number];
    const isValidStatus = (value: unknown): value is OrderStatusUpdate =>
      typeof value === 'string' && validStatuses.includes(value as OrderStatusUpdate);

    if (!isValidStatus(status)) {
      return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 });
    }

    // Ambil detail pesanan
    const orderObj = await db.select().from(orders).where(eq(orders.id, orderId)).get();
    if (!orderObj) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 });
    }

    // Validasi Otoritas
    if (user.role !== 'admin') {
      if (user.role === 'pembeli') {
        if (orderObj.buyerId !== user.id) {
          return NextResponse.json({ error: 'Unauthorized. Ini bukan pesanan Anda.' }, { status: 403 });
        }
        if (status !== 'completed' && status !== 'cancelled' && status !== 'return_pending') {
          return NextResponse.json({ error: 'Pembeli hanya dapat menyelesaikan, membatalkan, atau mengajukan kembalikan pesanan.' }, { status: 403 });
        }
      } else if (user.role !== 'penjual') {
        return NextResponse.json({ error: 'Unauthorized. Role tidak dikenali.' }, { status: 403 });
      }
    }

    // Ambil detail produk untuk mengetahui sellerId
    const productObj = await db.select({ sellerId: products.sellerId }).from(products).where(eq(products.id, orderObj.productId)).get();
    if (!productObj) {
      return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 });
    }
    const sellerId = productObj.sellerId;

    if (user.role === 'penjual' && sellerId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized. Pesanan ini bukan milik toko Anda.' }, { status: 403 });
    }

    // ── FUNGSI BANTU SALDO ──────────────────────────────────────────────────
    
    // Saat penjual konfirmasi (→ processing): tambahkan ke retainedBalance (saldo ditahan)
    const addRetainedBalance = async (sid: string, amount: number) => {
      const balanceObj = await db.select().from(sellerBalances).where(eq(sellerBalances.sellerId, sid)).get();
      if (!balanceObj) {
        await db.insert(sellerBalances).values({
          id: crypto.randomUUID(),
          sellerId: sid,
          availableBalance: 0,
          retainedBalance: amount,
        });
      } else {
        await db.update(sellerBalances)
          .set({ retainedBalance: (balanceObj.retainedBalance || 0) + amount })
          .where(eq(sellerBalances.id, balanceObj.id));
      }
    };

    // Saat pembeli selesaikan pesanan (→ completed): cairkan dari retained → available
    const releaseRetainedToAvailable = async (sid: string, amount: number) => {
      const balanceObj = await db.select().from(sellerBalances).where(eq(sellerBalances.sellerId, sid)).get();
      if (!balanceObj) {
        // Fallback: langsung ke available jika belum ada record
        await db.insert(sellerBalances).values({
          id: crypto.randomUUID(),
          sellerId: sid,
          availableBalance: amount,
          retainedBalance: 0,
        });
      } else {
        const currentRetained = balanceObj.retainedBalance || 0;
        // Pastikan tidak mengurangi lebih dari yang tertahan
        const toRelease = Math.min(amount, currentRetained);
        await db.update(sellerBalances)
          .set({
            retainedBalance: currentRetained - toRelease,
            availableBalance: (balanceObj.availableBalance || 0) + toRelease,
          })
          .where(eq(sellerBalances.id, balanceObj.id));
      }
    };

    // Tambahkan saldo langsung ke availableBalance
    const addAvailableBalance = async (sid: string, amount: number) => {
      const balanceObj = await db.select().from(sellerBalances).where(eq(sellerBalances.sellerId, sid)).get();
      if (!balanceObj) {
        await db.insert(sellerBalances).values({
          id: crypto.randomUUID(),
          sellerId: sid,
          availableBalance: amount,
          retainedBalance: 0,
        });
      } else {
        await db.update(sellerBalances)
          .set({ availableBalance: (balanceObj.availableBalance || 0) + amount })
          .where(eq(sellerBalances.id, balanceObj.id));
      }
    };

    // Tolak return: potong dari retained balance
    const deductRetainedBalance = async (sid: string, amount: number) => {
      const balanceObj = await db.select().from(sellerBalances).where(eq(sellerBalances.sellerId, sid)).get();
      if (balanceObj) {
        const currentRetained = balanceObj.retainedBalance || 0;
        await db.update(sellerBalances)
          .set({ retainedBalance: Math.max(0, currentRetained - amount) })
          .where(eq(sellerBalances.id, balanceObj.id));
      }
    };

    // Handling Return Proof image upload via Cloudinary if base64
    let uploadedReturnProofUrl = null;
    if (status === 'return_pending' && typeof returnProofUrl === 'string') {
      if (returnProofUrl.startsWith('data:image')) {
        const hasCloudinaryConfig = Boolean(
          process.env.CLOUDINARY_CLOUD_NAME &&
          process.env.CLOUDINARY_API_KEY &&
          process.env.CLOUDINARY_API_SECRET
        );
        if (hasCloudinaryConfig) {
          try {
            const uploadResponse = await cloudinary.uploader.upload(returnProofUrl, { folder: 'pesanku_returns' });
            uploadedReturnProofUrl = uploadResponse.secure_url;
          } catch (err) {
            console.error('Cloudinary upload return proof error:', err);
            uploadedReturnProofUrl = returnProofUrl;
          }
        } else {
          uploadedReturnProofUrl = returnProofUrl;
        }
      } else {
        uploadedReturnProofUrl = returnProofUrl;
      }
    }

    // ── UPDATE STATUS PESANAN ───────────────────────────────────────────────
    const updateFields: any = { status };
    if (typeof deliveryProofUrl === 'string' && deliveryProofUrl) {
      updateFields.deliveryProofUrl = deliveryProofUrl;
    }
    if (typeof dispatchReceiptUrl === 'string' && dispatchReceiptUrl) {
      updateFields.dispatchReceiptUrl = dispatchReceiptUrl;
    }
    if (status === 'cancelled' && cancelReason) {
      updateFields.cancelReason = cancelReason;
    }
    if (status === 'return_pending') {
      updateFields.returnReason = returnReason || 'Tidak ada alasan';
      updateFields.returnProofUrl = uploadedReturnProofUrl || null;
      updateFields.returnBankCode = returnBankCode || null;
      updateFields.returnBankAccount = returnBankAccount || null;
      updateFields.returnDate = new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta'
      }).format(new Date()).replace('.', ':') + ' WIB';
    }
    // Jika return dibatalkan/ditolak oleh penjual, status kembali ke 'processing'
    if (status === 'processing' && orderObj.status === 'return_pending') {
      updateFields.returnReason = null;
      updateFields.returnProofUrl = null;
      updateFields.returnDate = null;
    }

    if (status === 'waiting_verification' || status === 'verified') {
      const scheduleKey = `preorder_schedule:${sellerId}:${orderId}`;
      await db.delete(settings).where(eq(settings.key, scheduleKey));
      updateFields.deliveryDate = null;
    }

    await db.update(orders)
      .set(updateFields)
      .where(eq(orders.id, orderId));

    // ── LOGIKA PEMBAGIAN SALDO 50% / 50% ───────────────────────────────────
    if (status === 'processing' && orderObj.status !== 'processing' && orderObj.status !== 'completed' && orderObj.status !== 'return_pending') {
      // Gunakan sellerSplitAmount yang sudah tersimpan, fallback ke 50%
      const sellerShare = orderObj.sellerSplitAmount ?? Math.floor((orderObj.totalPrice || 0) * 0.5);
      await addRetainedBalance(sellerId, sellerShare);
    } else if (status === 'completed' && orderObj.status !== 'completed') {
      // 1. Cairkan 50% dari retained ke available
      const sellerShare = orderObj.sellerSplitAmount ?? Math.floor((orderObj.totalPrice || 0) * 0.5);
      await releaseRetainedToAvailable(sellerId, sellerShare);

      // 2. Cairkan sisa 50% lagi dari admin ke available
      const adminShare = orderObj.adminSplitAmount ?? Math.floor((orderObj.totalPrice || 0) * 0.5);
      await addAvailableBalance(sellerId, adminShare);
    } else if (status === 'returned' && orderObj.status !== 'returned') {
      // Potong 50% dari retainedBalance karena pesanan dikembalikan
      const sellerShare = orderObj.sellerSplitAmount ?? Math.floor((orderObj.totalPrice || 0) * 0.5);
      await deductRetainedBalance(sellerId, sellerShare);
    }

    return NextResponse.json({ message: 'Status pesanan berhasil diperbarui' }, { status: 200 });
  } catch (error) {
    console.error('Update order status error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan saat memperbarui status' }, { status: 500 });
  }
}
