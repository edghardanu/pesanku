// ============================================================
//  src/components/ui/Avatar.tsx
//  Komponen avatar foto profil/toko yang reusable
// ============================================================
import React from 'react';

interface AvatarProps {
  /** URL gambar. Jika null/undefined, tampilkan inisial. */
  src?: string | null;
  /** Nama untuk inisial fallback */
  name?: string;
  /** Ukuran avatar. Default: 'md' */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_CLASS = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
} as const;

/**
 * Komponen avatar dengan foto atau inisial nama sebagai fallback.
 *
 * @example
 * <Avatar src={user.profileImageUrl} name={user.name} size="lg" />
 * <Avatar name="Budi" size="sm" />
 */
export function Avatar({ src, name = '?', size = 'md', className = '' }: AvatarProps) {
  const initial = name.charAt(0).toUpperCase();
  const sizeClass = SIZE_CLASS[size];

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className={`rounded-full object-cover flex-shrink-0 ${sizeClass} ${className}`}
      />
    );
  }

  return (
    <div
      className={`rounded-full bg-brand-primary text-white font-bold flex items-center justify-center flex-shrink-0 ${sizeClass} ${className}`}
      aria-label={name}
    >
      {initial}
    </div>
  );
}
