import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { payments } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { checkTransactionStatus, fulfillOrderPayment } from '@/lib/ipaymu';

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
        const verifyData = await checkTransactionStatus(orderId);
        if (verifyData.Status === 200 && verifyData.Data) {
          const rawStatus = verifyData.Data.Status ?? verifyData.Data.status;
          const statusNum = Number(rawStatus);
          const statusStr = String(rawStatus || '').toLowerCase();
          const paidStatusStr = String(verifyData.Data.PaidStatus || verifyData.Data.paidStatus || '').toLowerCase();

          const isPaid =
            statusNum === 1 ||
            statusNum === 6 ||
            statusNum === 7 ||
            statusStr === '1' ||
            statusStr === '6' ||
            statusStr === '7' ||
            statusStr === 'berhasil' ||
            statusStr === 'paid' ||
            statusStr === 'escrow' ||
            paidStatusStr === 'paid' ||
            paidStatusStr === 'berhasil';

          if (isPaid) {
            const channel = verifyData.Data.PaymentChannel || verifyData.Data.Channel || verifyData.Data.Via || verifyData.Data.PaymentMethod || 'va';
            const proofStr = `ipaymu:${verifyData.Data.TransactionId || verifyData.Data.SessionId}:${channel}:paid`;
            await fulfillOrderPayment(orderId, proofStr);
            return NextResponse.json({
              paymentStatus: 'approved',
              paymentId: payment?.id || orderId,
            }, { status: 200 });
          }
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
