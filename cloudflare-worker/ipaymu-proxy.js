/**
 * Cloudflare Worker — iPaymu Proxy
 *
 * Worker ini meneruskan (proxy) semua request ke iPaymu API.
 * Deploy ke Cloudflare Workers untuk memisahkan koneksi iPaymu dari aplikasi.
 *
 * Endpoint worker ini:  https://ipaymu-proxy.<username>.workers.dev/<path>
 * Akan diteruskan ke:   https://my.ipaymu.com/api/v2/<path>
 */

// Ganti sesuai environment yang digunakan
const IPAYMU_PRODUCTION_BASE = 'https://my.ipaymu.com/api/v2';
const IPAYMU_SANDBOX_BASE    = 'https://sandbox.ipaymu.com/api/v2';

const ALLOWED_PATHS = new Set(['/payment', '/transaction', '/transfer']);

export default {
  async fetch(request, env) {
    if (!env.PROXY_SECRET) {
      return jsonResponse({ error: 'PROXY_SECRET belum dikonfigurasi' }, 500);
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405, { Allow: 'POST' });
    }

    // ── Validasi secret ────────────────────────────────
    const secret = request.headers.get('x-proxy-secret');
    if (secret !== env.PROXY_SECRET) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    // ── Tentukan target base URL ────────────────────────
    const isSandbox = request.headers.get('x-ipaymu-env') === 'sandbox';
    const ipaymuBase = isSandbox ? IPAYMU_SANDBOX_BASE : IPAYMU_PRODUCTION_BASE;

    // ── Ambil path dari URL request ─────────────────────
    // Contoh: /payment, /transaction, /transfer
    const url = new URL(request.url);
    const ipaymuPath = url.pathname; // Misalnya: /payment
    if (!ALLOWED_PATHS.has(ipaymuPath)) {
      return jsonResponse({ error: 'Endpoint not allowed' }, 404);
    }
    const targetUrl = `${ipaymuBase}${ipaymuPath}`;

    // ── Teruskan semua header iPaymu (va, signature, timestamp) ──
    const forwardHeaders = new Headers();
    forwardHeaders.set('Content-Type', 'application/json');

    for (const [key, value] of request.headers.entries()) {
      // Teruskan header spesifik iPaymu
      if (['va', 'signature', 'timestamp'].includes(key.toLowerCase())) {
        forwardHeaders.set(key, value);
      }
    }

    // ── Forward request ke iPaymu ──────────────────────
    const body = await request.text();

    const ipaymuResponse = await fetch(targetUrl, {
      method: request.method,
      headers: forwardHeaders,
      body: body,
    });

    const responseData = await ipaymuResponse.text();

    return new Response(responseData, {
      status: ipaymuResponse.status,
      headers: {
        'Content-Type': ipaymuResponse.headers.get('Content-Type') || 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  },
};

function jsonResponse(body, status, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}
