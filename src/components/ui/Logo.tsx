import React from 'react';

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
}

export default function Logo({ className = '', width, height }: LogoProps) {
  const customStyle = width && height ? { width: `${width}px`, height: `${height}px` } : undefined;

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`} style={customStyle}>
      {/* Light Mode Logo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/pesanku-logo-light.png"
        alt="Pesanku Nusantara Logo"
        className="block dark:hidden w-full h-auto object-contain"
      />
      {/* Dark Mode Logo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/pesanku-logo-dark.png"
        alt="Pesanku Nusantara Logo"
        className="hidden dark:block w-full h-auto object-contain"
      />
    </div>
  );
}



