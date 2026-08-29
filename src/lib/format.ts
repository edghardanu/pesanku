// ============================================================
//  src/lib/format.ts
//  Fungsi pemformatan yang digunakan di seluruh project
// ============================================================

/**
 * Format angka ke format Rupiah Indonesia.
 * @example formatRupiah(150000) → "Rp 150.000"
 */
export function formatRupiah(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

/**
 * Format Date atau timestamp ke string tanggal lokal Indonesia.
 * @example formatDate(new Date()) → "29 Agustus 2026"
 */
export function formatDate(
  date: Date | string | number | null | undefined,
): string {
  if (!date) return '-';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Format Date atau timestamp ke string tanggal + waktu lokal Indonesia.
 * @example formatDateTime(new Date()) → "29 Agustus 2026, 21.00"
 */
export function formatDateTime(
  date: Date | string | number | null | undefined,
): string {
  if (!date) return '-';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format Unix Epoch (detik) ke string tanggal lokal Indonesia.
 * Berguna untuk kolom `createdAt` dari DB yang disimpan sebagai integer epoch.
 */
export function formatEpoch(epoch: number | null | undefined): string {
  if (!epoch) return '-';
  return formatDate(new Date(epoch * 1000));
}

/**
 * Format countdown detik ke format "MM:SS".
 * @example formatCountdown(125) → "2:05"
 */
export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/**
 * Escape tanda kutip dalam string agar aman dipakai di dalam atribut HTML inline.
 */
export function escapeQuotes(str: string): string {
  return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * Potong teks melebihi batas karakter tertentu dan tambahkan "...".
 * @example truncate("Halo dunia", 5) → "Halo..."
 */
export function truncate(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}...`;
}
