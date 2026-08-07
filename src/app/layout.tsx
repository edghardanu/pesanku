import type { Metadata } from "next";
import "./globals.css";
import GlobalThemeToggle from "@/components/GlobalThemeToggle";

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
    <html lang="id" suppressHydrationWarning>
      <body className="font-sans antialiased bg-base text-text-primary min-h-screen flex flex-col transition-colors duration-300">
        {children}
      </body>
    </html>
  );
}
