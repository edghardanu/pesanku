import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, products, sellerBalances, sellerProfiles, settings, payouts } from '@/lib/schema';
import { getUserFromSession } from '@/lib/auth';
import { eq, sql } from 'drizzle-orm';
import cloudinary from '@/lib/cloudinary';
import crypto from 'crypto';
import { executeFlipDisbursement } from '@/lib/flip';

export async function PUT(req: Request) {
  try {
    const user = await getUserFromSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { orderId, status, deliveryProofUrl, dispatchReceiptUrl, cancelReason, returnReason, returnProofUrl, returnBankCode, returnBankAccount, requestedDeliveryDate, driverName, driverPhone, trackingNumber } = await req.json() as {
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
      driverName?: string;
      driverPhone?: string;
      trackingNumber?: string;
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

    // Deduct dari available balance penjual (untuk penalti penjual)
    const deductAvailableBalance = async (sid: string, amount: number) => {
      const balanceObj = await db.select().from(sellerBalances).where(eq(sellerBalances.sellerId, sid)).get();
      if (balanceObj) {
        await db.update(sellerBalances)
          .set({ availableBalance: Math.max(0, (balanceObj.availableBalance || 0) - amount) })
          .where(eq(sellerBalances.id, balanceObj.id));
      }
    };

    // ── FETCH ADMIN PENALTY SETTINGS ────────────────────────────────────────
    const fetchPenaltySettings = async () => {
      const penaltyKeys = ['penalty_days', 'penalty_percentage_admin', 'penalty_percentage_seller', 'penalty_percentage', 'penalty_seller_to_admin', 'penalty_seller_to_buyer'];
      const penaltySettingsData = await db.select().from(settings).where(
        sql`${settings.key} IN (${sql.join(penaltyKeys.map(k => sql`${k}`), sql`, `)})`
      ).all();
      
      let penaltyDays = 1;
      let penaltyPercentageAdmin = 0; // % denda pembeli ke admin
      let penaltyPercentageSeller = 0; // % denda pembeli ke penjual
      let penaltySellerToAdmin = 0;    // % denda penjual ke admin
      let penaltySellerToBuyer = 0;    // % denda penjual ke pembeli

      penaltySettingsData.forEach(s => {
        if (s.key === 'penalty_days') penaltyDays = parseInt(s.value) || 1;
        if (s.key === 'penalty_percentage_admin') penaltyPercentageAdmin = parseInt(s.value) || 0;
        if (s.key === 'penalty_percentage_seller') penaltyPercentageSeller = parseInt(s.value) || 0;
        if (s.key === 'penalty_percentage') {
          // Legacy fallback
          if (penaltyPercentageSeller === 0) penaltyPercentageSeller = parseInt(s.value) || 0;
        }
        if (s.key === 'penalty_seller_to_admin') penaltySellerToAdmin = parseInt(s.value) || 0;
        if (s.key === 'penalty_seller_to_buyer') penaltySellerToBuyer = parseInt(s.value) || 0;
      });

      return { penaltyDays, penaltyPercentageAdmin, penaltyPercentageSeller, penaltySellerToAdmin, penaltySellerToBuyer };
    };

    // ── Check if order is within penalty window (H-X from delivery) ─────────
    const isWithinPenaltyWindow = async (penaltyDays: number): Promise<boolean> => {
      // Check preorder schedule first
      const scheduleKey = `preorder_schedule:${sellerId}:${orderId}`;
      const scheduleSetting = await db.select().from(settings).where(eq(settings.key, scheduleKey)).get();
      
      if (scheduleSetting) {
        try {
          const parsed = JSON.parse(scheduleSetting.value);
          if (parsed.deliveryDate) {
            const deliveryTime = new Date(parsed.deliveryDate).getTime();
            const now = Date.now();
            const msInDays = penaltyDays * 24 * 60 * 60 * 1000;
            if ((deliveryTime - now) <= msInDays) return true;
          }
        } catch(e) {}
      }

      // Fallback: check order's deliveryDate field
      if (orderObj.deliveryDate) {
        try {
          const deliveryTime = new Date(orderObj.deliveryDate as string).getTime();
          const now = Date.now();
          const msInDays = penaltyDays * 24 * 60 * 60 * 1000;
          if ((deliveryTime - now) <= msInDays) return true;
        } catch(e) {}
      }

      // If already in processing/preorder_running, always within penalty window
      if (['processing', 'preorder_running'].includes(orderObj.status || '')) {
        return true;
      }

      return false;
    };

    // ── FETCH PLATFORM FEES ─────────────────────────────────────────────────
    const fetchPlatformFees = async () => {
      const settingsData = await db.select().from(settings).where(
        sql`${settings.key} IN ('fee_aplikasi', 'fee_jasa', 'fee_admin', 'checkout_fees_config')`
      ).all();

      let platformFees = 0;
      let hasCustomFees = false;
      
      settingsData.forEach(s => {
        if (s.key === 'checkout_fees_config') {
          try {
            const feesList = JSON.parse(s.value);
            if (Array.isArray(feesList)) {
              feesList.forEach(fee => {
                platformFees += (parseInt(fee.value, 10) || 0);
              });
              hasCustomFees = true;
            }
          } catch(e) {}
        }
      });

      if (!hasCustomFees) {
        settingsData.forEach(s => {
          if (s.key === 'fee_aplikasi' || s.key === 'fee_jasa' || s.key === 'fee_admin') {
            platformFees += parseInt(s.value || '0', 10) || 0;
          }
        });
      }

      return platformFees;
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

    // ── OTOMATISASI PENCAIRAN DANA & PENALTI ────────────────────────────────
    let diprosesDisbursement = false;
    let payoutAmount = 0;

    // ═══════════════════════════════════════════════════════════════════════
    // KRITERIA 1: Pembeli klik "Selesaikan Pesanan" → Dana bersih ke penjual 
    // Dana sudah ada di admin (Flip escrow). Saat completed, cairkan ke penjual 
    // dipotong biaya platform dari pengaturan admin.
    // ═══════════════════════════════════════════════════════════════════════
    if (status === 'completed' && orderObj.status !== 'completed') {
      // Pencairan akhir: Admin mencairkan 100% harga produk ke Penjual
      // (Biaya tambahan jasa/admin sudah dibayarkan oleh pembeli saat checkout langsung ke saldo akumulatif Flip Admin)
      payoutAmount = Math.max(0, (orderObj.totalPrice || 0));
      
      const sellerProfile = await db.select().from(sellerProfiles).where(eq(sellerProfiles.userId, sellerId)).get();
      const rawBankAccount = sellerProfile?.bankAccount || 'Unknown Bank';

      // FLIP DISBURSEMENT (Pay-Out ke Penjual)
      const disbursementRes = await executeFlipDisbursement({
        amount: payoutAmount,
        bankAccount: rawBankAccount,
        referenceId: orderId,
        notes: `Pesanku - Pembayaran Lunas untuk Order ${orderId}`
      });

      if (!disbursementRes.success) {
        return NextResponse.json({ error: `Pencairan Flip otomatis gagal: ${disbursementRes.error}` }, { status: 400 });
      }
      diprosesDisbursement = true;

    // ═══════════════════════════════════════════════════════════════════════
    // KRITERIA 3: Penjual membatalkan pesanan yang sudah dibayar
    // Penjual mendapat penalti (penalty_seller_to_admin + penalty_seller_to_buyer)
    // Dana pembeli dikembalikan (100% - penalti admin, sisa ke pembeli)
    // Penalti penjual: potongan dari saldo penjual
    // ═══════════════════════════════════════════════════════════════════════
    } else if (status === 'cancelled' && user.role === 'penjual' && orderObj.status !== 'cancelled') {
      const isPaid = ['verified', 'preorder_running', 'processing'].includes(orderObj.status || '');
      
      if (isPaid) {
        const penaltyConfig = await fetchPenaltySettings();
        const inPenaltyWindow = await isWithinPenaltyWindow(penaltyConfig.penaltyDays);

        let sellerPenaltyToAdmin = 0;
        let sellerPenaltyToBuyer = 0;

        if (inPenaltyWindow) {
          // Penalti penjual ke admin (% dari harga produk)
          sellerPenaltyToAdmin = Math.round((penaltyConfig.penaltySellerToAdmin / 100) * orderObj.totalPrice);
          // Penalti penjual ke pembeli (% dari harga produk)
          sellerPenaltyToBuyer = Math.round((penaltyConfig.penaltySellerToBuyer / 100) * orderObj.totalPrice);
        }

        const totalSellerPenalty = sellerPenaltyToAdmin + sellerPenaltyToBuyer;

        // Refund FULL 100% ke pembeli (karena penjual yang batal, pembeli tidak salah)
        // Dana sudah ada di admin (escrow)
        // TODO: Refund otomatis bisa diimplementasikan jika pembeli menyimpan data bank
        
        // Potong saldo penjual sebagai denda
        if (totalSellerPenalty > 0) {
          await deductAvailableBalance(sellerId, totalSellerPenalty);
        }

        // Hapus retained balance (escrow dikembalikan, bukan ke penjual)
        const escrowAmount = orderObj.totalPrice || 0;
        await deductRetainedBalance(sellerId, escrowAmount);
      }

    // ═══════════════════════════════════════════════════════════════════════
    // KRITERIA 4: Penjual melebihi batas hari pemrosesan yang sudah disetujui
    // Cek otomatis saat penjual mengubah status (opsional - bisa juga via cron)
    // Logika ini tertanam di proses cancelled oleh siapapun pada pesanan 
    // yang sudah melewati deadline
    // ═══════════════════════════════════════════════════════════════════════

    } else if (status === 'returned' && orderObj.status !== 'returned') {
      // Penjual menyetujui return -> Pengembalian dana 100% secara otomatis ke Pembeli
      payoutAmount = orderObj.totalPrice || 0;
      const buyerBank = `${orderObj.returnBankCode || ''} ${orderObj.returnBankAccount || ''}`.trim();

      // Gunakan Flip Business API
      const disbursementRes = await executeFlipDisbursement({
        amount: payoutAmount,
        bankAccount: buyerBank,
        referenceId: `REF-${orderId}`,
        notes: `Pesanku - Refund Pesanan ${orderId}`
      });

      if (!disbursementRes.success) {
        return NextResponse.json({ error: `Pengembalian dana (Refund) gagal: ${disbursementRes.error}` }, { status: 400 });
      }
    }

    const updateFields: any = { status };
    
    if (driverName) updateFields.driverName = driverName;
    if (driverPhone) updateFields.driverPhone = driverPhone;
    if (trackingNumber) updateFields.trackingNumber = trackingNumber;

    if (typeof deliveryProofUrl === 'string' && deliveryProofUrl) {
      updateFields.deliveryProofUrl = deliveryProofUrl;
    }
    if (typeof dispatchReceiptUrl === 'string' && dispatchReceiptUrl) {
      let finalDispatchUrl = dispatchReceiptUrl;
      // OCR processing + Cloudinary upload
      if (dispatchReceiptUrl.startsWith('data:image')) {
        // 1. Lakukan OCR via Tesseract.js sebelum di-upload
        try {
          // @ts-ignore
          const { createWorker } = await import('tesseract.js');
          const worker = await createWorker('ind');
          const ret = await worker.recognize(dispatchReceiptUrl);
          await worker.terminate();

          const text = ret.data.text;
          const matches = text.match(/\b([A-Z0-9-]{9,25})\b/g);
          if (matches) {
            const withNumbers = matches.find((m: string) => /\d/.test(m));
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

    // Cancelled reason - enhanced with penalty details
    if (status === 'cancelled') {
      if (user.role === 'penjual') {
        const isPaid = ['verified', 'preorder_running', 'processing'].includes(orderObj.status || '');
        if (isPaid) {
          const penaltyConfig = await fetchPenaltySettings();
          const inPenaltyWindow = await isWithinPenaltyWindow(penaltyConfig.penaltyDays);
          
          let sellerPenaltyToAdmin = 0;
          let sellerPenaltyToBuyer = 0;
          if (inPenaltyWindow) {
            sellerPenaltyToAdmin = Math.round((penaltyConfig.penaltySellerToAdmin / 100) * orderObj.totalPrice);
            sellerPenaltyToBuyer = Math.round((penaltyConfig.penaltySellerToBuyer / 100) * orderObj.totalPrice);
          }
          const totalSellerPenalty = sellerPenaltyToAdmin + sellerPenaltyToBuyer;
          
          updateFields.cancelReason = totalSellerPenalty > 0
            ? `Dibatalkan oleh penjual. Denda pinalti penjual (H-${penaltyConfig.penaltyDays}): Rp ${totalSellerPenalty.toLocaleString('id-ID')} (Ke Admin: Rp ${sellerPenaltyToAdmin.toLocaleString('id-ID')}, Ke Pembeli: Rp ${sellerPenaltyToBuyer.toLocaleString('id-ID')}). Dana pembeli akan dikembalikan 100%.`
            : `Dibatalkan oleh penjual. Dana pembeli akan dikembalikan 100%.`;
          updateFields.adminSplitAmount = sellerPenaltyToAdmin;
          updateFields.sellerSplitAmount = sellerPenaltyToBuyer;
        } else {
          updateFields.cancelReason = cancelReason || 'Dibatalkan oleh penjual.';
        }
      } else {
        updateFields.cancelReason = cancelReason || 'Dibatalkan.';
      }
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
    }

    if (requestedDeliveryDate) {
      updateFields.deliveryDate = requestedDeliveryDate;
    }

    await db.update(orders)
      .set(updateFields)
      .where(eq(orders.id, orderId));

    // ── LOGIKA PEMBAGIAN SALDO (100% DITAHAN ADMIN / ESCROW) ────────────────
    if (status === 'verified' && orderObj.status !== 'verified' && orderObj.status !== 'processing' && orderObj.status !== 'completed' && orderObj.status !== 'return_pending') {
      // Pembayaran dikonfirmasi → escrow ditahan 100% dari harga produk di sisi admin
      const escrowAmount = orderObj.totalPrice || 0;
      await addRetainedBalance(sellerId, escrowAmount);
    } else if (status === 'completed' && orderObj.status !== 'completed') {
      if (diprosesDisbursement) {
        // Hapus retainedBalance yang sebelumnya tertahan (Escrow) 100%
        const escrowAmount = orderObj.totalPrice || 0;
        await deductRetainedBalance(sellerId, escrowAmount);

        // Catat di tabel payouts (sebagai tanda transfer fisik ke rekening telah diproses)
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
      // Potong 100% dari retainedBalance karena pesanan dikembalikan full
      const sellerShare = orderObj.totalPrice || 0;
      await deductRetainedBalance(sellerId, sellerShare);
    }

    return NextResponse.json({ message: 'Status pesanan berhasil diperbarui' }, { status: 200 });
  } catch (error) {
    console.error('Update order status error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan saat memperbarui status' }, { status: 500 });
  }
}
