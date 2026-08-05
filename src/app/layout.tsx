import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pesanku - Preorder Makanan & Minuman UMKM",
  description: "Platform preorder makanan dan minuman dari UMKM lokal.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body suppressHydrationWarning className={`${inter.variable} font-sans antialiased bg-base text-text-primary min-h-screen flex flex-col`}>
        {children}
      </body>
    </html>
  );
}
