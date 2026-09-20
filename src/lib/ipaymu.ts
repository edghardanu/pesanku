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

// ── Cloudflare Worker Proxy ────────────────────────────────────────────────
// Jika IPAYMU_PROXY_URL di-set, semua request ke iPaymu akan diteruskan melalui
// Cloudflare Worker proxy untuk menghindari masalah IP whitelist di Vercel free.
// Contoh: IPAYMU_PROXY_URL=https://ipaymu-proxy.username.workers.dev
// IPAYMU_PROXY_SECRET harus sama dengan PROXY_SECRET di worker script.
function getProxyConfig(): { proxyUrl: string | null; proxySecret: string | null } {
  return {
    proxyUrl: process.env.IPAYMU_PROXY_URL || null,
    proxySecret: process.env.IPAYMU_PROXY_SECRET || null,
  };
}

/**
 * Wrapper fetch yang otomatis routing ke Cloudflare Worker proxy jika dikonfigurasi.
 * Jika tidak, langsung panggil iPaymu.
 */
async function ipaymuFetch(
  endpoint: string,           // e.g. "/payment"
  body: Record<string, unknown>,
  headers: Record<string, string>,
  isSandbox?: boolean
): Promise<Response> {
  const { proxyUrl, proxySecret } = getProxyConfig();

  if (proxyUrl && proxySecret) {
    // ── Via Cloudflare Worker proxy ──────────────────────────────────────
    const targetUrl = `${proxyUrl}${endpoint}`;
    const proxyHeaders: Record<string, string> = {
      ...headers,
      'x-proxy-secret': proxySecret,
    };
    if (isSandbox) {
      proxyHeaders['x-ipaymu-env'] = 'sandbox';
    }
    return fetch(targetUrl, {
      method: 'POST',
      headers: proxyHeaders,
      body: JSON.stringify(body),
    });
  }

  // ── Direct call ke iPaymu (tanpa proxy) ─────────────────────────────────
  const baseUrl = isSandbox ? IPAYMU_BASE_URL_SANDBOX : IPAYMU_BASE_URL_PRODUCTION;
  return fetch(`${baseUrl}${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

export interface IpaymuConfig {
  baseUrl: string;
  va: string;
  apiKey: string;
}

async function getIpaymuConfig(): Promise<IpaymuConfig> {
  let isSandbox = process.env.IPAYMU_ENV === 'sandbox';
  try {
    const fromDb = await db.select().from(settings).where(eq(settings.key, 'ipaymu_sandbox')).get();
    if (fromDb && (fromDb.value === '1' || fromDb.value === 'true')) {
      isSandbox = true;
    }
  } catch (e) {
    console.error('Error fetching ipaymu_sandbox from db:', e);
  }

  if (isSandbox) {
    return {
      baseUrl: IPAYMU_BASE_URL_SANDBOX,
      va: process.env.IPAYMU_VA_SANDBOX || (() => { throw new Error('IPAYMU_VA_SANDBOX not set'); })(),
      apiKey: process.env.IPAYMU_API_KEY_SANDBOX || (() => { throw new Error('IPAYMU_API_KEY_SANDBOX not set'); })()
    };
  }

  const va = process.env.IPAYMU_VA;
  if (!va) throw new Error('IPAYMU_VA environment variable is not set');

  const apiKey = process.env.IPAYMU_API_KEY;
  if (!apiKey) throw new Error('IPAYMU_API_KEY environment variable is not set');

  return {
    baseUrl: IPAYMU_BASE_URL_PRODUCTION,
    va,
    apiKey
  };
}

/**
 * Generate the required HMAC-SHA256 signature for iPaymu API requests.
 * 
 * Signature format: HMAC-SHA256( "POST:" + va + ":" + bodyHash + ":" + apikey  , apikey )
 * where bodyHash = SHA-256(rawJsonBody).toLowerCase()
 */
function generateSignature(body: Record<string, unknown>, va: string, apiKey: string): { signature: string; timestamp: string } {

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
  customBaseUrl?: string;       // Dynamic base URL derived from request headers
}

/**
 * Create a Redirect Payment via iPaymu.
 * The buyer will be redirected to iPaymu's hosted payment page.
 * Returns the redirect URL and session ID.
 */
export async function createRedirectPayment(params: IPaymuCreatePaymentParams): Promise<IPaymuRedirectResponse> {
  const { baseUrl, va, apiKey } = await getIpaymuConfig();
  const isSandbox = baseUrl === IPAYMU_BASE_URL_SANDBOX;
  let siteBaseUrl = params.customBaseUrl || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  siteBaseUrl = siteBaseUrl.replace(/\/+$/, '');

  const body: Record<string, unknown> = {
    product: [params.qty && params.qty > 1 ? `${params.productName} (x${params.qty})` : params.productName],
    qty: [1],
    price: [params.amount],
    description: [`Pembayaran Pesanku - ${params.orderId}`],
    returnUrl: `${siteBaseUrl}/payment/return?order_id=${params.orderId}`,
    notifyUrl: `${siteBaseUrl}/api/ipaymu/callback`,
    cancelUrl: `${siteBaseUrl}/buyer/orders`,
    referenceId: params.orderId,
    buyerName: params.buyerName,
    buyerEmail: params.buyerEmail,
    buyerPhone: params.buyerPhone || '08000000000',
    expired: process.env.IPAYMU_EXPIRED_HOURS ? parseInt(process.env.IPAYMU_EXPIRED_HOURS, 10) : 24,
    expiredType: 'hours'
  };

  if (process.env.IPAYMU_TIMEOUT) {
    body.timeout = parseInt(process.env.IPAYMU_TIMEOUT, 10);
  }

  if (params.sellerVa && params.sellerSplitAmount && params.sellerSplitAmount > 0) {
    if (params.sellerSplitAmount > params.amount) {
      throw new Error("Bagian penjual tidak boleh lebih besar dari total pembayaran");
    }
    body.account = va;
    body.route = [params.sellerVa];
    body.routeValue = [params.sellerSplitAmount];
  }

  const { signature, timestamp } = generateSignature(body, va, apiKey);
  const headers = {
    'Content-Type': 'application/json',
    'va': va,
    'signature': signature,
    'timestamp': timestamp,
  };

  const response = await ipaymuFetch('/payment', body, headers, isSandbox);
  const data = await response.json();

  if (!response.ok || data.Status !== 200) {
    const errorMsg = data.Message || data.message || JSON.stringify(data);
    throw new Error(`iPaymu error: ${errorMsg}`);
  }

  return {
    Status: data.Status,
    Url: data.Data?.Url || data.Data?.url || '',
    SessionId: data.Data?.SessionID || data.Data?.SessionId || data.Data?.sessionId || '',
  };
}

/**
 * Check the status of an existing transaction via iPaymu API.
 */
export async function checkTransactionStatus(transactionId: string) {
  const { baseUrl, va, apiKey } = await getIpaymuConfig();
  const isSandbox = baseUrl === IPAYMU_BASE_URL_SANDBOX;
  const body: Record<string, unknown> = {
    transactionId: transactionId,
  };

  const { signature, timestamp } = generateSignature(body, va, apiKey);
  const headers = {
    'Content-Type': 'application/json',
    'va': va,
    'signature': signature,
    'timestamp': timestamp,
  };

  const response = await ipaymuFetch('/transaction', body, headers, isSandbox);
  return await response.json();
}

type IpaymuTransactionRecord = Record<string, unknown>;

/**
 * Respons Check Transaction iPaymu pernah dikembalikan sebagai objek maupun
 * array. Normalisasi di satu tempat agar semua endpoint membaca transaksi yang
 * sama dan tidak melewatkan pembayaran yang sudah selesai.
 */
export function getIpaymuTransactionRecord(response: unknown): IpaymuTransactionRecord | null {
  if (!response || typeof response !== 'object') return null;

  const envelope = response as IpaymuTransactionRecord;
  const rawData = envelope.Data ?? envelope.data;
  if (Array.isArray(rawData)) {
    const firstItem = rawData[0];
    return firstItem && typeof firstItem === 'object'
      ? firstItem as IpaymuTransactionRecord
      : null;
  }

  if (!rawData || typeof rawData !== 'object') return null;
  const data = rawData as IpaymuTransactionRecord;
  const nestedTransaction = data.Transaction ?? data.transaction;
  if (Array.isArray(nestedTransaction)) {
    const firstItem = nestedTransaction[0];
    return firstItem && typeof firstItem === 'object'
      ? firstItem as IpaymuTransactionRecord
      : null;
  }

  return data;
}

export function isIpaymuTransactionPaid(response: unknown): boolean {
  if (!response || typeof response !== 'object') return false;
  const envelope = response as IpaymuTransactionRecord;
  if (Number(envelope.Status ?? envelope.status) !== 200) return false;

  const transaction = getIpaymuTransactionRecord(response);
  if (!transaction) return false;

  const numericStatuses = [
    transaction.Status,
    transaction.status,
    transaction.StatusCode,
    transaction.statusCode,
    transaction.TransactionStatusCode,
    transaction.transactionStatusCode,
    transaction.transaction_status_code,
  ].map(value => Number(value));

  if (numericStatuses.some(value => value === 1 || value === 6 || value === 7)) {
    return true;
  }

  const successfulStatuses = new Set([
    'paid',
    'berhasil',
    'success',
    'sukses',
    'selesai',
    'completed',
    'escrow',
  ]);
  const textualStatuses = [
    transaction.Status,
    transaction.status,
    transaction.StatusDesc,
    transaction.statusDesc,
    transaction.status_desc,
    transaction.PaidStatus,
    transaction.paidStatus,
  ].map(value => String(value ?? '').trim().toLowerCase());

  return textualStatuses.some(value => successfulStatuses.has(value));
}

export function getIpaymuTransactionLookupId(proofUrl: string | null | undefined, fallbackId: string): string {
  if (!proofUrl?.startsWith('ipaymu:')) return fallbackId;
  return proofUrl.split(':')[1] || fallbackId;
}

export function getIpaymuPaidProof(response: unknown, fallbackId: string): string {
  const transaction = getIpaymuTransactionRecord(response);
  const transactionId = transaction?.TransactionId
    ?? transaction?.transactionId
    ?? transaction?.SessionId
    ?? transaction?.sessionId
    ?? fallbackId;
  const channel = transaction?.PaymentChannel
    ?? transaction?.paymentChannel
    ?? transaction?.Channel
    ?? transaction?.channel
    ?? transaction?.Via
    ?? transaction?.via
    ?? transaction?.PaymentMethod
    ?? transaction?.paymentMethod
    ?? 'va';

  return `ipaymu:${String(transactionId)}:${String(channel)}:paid`;
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
  const { baseUrl, va, apiKey } = await getIpaymuConfig();

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

  const { signature, timestamp } = generateSignature(body, va, apiKey);

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

/**
 * Fulfill an order when payment is confirmed via webhook callback or status polling.
 */
export async function fulfillOrderPayment(orderId: string, proofUrlStr?: string) {
  const { orders, payments, products, sellerBalances } = await import('@/lib/schema');

  const order = await db.select().from(orders).where(eq(orders.id, orderId)).get();
  if (!order) return false;

  const payment = await db.select().from(payments).where(eq(payments.orderId, orderId)).get();
  if (payment) {
    await db.update(payments).set({
      verificationStatus: 'approved',
      proofUrl: proofUrlStr || payment.proofUrl,
      verifiedAt: new Date(),
    }).where(eq(payments.id, payment.id));
  } else {
    await db.insert(payments).values({
      id: crypto.randomUUID(),
      orderId: orderId,
      proofUrl: proofUrlStr || 'ipaymu:approved',
      verificationStatus: 'approved',
      verifiedAt: new Date(),
    });
  }

  if (order.status === 'waiting_verification') {
    await db.update(orders).set({
      status: 'verified',
    }).where(eq(orders.id, orderId));

    try {
      const productObj = await db.select({ sellerId: products.sellerId }).from(products).where(eq(products.id, order.productId)).get();
      if (productObj) {
        const escrowAmount = order.adminSplitAmount ?? Math.floor((order.totalPrice || 0) * 0.5);
        const balanceObj = await db.select().from(sellerBalances).where(eq(sellerBalances.sellerId, productObj.sellerId)).get();
        if (!balanceObj) {
          await db.insert(sellerBalances).values({
            id: crypto.randomUUID(),
            sellerId: productObj.sellerId,
            availableBalance: 0,
            retainedBalance: escrowAmount,
          });
        } else {
          await db.update(sellerBalances)
            .set({ retainedBalance: (balanceObj.retainedBalance || 0) + escrowAmount })
            .where(eq(sellerBalances.id, balanceObj.id));
        }
      }
    } catch (balanceErr) {
      console.error('[fulfillOrderPayment] Balance retention error:', balanceErr);
    }
  }
  return true;
}
