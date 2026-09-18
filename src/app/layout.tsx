import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";
import GlobalThemeToggle from "@/components/GlobalThemeToggle";
import GlobalLoader from "@/components/GlobalLoader";

const jakartaSans = Plus_Jakarta_Sans({ 
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "Pesanku Nusantara - Preorder Makanan & Minuman UMKM",
  description: "Platform preorder makanan dan minuman dari UMKM lokal.",
};

import Image from "next/image";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning className={`${jakartaSans.variable} ${inter.variable}`}>
      <body className="font-sans antialiased text-text-primary min-h-screen flex flex-col transition-colors duration-300">
        <GlobalLoader />
        {children}
      </body>
    </html>
  );
}
