import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, payments } from '@/lib/schema';
import { eq, sql } from 'drizzle-orm';
import { fulfillOrderPayment } from '@/lib/ipaymu';

/**
 * Flip Callback / Webhook URL
 * 
 * Flip sends a POST request to this URL whenever a bill payment
 * status changes (e.g. payment success, expired).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Flip sends the data field containing the actual payment info
    const data = body.data ? (typeof body.data === 'string' ? JSON.parse(body.data) : body.data) : body;

    const billLinkId = String(data.bill_link_id || data.link_id || '');
    const flipStatus = String(data.status || '').toUpperCase();
    const amount = data.amount || 0;
    const senderBank = data.sender_bank || '';

    console.error(`[Flip Callback] bill_link_id=${billLinkId} status=${flipStatus} amount=${amount} bank=${senderBank}`);

    if (!billLinkId) {
      return NextResponse.json({ message: 'No bill_link_id provided' }, { status: 400 });
    }

    // Find payment record by proofUrl containing flip:{billId} — using indexed DB query
    const matchPayment = await db.select().from(payments)
      .where(sql`${payments.proofUrl} LIKE ${'flip:' + billLinkId + '%'}`)
      .get();

    if (!matchPayment) {
      console.error(`[Flip Callback] Payment not found for bill_link_id: ${billLinkId}`);
      return NextResponse.json({ message: 'Payment not found' }, { status: 404 });
    }

    const orderId = matchPayment.orderId;

    // Cari order
    const order = await db.select().from(orders).where(eq(orders.id, orderId)).get();
    if (!order) {
      console.error(`[Flip Callback] Order not found: ${orderId}`);
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    const isClaimedSuccess = flipStatus === 'SUCCESSFUL' || flipStatus === 'DONE';

    // [SECURITY PATCH] Cross-check ke Flip API sebelum memproses pembayaran
    if (isClaimedSuccess) {
      try {
        const { getFlipConfig } = await import('@/lib/flip');
        const config = await getFlipConfig();
        const authHeader = 'Basic ' + Buffer.from(config.secretKey + ':').toString('base64');

        // Verifikasi status bill ke server Flip langsung
        const verifyRes = await fetch(`${config.baseUrl.replace('/v3', '/v2')}/pwf/${billLinkId}`, {
          headers: { 'Authorization': authHeader },
        });

        if (verifyRes.ok) {
          const verifyData = await verifyRes.json();
          const realStatus = String(verifyData.status || '').toUpperCase();
          if (realStatus !== 'SUCCESSFUL' && realStatus !== 'DONE' && realStatus !== 'PAID') {
            console.error(`[WARNING] Flip webhook spoofing terdeteksi! order=${orderId}, claimed=${flipStatus}, real=${realStatus}`);
            return NextResponse.json({ message: 'Forbidden. Invalid Transaction Verification' }, { status: 403 });
          }
        }
      } catch (verifyErr) {
        console.error('[Flip Callback] Cross-check gagal, melanjutkan proses dengan hati-hati:', verifyErr);
        // Fall through — tetap proses jika API Flip sedang down (resilience)
      }
    }

    if (isClaimedSuccess) {
      // ✅ Pembayaran berhasil (sudah diverifikasi)
      const proofStr = `flip:${billLinkId}:${senderBank}:paid`;
      await fulfillOrderPayment(orderId, proofStr);
      console.error(`[Flip Callback] ✅ Payment SUCCESS for order ${orderId}`);

    } else if (flipStatus === 'FAILED' || flipStatus === 'CANCELLED') {
      // ❌ Pembayaran gagal atau expired
      await db.update(payments).set({
        verificationStatus: 'rejected',
        proofUrl: `flip:${billLinkId}:${senderBank}:${flipStatus.toLowerCase()}`,
      }).where(eq(payments.id, matchPayment.id));

      console.error(`[Flip Callback] ❌ Payment ${flipStatus} for order ${orderId}`);
    }

    // Flip expects a 200 response to acknowledge receipt
    return NextResponse.json({ status: 'OK' }, { status: 200 });

  } catch (error) {
    console.error('[Flip Callback] Error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
