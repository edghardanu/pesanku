import React from 'react';

export const CustomBagIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M5 8h14l1 14H4Z" />
    <path d="M8 8V5a4 4 0 0 1 8 0v3" />
    <circle cx="8" cy="8" r="1.2" fill="currentColor" />
    <circle cx="16" cy="8" r="1.2" fill="currentColor" />
  </svg>
);
