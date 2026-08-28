import crypto from 'crypto';

// ============================================================
//  iPaymu Payment Gateway - Helper Library
//  Supports both Sandbox and Production environments.
//  Set the following environment variables:
//    IPAYMU_VA        – Virtual Account number
//    IPAYMU_API_KEY   – API Key from iPaymu dashboard
//    IPAYMU_ENV       – "production" or "sandbox" (default: production)
//    NEXT_PUBLIC_BASE_URL – Public base URL of the site (e.g. https://pesanku.id)
// ============================================================

const IPAYMU_BASE_URL_PRODUCTION = 'https://my.ipaymu.com/api/v2';
const IPAYMU_BASE_URL_SANDBOX    = 'https://sandbox.ipaymu.com/api/v2';

function getBaseUrl(): string {
  const env = process.env.IPAYMU_ENV || 'production';
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
  const baseUrl = getBaseUrl();
  const siteBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const va = getVa();

  const body: Record<string, unknown> = {
    product:     [params.productName],
    qty:         [params.qty || 1],
    price:       [params.amount],
    description: [`Pembayaran Pesanku - ${params.orderId}`],
    returnUrl:   `${siteBaseUrl}/payment/return?order_id=${params.orderId}`,
    notifyUrl:   `${siteBaseUrl}/api/ipaymu/callback`,
    cancelUrl:   `${siteBaseUrl}/payment/return?order_id=${params.orderId}&status=cancel`,
    referenceId: params.orderId,
    buyerName:   params.buyerName,
    buyerEmail:  params.buyerEmail,
    buyerPhone:  params.buyerPhone || '08000000000',
  };

  // NONAKTIFKAN SEMENTARA: Agar berjalan sebagai sistem Escrow (Rekening Bersama)
  // Tempat di mana uang fisik tertahan 100% di akun Admin demi keamanan.
  /*
  if (params.sellerVa && params.sellerSplitAmount && params.sellerSplitAmount > 0) {
    if (params.sellerSplitAmount > params.amount) {
       throw new Error("Bagian penjual tidak boleh lebih besar dari total pembayaran");
    }
    body.account = va;                                // VA Utama (Admin)
    body.route = [params.sellerVa];                   // List VA Sub-Account (Penjual)
    body.routeValue = [params.sellerSplitAmount];     // Nominal fix yang masuk ke Penjual
  }
  */

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
  const baseUrl = getBaseUrl();
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
