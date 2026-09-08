import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { payments } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import {
  checkTransactionStatus,
  fulfillOrderPayment,
  getIpaymuPaidProof,
  getIpaymuTransactionLookupId,
  isIpaymuTransactionPaid,
} from '@/lib/ipaymu';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json({ error: 'orderId wajib diisi' }, { status: 400 });
    }

    const payment = await db
      .select()
      .from(payments)
      .where(eq(payments.orderId, orderId))
      .get();

    // If status is pending or not found yet, check iPaymu API directly
    if (!payment || payment.verificationStatus === 'pending') {
      try {
        const lookupId = getIpaymuTransactionLookupId(payment?.proofUrl, orderId);
        const verifyData = await checkTransactionStatus(lookupId);
        if (isIpaymuTransactionPaid(verifyData)) {
          await fulfillOrderPayment(orderId, getIpaymuPaidProof(verifyData, lookupId));
          return NextResponse.json({
            paymentStatus: 'approved',
            paymentId: payment?.id || orderId,
          }, { status: 200 });
        }
      } catch (checkErr) {
        console.error('[iPaymu Status GET] API Check error:', checkErr);
      }
    }

    if (!payment) {
      return NextResponse.json({ paymentStatus: 'not_found' }, { status: 200 });
    }

    return NextResponse.json({
      paymentStatus: payment.verificationStatus,
      paymentId: payment.id,
    }, { status: 200 });

  } catch (error) {
    console.error('iPaymu status check error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
