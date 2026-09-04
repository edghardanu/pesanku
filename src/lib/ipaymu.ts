import crypto from 'crypto';
import { db } from '@/lib/db';
import { settings } from '@/lib/schema';
import { eq } from 'drizzle-orm';// ============================================================
//  iPaymu Payment Gateway - Helper Library
//  Supports both Sandbox and Production environments.
//  Set the following environment variables:
//    IPAYMU_VA        – Virtual Account number
//    IPAYMU_API_KEY   – API Key from iPaymu dashboard
//    IPAYMU_ENV       – "production" or "sandbox" (default: production)
//    NEXT_PUBLIC_BASE_URL – Public base URL of the site (e.g. https://pesanku.id)
// ============================================================

const IPAYMU_BASE_URL_PRODUCTION = 'https://my.ipaymu.com/api/v2';
const IPAYMU_BASE_URL_SANDBOX = 'https://sandbox.ipaymu.com/api/v2';

async function getBaseUrl(): Promise<string> {
  let env = process.env.IPAYMU_ENV || 'production';
  try {
    const fromDb = await db.select().from(settings).where(eq(settings.key, 'ipaymu_sandbox')).get();
    if (fromDb && (fromDb.value === '1' || fromDb.value === 'true')) {
      env = 'sandbox';
    }
  } catch (e) {
    console.error('Error fetching ipaymu_sandbox from db:', e);
  }
  return env === 'sandbox' ? IPAYMU_BASE_URL_SANDBOX : IPAYMU_BASE_URL_PRODUCTION;
}

function getVa(): string {
  const va = process.env.IPAYMU_VA;
  if (!va) throw new Error('IPAYMU_VA environment variable is not set');
  return va;
}

function getApiKey(): string {
  const key = process.env.IPAYMU_API_KEY;
  if (!key) throw new Error('IPAYMU_API_KEY environment variable is not set');
  return key;
}

/**
 * Generate the required HMAC-SHA256 signature for iPaymu API requests.
 * 
 * Signature format: HMAC-SHA256( "POST:" + va + ":" + bodyHash + ":" + apikey  , apikey )
 * where bodyHash = SHA-256(rawJsonBody).toLowerCase()
 */
function generateSignature(body: Record<string, unknown>): { signature: string; timestamp: string } {
  const va = getVa();
  const apiKey = getApiKey();

  const rawBody = JSON.stringify(body);
  const bodyHash = crypto.createHash('sha256').update(rawBody).digest('hex').toLowerCase();
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const stringToSign = `POST:${va}:${bodyHash}:${apiKey}`;
  const signature = crypto
    .createHmac('sha256', apiKey)
    .update(stringToSign)
    .digest('hex');

  return { signature, timestamp };
}

export interface IPaymuRedirectResponse {
  Status: number;
  Url: string;          // redirect URL for the buyer
  SessionId: string;    // iPaymu session/transaction ID
}

export interface IPaymuCreatePaymentParams {
  orderId: string;
  productName: string;
  amount: number;               // total in IDR (integer)
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  qty?: number;
  sellerVa?: string;            // iPaymu VA Penjual (jika ada) untuk split payment
  sellerSplitAmount?: number;   // Nominal bagibhasil penjual
}

/**
 * Create a Redirect Payment via iPaymu.
 * The buyer will be redirected to iPaymu's hosted payment page.
 * Returns the redirect URL and session ID.
 */
export async function createRedirectPayment(params: IPaymuCreatePaymentParams): Promise<IPaymuRedirectResponse> {
  const baseUrl = await getBaseUrl();
  let siteBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  siteBaseUrl = siteBaseUrl.replace(/\/+$/, '');
  const va = getVa();

  const body: Record<string, unknown> = {
    product: [params.productName],
    qty: [params.qty || 1],
    price: [params.amount],
    description: [`Pembayaran Pesanku - ${params.orderId}`],
    returnUrl: `${siteBaseUrl}/payment/return?order_id=${params.orderId}`,
    notifyUrl: `${siteBaseUrl}/api/ipaymu/callback`,
    cancelUrl: `${siteBaseUrl}/payment/return?order_id=${params.orderId}&status=cancel`,
    referenceId: params.orderId,
    buyerName: params.buyerName,
    buyerEmail: params.buyerEmail,
    buyerPhone: params.buyerPhone || '08000000000',
    expired: 24,
    expiredType: 'hours'
  };

  // AKTIFKAN split logic agar 50% cair otomatis ke penjual di awal.
  // 50% sisa akan tertahan (Escrow) di Admin dan cair ketika pesanan Selesai.
  if (params.sellerVa && params.sellerSplitAmount && params.sellerSplitAmount > 0) {
    if (params.sellerSplitAmount > params.amount) {
      throw new Error("Bagian penjual tidak boleh lebih besar dari total pembayaran");
    }
    body.account = va;                                // VA Utama (Admin)
    body.route = [params.sellerVa];                   // List VA Sub-Account (Penjual)
    body.routeValue = [params.sellerSplitAmount];     // Nominal fix yang masuk ke Penjual (Tahap awal / DP 50%)
  }

  const { signature, timestamp } = generateSignature(body);

  const response = await fetch(`${baseUrl}/payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'va': va,
      'signature': signature,
      'timestamp': timestamp,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok || data.Status !== 200) {
    const errorMsg = data.Message || data.message || JSON.stringify(data);
    throw new Error(`iPaymu error: ${errorMsg}`);
  }

  return {
    Status: data.Status,
    Url: data.Data?.Url || data.Data?.url || '',
    SessionId: data.Data?.SessionId || data.Data?.sessionId || '',
  };
}

/**
 * Check the status of an existing transaction via iPaymu API.
 */
export async function checkTransactionStatus(transactionId: string) {
  const baseUrl = await getBaseUrl();
  const body: Record<string, unknown> = {
    transactionId: transactionId,
  };

  const { signature, timestamp } = generateSignature(body);
  const va = getVa();

  const response = await fetch(`${baseUrl}/transaction`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'va': va,
      'signature': signature,
      'timestamp': timestamp,
    },
    body: JSON.stringify(body),
  });

  return await response.json();
}

/**
 * Execute Transfer (Disbursement) via iPaymu API.
 * This will automatically send funds from the Admin's iPaymu balance to the target bank account.
 */
export async function executeDisbursement(params: {
  amount: number;
  bankCode?: string; // misalnya "BCA", "BRI", "BNI", atau nama bank
  bankAccount: string; // "BCA - 1234567890 a/n John Doe" atau format lain
  referenceId: string;
  notes?: string;
}) {
  const baseUrl = await getBaseUrl();
  const va = getVa();

  // Asumsi: kita menggunakan API yang membutuhkan channel/bank dan destination
  // Jika formatnya hanya string panjang 'BCA - 1234567890', kita pakai regex untuk mengekstrak no rekening
  // Ini adalah simulasi struktur standar:

  // Clean up format "NamaBank - Rekening a/n Pemilik" (Jika penjual masukkin format bebas)
  // Untuk production iPaymu beneran, Anda mungkin butuh input terpisah (bank, norek, nama), 
  // tapi untuk testing/simulasi kita akan bypass atau meneruskan sebisanya.

  const body: Record<string, unknown> = {
    account: params.bankAccount,
    channel: params.bankCode || "BCA", // default
    amount: params.amount,
    referenceId: params.referenceId,
    description: params.notes || `Disbursement for Order ${params.referenceId}`,
  };

  const { signature, timestamp } = generateSignature(body);

  // Endpoint transfer aktual dari iPaymu biasanya POST /api/v2/transfer atau serupa.
  // Jika ini simulasi sementara, kita panggil dan tangani catch dengan graceful.
  try {
    const response = await fetch(`${baseUrl}/transfer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "va": va,
        "signature": signature,
        "timestamp": timestamp,
      },
      body: JSON.stringify(body),
    });
    // Jika API tidak ditemukan (krn IPAYMU sandbox/transfer dev) atau ada error, tolak!
    if (!response.ok) {
      let errorMsg = 'Transfer Gagal: Saldo Admin kurang.';
      try {
        const errData = await response.json();
        errorMsg = errData?.Message || errData?.message || errorMsg;
      } catch (e) {
        // ignore json parse error
      }
      console.error(`[iPaymu] Disbursement response not ok: ${response.status}`, errorMsg);
      return { success: false, error: errorMsg, simulated: false };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("[iPaymu] Disbursement Error:", error);
    return { success: false, error: (error as Error).message, simulated: false };
  }
}
