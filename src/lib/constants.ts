// ============================================================
//  src/lib/constants.ts
//  Konstanta global untuk seluruh project Pesanku
// ============================================================

// ── Status Pesanan ─────────────────────────────────────────
export const ORDER_STATUS = {
  WAITING_VERIFICATION: 'waiting_verification',
  VERIFIED: 'verified',
  PREORDER_RUNNING: 'preorder_running',
  FAILED: 'failed',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  CHAT_ONLY: 'chat_only',
  RETURN_PENDING: 'return_pending',
  RETURNED: 'returned',
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

// ── Label Status Pesanan (Bahasa Indonesia) ────────────────
export const ORDER_STATUS_LABEL: Record<string, string> = {
  waiting_verification: 'Menunggu Verifikasi',
  verified: 'Terverifikasi',
  preorder_running: 'Preorder Berjalan',
  failed: 'Gagal',
  processing: 'Diproses',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
  chat_only: 'Chat',
  return_pending: 'Pengembalian Diajukan',
  returned: 'Dikembalikan',
};

// ── Warna Badge Status ─────────────────────────────────────
export const ORDER_STATUS_COLOR: Record<string, string> = {
  waiting_verification: 'bg-yellow-100 text-yellow-800',
  verified: 'bg-blue-100 text-blue-800',
  preorder_running: 'bg-purple-100 text-purple-800',
  processing: 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  failed: 'bg-red-100 text-red-800',
  return_pending: 'bg-amber-100 text-amber-800',
  returned: 'bg-gray-100 text-gray-600',
  chat_only: 'bg-blue-50 text-blue-600',
};

// ── Approval Status Seller ─────────────────────────────────
export const APPROVAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

// ── Peran Pengguna ─────────────────────────────────────────
export const USER_ROLE = {
  ADMIN: 'admin',
  SELLER: 'penjual',
  BUYER: 'pembeli',
} as const;

// ── Polling Interval (ms) ─────────────────────────────────
export const POLLING_INTERVAL_MS = 15_000; // 15 detik

// ── Ukuran Gambar Maksimum ─────────────────────────────────
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

// ── Default Image Fallback ─────────────────────────────────
export const DEFAULT_PRODUCT_IMAGE = '/street-food-festival.jpg';
export const DEFAULT_AVATAR_IMAGE = '/default-avatar.png';
