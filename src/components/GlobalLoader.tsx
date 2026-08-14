"use client";
import NextTopLoader from 'nextjs-toploader';

export default function GlobalLoader() {
  return (
    <NextTopLoader
      color="#ff5c35" // brand-primary
      initialPosition={0.08}
      crawlSpeed={200}
      height={3}
      crawl={true}
      showSpinner={false}
      easing="ease"
      speed={200}
      shadow="0 0 10px #ff5c35,0 0 5px #ff5c35"
      zIndex={1600}
    />
  );
}
