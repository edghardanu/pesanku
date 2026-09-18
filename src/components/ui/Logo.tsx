import React from 'react';
import Image from 'next/image';

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
}

export default function Logo({ className = '', width, height, priority = false }: LogoProps) {
  // Provide valid default intrinsic dimensions for Next.js Image component so w > 0
  const imgWidth = width || 500;
  const imgHeight = height || 500;

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      {/* Light Mode Logo (hidden in dark mode) */}
      <Image
        src="/pesanku-logo-light.png"
        alt="Pesanku Nusantara Logo"
        width={imgWidth}
        height={imgHeight}
        sizes="(max-width: 768px) 200px, 400px"
        style={{ width: '100%', height: 'auto' }}
        quality={100}
        priority={priority}
        className="block dark:hidden object-contain"
      />
      {/* Dark Mode Logo (hidden in light mode) */}
      <Image
        src="/pesanku-logo-dark.png"
        alt="Pesanku Nusantara Logo"
        width={imgWidth}
        height={imgHeight}
        sizes="(max-width: 768px) 200px, 400px"
        style={{ width: '100%', height: 'auto' }}
        quality={100}
        priority={priority}
        className="hidden dark:block object-contain"
      />
    </div>
  );
}

