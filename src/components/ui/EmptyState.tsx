// ============================================================
//  src/components/ui/EmptyState.tsx
//  Tampilan saat daftar data kosong
// ============================================================
import React from 'react';

interface EmptyStateProps {
  /** Ikon atau emoji yang ditampilkan */
  icon?: React.ReactNode;
  /** Judul pesan kosong */
  title: string;
  /** Deskripsi tambahan opsional */
  description?: string;
  /** Tombol aksi opsional */
  action?: React.ReactNode;
  className?: string;
}

/**
 * Komponen tampilan kosong (empty state) yang konsisten.
 *
 * @example
 * <EmptyState
 *   icon="📭"
 *   title="Belum ada pesanan"
 *   description="Pesanan baru akan muncul di sini."
 * />
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-12 px-4 gap-3 ${className}`}
    >
      {icon && (
        <div className="text-4xl mb-1" aria-hidden="true">
          {icon}
        </div>
      )}
      <p className="text-base font-semibold text-text-primary">{title}</p>
      {description && (
        <p className="text-sm text-text-secondary max-w-xs">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
