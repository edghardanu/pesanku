import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, payments } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { fulfillOrderPayment } from '@/lib/ipaymu';

/**
 * Flip Callback / Webhook URL
 * 
 * Flip sends a POST request to this URL whenever a bill payment
 * status changes (e.g. payment success, expired).
 * 
 * Flip will send token verification in the header for security.
 * Expected POST body from Flip (JSON):
 *   id            – Bill payment ID
 *   bill_link_id  – Flip Bill Link ID
 *   sender_bank   – Sender's bank name
 *   amount        – Payment amount
 *   status        – "SUCCESSFUL" | "PENDING" | "FAILED" | "CANCELLED"
 *   ...
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

    // Find payment record by proofUrl containing flip:{billId}
    const allPayments = await db.select().from(payments).all();
    const matchPayment = allPayments.find(p => 
      p.proofUrl?.startsWith(`flip:${billLinkId}`) || p.proofUrl === `flip:${billLinkId}`
    );

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

    const isSuccessCallback = flipStatus === 'SUCCESSFUL' || flipStatus === 'DONE';

    if (isSuccessCallback) {
      // ✅ Pembayaran berhasil
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
