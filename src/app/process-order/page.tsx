import ClientProcessOrder from "@/components/ClientProcessOrder";
import { Suspense } from "react";

export const metadata = {
  title: "Memproses Pesanan | Pesanku",
  description: "Memproses pesanan Anda...",
};

export default function ProcessOrderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-base flex items-center justify-center">Loading...</div>}>
      <ClientProcessOrder />
    </Suspense>
  );
}
