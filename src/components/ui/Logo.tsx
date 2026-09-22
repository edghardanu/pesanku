import React from 'react';

interface LogoProps {
  src?: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
}

export default function Logo({ src, className = '', width, height }: LogoProps) {
  const customStyle = width && height ? { width: `${width}px`, height: `${height}px` } : undefined;

  const lightSrc = src || "/pesanku-logo-light.png";
  const darkSrc = src || "/pesanku-logo-dark.png";

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`} style={customStyle}>
      {/* Light Mode Logo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={lightSrc}
        alt="Pesanku Nusantara Logo"
        className="block dark:!hidden w-full h-auto object-contain"
      />
      {/* Dark Mode Logo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={darkSrc}
        alt="Pesanku Nusantara Logo"
        className="hidden dark:!block w-full h-auto object-contain"
      />
    </div>
  );
}




