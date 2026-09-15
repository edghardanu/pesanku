// ============================================================
//  Flip for Business (BigFlip) - Money Transfer API
//  Digunakan untuk fitur Pay-out (Pencairan dana ke Penjual)
//  Set ENV berikut:
//    FLIP_SECRET_KEY      – Secret key produksi Flip Business
//    FLIP_SECRET_KEY_SANDBOX – Secret key sandbox Flip Business
//    FLIP_ENV             – "production" atau "sandbox" (default: production)
// ============================================================

const FLIP_BASE_URL_PRODUCTION = 'https://bigflip.id/api/v3';
const FLIP_BASE_URL_SANDBOX = 'https://bigflip.id/big_sandbox_api/v3';

export interface FlipConfig {
  baseUrl: string;
  secretKey: string;
  isSandbox: boolean;
}

async function getFlipConfig(): Promise<FlipConfig> {
  let isSandbox = process.env.FLIP_ENV === 'sandbox';

  // Cek DB settings (sama seperti mekanisme iPaymu sandbox)
  try {
    const { db } = await import('@/lib/db');
    const { settings } = await import('@/lib/schema');
    const { eq } = await import('drizzle-orm');
    const fromDb = await db.select().from(settings).where(eq(settings.key, 'flip_sandbox')).get();
    if (fromDb && (fromDb.value === '1' || fromDb.value === 'true')) {
      isSandbox = true;
    } else if (fromDb && (fromDb.value === '0' || fromDb.value === 'false')) {
      isSandbox = false; // Eksplisit production dari DB
    }
  } catch (e) {
    console.error('Error fetching flip_sandbox from db:', e);
  }

  if (isSandbox) {
    return {
      baseUrl: FLIP_BASE_URL_SANDBOX,
      secretKey: process.env.FLIP_SECRET_KEY_SANDBOX || '',
      isSandbox: true,
    };
  }

  const secretKey = process.env.FLIP_SECRET_KEY;
  if (!secretKey) throw new Error('FLIP_SECRET_KEY environment variable is not set');

  return {
    baseUrl: FLIP_BASE_URL_PRODUCTION,
    secretKey,
    isSandbox: false,
  };
}

export interface FlipCreateBillParams {
  title: string;
  amount: number;
  type?: 'SINGLE' | 'MULTIPLE';
  expired_date?: string;
  redirect_url?: string;
  is_address_required?: number;
  is_phone_number_required?: number;
  step?: number;
  sender_name?: string;
  sender_email?: string;
  sender_phone_number?: string;
  sender_address?: string;
  sender_bank?: string;
  sender_bank_type?: string;
}

export async function createFlipBill(params: FlipCreateBillParams) {
  try {
    const { baseUrl, secretKey } = await getFlipConfig();
    const payload = new URLSearchParams();
    
    payload.append('title', params.title);
    payload.append('amount', params.amount.toString());
    if (params.type) payload.append('type', params.type);
    if (params.expired_date) payload.append('expired_date', params.expired_date);
    if (params.redirect_url) payload.append('redirect_url', params.redirect_url);
    if (params.is_address_required !== undefined) payload.append('is_address_required', params.is_address_required.toString());
    if (params.is_phone_number_required !== undefined) payload.append('is_phone_number_required', params.is_phone_number_required.toString());
    if (params.step !== undefined) payload.append('step', params.step.toString());
    if (params.sender_name) payload.append('sender_name', params.sender_name);
    if (params.sender_email) payload.append('sender_email', params.sender_email);
    if (params.sender_phone_number) payload.append('sender_phone_number', params.sender_phone_number);
    if (params.sender_address) payload.append('sender_address', params.sender_address);
    if (params.sender_bank) payload.append('sender_bank', params.sender_bank);
    if (params.sender_bank_type) payload.append('sender_bank_type', params.sender_bank_type);

    const authHeader = 'Basic ' + Buffer.from(secretKey + ':').toString('base64');
    
    // Accept payment endpoint uses /pwf/bill on API v2 mostly
    const billEndpoint = baseUrl.replace('/v3', '/v2') + '/pwf/bill';

    const response = await fetch(billEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': authHeader
      },
      body: payload.toString()
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.message || data.error || JSON.stringify(data);
      throw new Error(`Flip error: ${errorMsg}`);
    }

    return {
      success: true,
      data,
      paymentUrl: data.link_url,
      billId: data.link_id,
    };
  } catch (error) {
    console.error("[Flip] Create Bill Error:", error);
    throw error;
  }
}



/**
 * Parses freeform bank strings like "BCA - 123456789 a/n Budi" 
 * to extract standard `bank_code` and `account_number`.
 */
function parseBankAccount(input: string): { bankCode: string, accountNumber: string } {
  // Try to find numbers first
  const numbers = input.match(/\d+/g);
  const accountNumber = numbers ? numbers.join('') : '';

  // Extract bank code: flip uses lowercases like 'bca', 'bni', 'bri', 'mandiri', 'bsm'
  const text = input.toLowerCase();
  let bankCode = '';
  if (text.includes('bca')) bankCode = 'bca';
  else if (text.includes('bni')) bankCode = 'bni';
  else if (text.includes('bri')) bankCode = 'bri';
  else if (text.includes('mandiri')) bankCode = 'mandiri';
  else if (text.includes('bsm') || text.includes('syariah mandiri')) bankCode = 'bsm';
  else if (text.includes('cimb')) bankCode = 'cimb';
  else if (text.includes('muamalat')) bankCode = 'muamalat';
  else if (text.includes('permata')) bankCode = 'permata';
  else if (text.includes('danamon')) bankCode = 'danamon';
  else if (text.includes('bii') || text.includes('maybank')) bankCode = 'bii';
  else {
    // default to empty, let it fail by flip API if unparseable
    const words = text.split(/[ \-]/);
    bankCode = words[0]; 
  }

  return { bankCode, accountNumber };
}

/**
 * Execute Transfer (Disbursement) via Flip for Business API.
 * Mentransfer dana lunas admin ke rekening bank Penjual.
 */
export async function executeFlipDisbursement(params: {
  amount: number;
  bankAccount: string;
  referenceId: string;
  notes?: string;
}) {
  try {
    const { baseUrl, secretKey } = await getFlipConfig();

    const { bankCode, accountNumber } = parseBankAccount(params.bankAccount);

    if (!bankCode || !accountNumber) {
      return { success: false, error: 'Format rekening bank tidak didukung atau tidak dapat dibaca. Pastikan format: NAMA_BANK NOMOR_REKENING' };
    }

    const payload = new URLSearchParams();
    payload.append('account_number', accountNumber);
    payload.append('bank_code', bankCode);
    payload.append('amount', params.amount.toString());
    payload.append('remark', params.notes || `Disbursement for Order ${params.referenceId}`);
    
    const authHeader = 'Basic ' + Buffer.from(secretKey + ':').toString('base64');
    const idempotencyKey = `PAYOUT-${params.referenceId}`; // Mencegah double duplicate transfer

    const response = await fetch(`${baseUrl}/disbursement`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': authHeader,
        'idempotency-key': idempotencyKey
      },
      body: payload.toString()
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.message || data.error || JSON.stringify(data);
      console.error(`[Flip] Disbursement error:`, errorMsg, data);
      return { success: false, error: errorMsg };
    }

    // Usually success returns an object with status 'PENDING' or 'DONE'
    return { success: true, data };

  } catch (error) {
    console.error("[Flip] Disbursement Request Error:", error);
    return { success: false, error: (error as Error).message };
  }
}
