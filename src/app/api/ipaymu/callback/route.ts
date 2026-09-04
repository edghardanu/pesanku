import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, payments } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { checkTransactionStatus, fulfillOrderPayment } from '@/lib/ipaymu';
import crypto from 'crypto';

/**
 * iPaymu Callback / Notify URL
 * 
 * iPaymu sends a POST request to this URL whenever a transaction
 * status changes (e.g. payment success, failed, expired).
 * 
 * Expected POST body parameters from iPaymu:
 *   trx_id        – iPaymu transaction ID
 *   sid            – Session ID
 *   reference_id   – Our order ID
 *   status         – "berhasil" | "pending" | "expired" | "gagal"
 *   status_code    – Numeric status code
 *   via            – Payment channel used
 */
export async function POST(req: Request) {
  try {
    let body: Record<string, string>;

    // iPaymu can send as application/x-www-form-urlencoded or JSON
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      body = await req.json();
    } else {
      const formData = await req.formData();
      body = Object.fromEntries(formData.entries()) as Record<string, string>;
    }

    const trxId = body.trx_id || body.trxId || '';
    const sid = body.sid || '';
    const referenceId = body.reference_id || body.referenceId || body.referece_id || '';
    const status = (body.status || '').toLowerCase();
    const statusCode = body.status_code || body.statusCode || '';
    const via = body.via || '';

    console.error(`[iPaymu Callback] trx_id=${trxId} sid=${sid} ref=${referenceId} status=${status} code=${statusCode} via=${via}`);

    if (!referenceId) {
      return NextResponse.json({ message: 'No reference_id provided' }, { status: 400 });
    }

    // [SECURITY PATCH] Lapis Dua: Cross-Check ke Server iPaymu Asli
    // Hacker bisa memalsukan callback (spoofing webhook) dengan mengirim status=berhasil.
    // Oleh karena itu, kita paksa ambil data transaksi LANGSUNG dari iPaymu berbekal trxId ini.
    if (trxId) {
      try {
        const verifyData = await checkTransactionStatus(trxId.toString());

        // Memastikan request sukses (Status=200) dari API pengecekan
        if (verifyData.Status === 200 && verifyData.Data) {
          const expectedStatus = parseInt(statusCode, 10);
          const rawRealStatus = verifyData.Data.Status ?? verifyData.Data.status ?? verifyData.Data.StatusCode ?? verifyData.Data.statusCode;
          const realStatusNum = Number(rawRealStatus);
          const realStatusStr = String(rawRealStatus || '').toLowerCase();
          const paidStatusStr = String(verifyData.Data.PaidStatus || verifyData.Data.paidStatus || '').toLowerCase();

          const isClaimedSuccess = expectedStatus === 1 || expectedStatus === 6 || expectedStatus === 7 || status === 'berhasil' || status === 'paid' || status === 'escrow' || statusCode === '1' || statusCode === '6' || statusCode === '7';
          const isRealSuccess = realStatusNum === 1 || realStatusNum === 6 || realStatusNum === 7 || realStatusStr === '1' || realStatusStr === '6' || realStatusStr === '7' || realStatusStr === 'berhasil' || realStatusStr === 'paid' || realStatusStr === 'success' || realStatusStr === 'escrow' || paidStatusStr === 'paid' || paidStatusStr === 'berhasil';

          if (isClaimedSuccess && !isRealSuccess) {
            console.error(`[WARNING] Webhook spoofing terdeteksi untuk order: ${referenceId}, real status: ${rawRealStatus}`);
            return NextResponse.json({ message: 'Forbidden. Invalid Transaction Verification' }, { status: 403 });
          }
        }
      } catch (err) {
        console.error('[WARNING] Gagal saat memverifikasi keamanan transaksi dengan iPaymu:', err);
        // Teruskan pemrosesan jika terjadi galat (fall-back)
      }
    }

    // Cari order
    const order = await db.select().from(orders).where(eq(orders.id, referenceId)).get();
    if (!order) {
      console.error(`[iPaymu Callback] Order not found: ${referenceId}`);
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    // Cari payment record
    const payment = await db.select().from(payments).where(eq(payments.orderId, referenceId)).get();

    const isSuccessCallback = status === 'berhasil' || status === 'paid' || status === 'escrow' || statusCode === '1' || statusCode === '6' || statusCode === '7';

    if (isSuccessCallback) {
      // ✅ Pembayaran berhasil
      const proofStr = `ipaymu:${sid || trxId}:${via}:paid`;
      await fulfillOrderPayment(referenceId, proofStr);
      console.error(`[iPaymu Callback] ✅ Payment SUCCESS for order ${referenceId}`);

    } else if (status === 'expired' || status === 'gagal') {
      // ❌ Pembayaran gagal atau expired
      if (payment) {
        await db.update(payments).set({
          verificationStatus: 'rejected',
          proofUrl: `ipaymu:${sid || trxId}:${via}:${status}`,
        }).where(eq(payments.id, payment.id));
      }

      console.error(`[iPaymu Callback] ❌ Payment ${status.toUpperCase()} for order ${referenceId}`);
    }

    // iPaymu expects a 200 response to acknowledge receipt
    return NextResponse.json({ message: 'OK' }, { status: 200 });

  } catch (error) {
    console.error('[iPaymu Callback] Error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
