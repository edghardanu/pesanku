// ============================================================
//  src/components/ui/Badge.tsx
//  Komponen badge status pesanan yang reusable
// ============================================================
import React from 'react';
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from '@/lib/constants';

interface BadgeProps {
  status: string;
  className?: string;
}

/**
 * Badge untuk menampilkan status pesanan dengan label dan warna yang konsisten.
 *
 * @example
 * <Badge status="completed" />
 * <Badge status="cancelled" className="text-xs" />
 */
export function Badge({ status, className = '' }: BadgeProps) {
  const label = ORDER_STATUS_LABEL[status] ?? status;
  const colorClass =
    ORDER_STATUS_COLOR[status] ?? 'bg-gray-100 text-gray-600';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colorClass} ${className}`}
    >
      {label}
    </span>
  );
}
