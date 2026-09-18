"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { ShoppingBag } from 'lucide-react';

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
}

export default function Logo({ className = '', width, height, priority = false }: LogoProps) {
  const [hasError, setHasError] = useState(false);

  // Provide valid default intrinsic dimensions for Next.js Image component so w > 0
  const imgWidth = width || 500;
  const imgHeight = height || 500;

  if (hasError) {
    return (
      <div className={`flex items-center gap-2 select-none ${className}`}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm bg-brand-primary shrink-0">
          <ShoppingBag className="w-5 h-5 text-white" />
        </div>
        <div className="flex items-baseline">
          <span className="text-xl md:text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            pesanku
          </span>
          <span className="text-xl md:text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-rose-500 ml-1.5 drop-shadow-sm">
            nusantara
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      {/* Light Mode Logo (hidden in dark mode) */}
      <Image
        src="/pesanku-logo-light.png"
        alt="Pesanku Nusantara Logo"
        width={imgWidth}
        height={imgHeight}
        unoptimized
        style={{ width: '100%', height: 'auto' }}
        priority={priority}
        onError={() => setHasError(true)}
        className="block dark:hidden object-contain"
      />
      {/* Dark Mode Logo (hidden in light mode) */}
      <Image
        src="/pesanku-logo-dark.png"
        alt="Pesanku Nusantara Logo"
        width={imgWidth}
        height={imgHeight}
        unoptimized
        style={{ width: '100%', height: 'auto' }}
        priority={priority}
        onError={() => setHasError(true)}
        className="hidden dark:block object-contain"
      />
    </div>
  );
}


