// ============================================================
//  src/components/seller/SellerStatusBadge.tsx
//  Badge status pesanan khusus untuk tampilan seller
// ============================================================
import React from 'react';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  waiting_verification: { label: 'Menunggu Verifikasi', className: 'bg-status-warning/10 text-status-warning border-status-warning/20' },
  verified:             { label: 'Terverifikasi',        className: 'bg-brand-secondary/10 text-brand-secondary border-brand-secondary/20' },
  preorder_running:     { label: 'Preorder Berjalan',    className: 'bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-300' },
  processing:           { label: 'Diproses',             className: 'bg-brand-primary/10 text-brand-primary border-brand-primary/20' },
  completed:            { label: 'Selesai',              className: 'bg-status-success/10 text-status-success border-status-success/20' },
  cancelled:            { label: 'Dibatalkan',           className: 'bg-status-error/10 text-status-error border-status-error/20' },
  failed:               { label: 'Gagal',                className: 'bg-status-error/10 text-status-error border-status-error/20' },
  return_pending:       { label: 'Dikembalikan (Proses)',className: 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300' },
  returned:             { label: 'Dikembalikan',         className: 'bg-status-error/10 text-status-error border-status-error/20' },
  chat_only:            { label: 'Chat',                 className: 'bg-blue-50 text-blue-600 border-blue-200' },
};

interface SellerStatusBadgeProps {
  status: string | null | undefined;
  /** Jika true, tampilkan sebagai select dropdown (untuk ubah status) */
  className?: string;
}

/**
 * Badge status pesanan untuk tampilan tabel seller.
 * Menggunakan konfigurasi warna terpusat agar konsisten.
 */
export function SellerStatusBadge({ status, className = '' }: SellerStatusBadgeProps) {
  const statusKey = status ?? 'waiting_verification';
  const config = STATUS_CONFIG[statusKey] ?? {
    label: statusKey,
    className: 'bg-border/60 text-text-secondary border-border',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
}

/**
 * Ambil kelas CSS untuk select dropdown berdasarkan status.
 * Digunakan pada elemen <select> ubah status pesanan.
 */
export function getStatusSelectClass(status: string | null | undefined): string {
  const statusKey = status ?? 'waiting_verification';
  const base = 'text-xs font-semibold rounded-lg border px-2 py-1.5 outline-none cursor-pointer text-center w-[160px]';
  const config = STATUS_CONFIG[statusKey];
  if (!config) return `${base} bg-border/60 text-text-secondary border-border`;
  return `${base} ${config.className}`;
}
