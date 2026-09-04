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

    const { orderId, status, deliveryProofUrl, dispatchReceiptUrl, cancelReason, returnReason, returnProofUrl, returnBankCode, returnBankAccount, requestedDeliveryDate } = await req.json() as {
      orderId?: string;
      status?: unknown;
      deliveryProofUrl?: unknown;
      dispatchReceiptUrl?: unknown;
      cancelReason?: string;
      returnReason?: string;
      returnProofUrl?: string;
      returnBankCode?: string;
      returnBankAccount?: string;
      requestedDeliveryDate?: string;
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

    // ── OTOMATISASI PENCAIRAN DANA (SEBELUM UPDATE DB AGAR BISA DIBATALKAN JIKA GAGAL) ──
    let diprosesDisbursement = false;
    let payoutAmount = 0;

    if (status === 'completed' && orderObj.status !== 'completed') {
      // Ambil settings untuk biaya (fee_aplikasi, fee_jasa, fee_admin)
      // Penjual akan dipotong biaya tambahan ini pada saat pencairan akhir (Escrow)
      const { settings, sellerProfiles } = await import('@/lib/schema');
      const { sql } = await import('drizzle-orm');
      const settingsData = await db.select().from(settings).where(
        sql`${settings.key} IN ('fee_aplikasi', 'fee_jasa', 'fee_admin')`
      ).all();

      let platformFees = 0;
      settingsData.forEach(s => {
        if (s.key === 'fee_aplikasi' || s.key === 'fee_jasa' || s.key === 'fee_admin') {
          platformFees += parseInt(s.value || '0', 10) || 0;
        }
      });

      // Pencairan kedua (Escrow release): Admin mencairkan 50% saldo yang ditahan
      // karena 50% (sellerSplitAmount) sudah dicairkan otomatis via route di awal.
      // DILAKUKAN POTONGAN: seller dibebankan biaya platform.
      const escrowAdminPart = orderObj.adminSplitAmount ?? Math.floor((orderObj.totalPrice || 0) * 0.5);
      payoutAmount = Math.max(0, escrowAdminPart - platformFees);
      const sellerProfile = await db.select().from(sellerProfiles).where(eq(sellerProfiles.userId, sellerId)).get();
      const rawBankAccount = sellerProfile?.bankAccount || 'Unknown Bank';

      const { executeDisbursement } = await import('@/lib/ipaymu');
      const disbursementRes = await executeDisbursement({
        amount: payoutAmount,
        bankAccount: rawBankAccount,
        referenceId: orderId,
        notes: `Pesanku - Pembayaran Lunas untuk Order ${orderId}`
      });

      if (!disbursementRes.success) {
        return NextResponse.json({ error: `Pencairan otomatis gagal: ${disbursementRes.error}` }, { status: 400 });
      }
      diprosesDisbursement = true;
    } else if (status === 'returned' && orderObj.status !== 'returned') {
      // Penjual menyetujui return -> Pengembalian dana 100% secara otomatis ke Pembeli
      payoutAmount = orderObj.totalPrice || 0;
      const buyerBank = `${orderObj.returnBankCode || ''} ${orderObj.returnBankAccount || ''}`.trim();

      const { executeDisbursement } = await import('@/lib/ipaymu');
      const disbursementRes = await executeDisbursement({
        amount: payoutAmount,
        bankAccount: buyerBank,
        referenceId: `REF-${orderId}`,
        notes: `Pesanku - Refund Pesanan ${orderId}`
      });

      if (!disbursementRes.success) {
        return NextResponse.json({ error: `Pengembalian dana (Refund) gagal: ${disbursementRes.error}` }, { status: 400 });
      }
      // diprosesDisbursement tidak diset true di sini karena tabel payouts khusus pencairan penjual
      // Untuk return pencatatannya selesai dengan status 'returned' pada tabel orders saja.
    }

    // ── UPDATE STATUS PESANAN ───────────────────────────────────────────────
    const updateFields: any = { status };
    if (typeof deliveryProofUrl === 'string' && deliveryProofUrl) {
      updateFields.deliveryProofUrl = deliveryProofUrl;
    }
    if (typeof dispatchReceiptUrl === 'string' && dispatchReceiptUrl) {
      let finalDispatchUrl = dispatchReceiptUrl;
      // OCR processing + Cloudinary upload
      if (dispatchReceiptUrl.startsWith('data:image')) {
        // 1. Lakukan OCR via Tesseract.js sebelum di-upload
        try {
          const { createWorker } = await import('tesseract.js');
          const worker = await createWorker('ind');
          const ret = await worker.recognize(dispatchReceiptUrl);
          await worker.terminate();

          const text = ret.data.text;
          const matches = text.match(/\b([A-Z0-9-]{9,25})\b/g);
          if (matches) {
            const withNumbers = matches.find(m => /\d/.test(m));
            updateFields.trackingNumber = withNumbers || matches[0];
          }
        } catch (err) {
          console.error("OCR Error: ", err);
        }

        // 2. Upload ke Cloudinary
        const hasCloudinaryConfig = Boolean(
          process.env.CLOUDINARY_CLOUD_NAME &&
          process.env.CLOUDINARY_API_KEY &&
          process.env.CLOUDINARY_API_SECRET
        );
        if (hasCloudinaryConfig) {
          try {
            const { v2: cloudinary } = await import('cloudinary');
            cloudinary.config({
              cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
              api_key: process.env.CLOUDINARY_API_KEY,
              api_secret: process.env.CLOUDINARY_API_SECRET,
            });
            const uploadResponse = await cloudinary.uploader.upload(dispatchReceiptUrl, { folder: 'pesanku_dispatch' });
            finalDispatchUrl = uploadResponse.secure_url;
          } catch (err) {
            console.error('Cloudinary upload dispatch receipt error:', err);
          }
        }
      }
      updateFields.dispatchReceiptUrl = finalDispatchUrl;
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
      // Removed updateFields.deliveryDate = null; to avoid wiping checkout dates!
    }

    if (requestedDeliveryDate) {
      updateFields.deliveryDate = requestedDeliveryDate;
    }

    await db.update(orders)
      .set(updateFields)
      .where(eq(orders.id, orderId));

    // ── LOGIKA PEMBAGIAN SALDO 50% / 50% ───────────────────────────────────
    if (status === 'verified' && orderObj.status !== 'verified' && orderObj.status !== 'processing' && orderObj.status !== 'completed' && orderObj.status !== 'return_pending') {
      // Pembayaran dikonfirmasi → saldo ditahan (Hanya adminSplitAmount yang ditahan)
      const escrowAmount = orderObj.adminSplitAmount ?? Math.floor((orderObj.totalPrice || 0) * 0.5);
      await addRetainedBalance(sellerId, escrowAmount);
    } else if (status === 'completed' && orderObj.status !== 'completed') {
      if (diprosesDisbursement) {
        // Hapus retainedBalance yang sebelumnya tertahan (Escrow)
        const escrowAmount = orderObj.adminSplitAmount ?? Math.floor(payoutAmount * 0.5);
        await deductRetainedBalance(sellerId, escrowAmount);

        // 3. Catat di tabel payouts (sebagai tanda transfer fisik ke rekening telah diproses)
        const { payouts } = await import('@/lib/schema');
        await db.insert(payouts).values({
          id: crypto.randomUUID(),
          sellerId: sellerId,
          amountRequested: payoutAmount,
          netAmount: payoutAmount,
          status: 'processed',
          processedAt: new Date()
        });
      }
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
