import React from 'react';
import Image from 'next/image';

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
}

export default function Logo({ className = '', width, height, priority = false }: LogoProps) {
  // If width/height are provided, we use them as explicit dimensions.
  // Otherwise, we allow the parent className to dictate the size (e.g. w-32 h-auto)
  const imageProps = width && height 
    ? { width, height }
    : { width: 0, height: 0, sizes: "100vw", style: { width: '100%', height: 'auto' } };

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      {/* Light Mode Logo (hidden in dark mode) */}
      <Image
        src="/pesanku-logo-light.png"
        alt="Pesanku Nusantara Logo"
        {...imageProps}
        quality={100}
        priority={priority}
        className="block dark:hidden object-contain"
      />
      {/* Dark Mode Logo (hidden in light mode) */}
      <Image
        src="/pesanku-logo-dark.png"
        alt="Pesanku Nusantara Logo"
        {...imageProps}
        quality={100}
        priority={priority}
        className="hidden dark:block object-contain"
      />
    </div>
  );
}
