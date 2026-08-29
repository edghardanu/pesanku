// ============================================================
//  src/components/ui/LoadingSpinner.tsx
//  Komponen spinner loading yang reusable
// ============================================================
import React from 'react';

interface LoadingSpinnerProps {
  /** Ukuran spinner. Default: 'md' */
  size?: 'sm' | 'md' | 'lg';
  /** Teks opsional di bawah spinner */
  label?: string;
  className?: string;
}

const SIZE_CLASS = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
} as const;

/**
 * Spinner loading sederhana.
 *
 * @example
 * <LoadingSpinner />
 * <LoadingSpinner size="lg" label="Memuat data..." />
 */
export function LoadingSpinner({
  size = 'md',
  label,
  className = '',
}: LoadingSpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 ${className}`}>
      <svg
        className={`animate-spin text-brand-primary ${SIZE_CLASS[size]}`}
        viewBox="0 0 24 24"
        fill="none"
        aria-label="Memuat..."
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
      {label && (
        <p className="text-sm text-text-secondary animate-pulse">{label}</p>
      )}
    </div>
  );
}
