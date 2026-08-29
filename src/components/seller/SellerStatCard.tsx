// ============================================================
//  src/components/seller/SellerStatCard.tsx
//  Card statistik ringkasan (Aktif, Menunggu, Selesai)
// ============================================================
import React from 'react';

interface SellerStatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  colorClass?: string;
}

/**
 * Kartu ringkasan statistik di sidebar/header seller dashboard.
 *
 * @example
 * <SellerStatCard label="Pesanan Aktif" value={5} icon={<Package />} colorClass="text-brand-primary" />
 */
export function SellerStatCard({ label, value, icon, colorClass = 'text-brand-primary' }: SellerStatCardProps) {
  return (
    <div className="flex flex-col items-center justify-center bg-surface border border-border rounded-xl p-3 gap-1 min-w-[70px] shadow-sm">
      <div className={`${colorClass} mb-0.5`}>{icon}</div>
      <span className={`text-xl font-bold ${colorClass}`}>{value}</span>
      <span className="text-[10px] text-text-secondary text-center leading-tight">{label}</span>
    </div>
  );
}
