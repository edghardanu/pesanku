import type { Metadata, Viewport } from "next";
import "./globals.css";
import GlobalThemeToggle from "@/components/GlobalThemeToggle";
import GlobalLoader from "@/components/GlobalLoader";
import HelpWidget from "@/components/HelpWidget";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "Pesanku - Preorder Makanan & Minuman UMKM",
  description: "Platform preorder makanan dan minuman dari UMKM lokal.",
};

import Image from "next/image";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="font-sans antialiased text-text-primary min-h-screen flex flex-col transition-colors duration-300">
        <GlobalLoader />
        <HelpWidget />
        {children}
      </body>
    </html>
  );
}
