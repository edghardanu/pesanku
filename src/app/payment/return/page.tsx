"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, Loader2, ArrowLeft, Clock3, Receipt, ShoppingBag } from "lucide-react";

function PaymentReturnContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const orderId = searchParams.get("order_id") || "";
  const statusParam = searchParams.get("status") || "";
  const isCancelled = statusParam === "cancel";

  const [checking, setChecking] = useState(!isCancelled);
  const [paymentStatus, setPaymentStatus] = useState<"success" | "pending" | "failed" | "cancelled">(
    isCancelled ? "cancelled" : "pending"
  );

  useEffect(() => {
    if (isCancelled) return;

    // Poll the server to verify whether iPaymu callback has arrived
    let attempts = 0;
    const maxAttempts = 12; // 12 × 5s = 60s max waiting

    const checkPaymentStatus = async () => {
      try {
        const res = await fetch(`/api/ipaymu/status?orderId=${orderId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.paymentStatus === "approved") {
            setPaymentStatus("success");
            setChecking(false);
            return;
          } else if (data.paymentStatus === "rejected") {
            setPaymentStatus("failed");
            setChecking(false);
            return;
          }
        }
      } catch {
        // ignore
      }

      attempts++;
      if (attempts >= maxAttempts) {
        // Jangan menyatakan berhasil sebelum status pembayaran disetujui sistem.
        setPaymentStatus("pending");
        setChecking(false);
        return;
      }

      setTimeout(checkPaymentStatus, 5000);
    };

    // Start checking after 3 seconds (give callback time to arrive)
    setTimeout(checkPaymentStatus, 3000);
  }, [isCancelled, orderId]);

  return (
    <div className="min-h-screen bg-base flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface p-8 rounded-3xl shadow-xl border border-border flex flex-col items-center text-center">
        {checking ? (
          <>
            <div className="w-20 h-20 rounded-full bg-brand-primary/10 flex items-center justify-center mb-6">
              <Loader2 className="w-10 h-10 text-brand-primary animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-2">Memverifikasi Pembayaran</h2>
            <p className="text-text-secondary text-sm mb-8">
              Sistem sedang memeriksa status pembayaran Anda. Harap tunggu sebentar...
            </p>
            <div className="w-full bg-border h-2 rounded-full overflow-hidden">
              <div className="h-full bg-brand-primary rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
          </>
        ) : paymentStatus === "success" ? (
          <>
            <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-2">Pembayaran Berhasil!</h2>
            <div className="w-full bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 mb-6 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2 text-text-secondary justify-center">
                <Receipt className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wider font-semibold">Nomor Referensi (Invoice)</span>
              </div>
              <p className="text-lg font-mono font-bold text-text-primary break-all">{orderId}</p>
            </div>
            <p className="text-text-secondary text-sm mb-2">
              Pembayaran Anda telah berhasil diproses.
            </p>
            <p className="text-text-secondary text-xs mb-8">
              Pesanan Anda akan segera diverifikasi oleh penjual.
            </p>
            <div className="flex w-full">
              <Link
                href="/buyer/orders"
                className="w-full flex items-center justify-center gap-2 py-3 bg-brand-primary text-white font-semibold rounded-xl hover:bg-brand-primary-hover transition-colors"
              >
                <ShoppingBag className="w-4 h-4" /> Kembali ke Pesanan
              </Link>
            </div>
          </>
        ) : paymentStatus === "pending" ? (
          <>
            <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-6">
              <Clock3 className="w-10 h-10 text-amber-500" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-2">Pembayaran Belum Terkonfirmasi</h2>
            <div className="w-full bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 mb-6 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2 text-text-secondary justify-center">
                <Receipt className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wider font-semibold">Nomor Referensi (Invoice)</span>
              </div>
              <p className="text-lg font-mono font-bold text-text-primary break-all">{orderId}</p>
            </div>
            <p className="text-text-secondary text-sm mb-8">
              Status pembayaran pesanan Anda masih diproses. Status akan berubah menjadi Lunas setelah dikonfirmasi sistem pembayaran.
            </p>
            <div className="flex w-full">
              <Link
                href="/buyer/orders"
                className="w-full flex items-center justify-center gap-2 py-3 bg-brand-primary text-white font-semibold rounded-xl hover:bg-brand-primary-hover transition-colors"
              >
                <ShoppingBag className="w-4 h-4" /> Kembali ke Pesanan
              </Link>
            </div>
          </>
        ) : paymentStatus === "cancelled" ? (
          <>
            <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-6">
              <XCircle className="w-10 h-10 text-amber-500" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-2">Pembayaran Dibatalkan</h2>
            <div className="w-full bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 mb-6 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2 text-text-secondary justify-center">
                <Receipt className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wider font-semibold">Nomor Referensi (Invoice)</span>
              </div>
              <p className="text-lg font-mono font-bold text-text-primary break-all">{orderId}</p>
            </div>
            <p className="text-text-secondary text-sm mb-8">
              Anda membatalkan proses pembayaran. Pesanan Anda masih tersedia dan Anda dapat mencoba bayar kembali dengan kembali ke aplikasi.
            </p>
            <div className="flex w-full">
              <Link
                href="/buyer/orders"
                className="w-full flex items-center justify-center gap-2 py-3 bg-brand-primary text-white font-semibold rounded-xl hover:bg-brand-primary-hover transition-colors"
              >
                <ShoppingBag className="w-4 h-4" /> Kembali ke Pesanan
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-6">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-2">Pembayaran Gagal</h2>
            <div className="w-full bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 mb-6 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2 text-text-secondary justify-center">
                <Receipt className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wider font-semibold">Nomor Referensi (Invoice)</span>
              </div>
              <p className="text-lg font-mono font-bold text-text-primary break-all">{orderId}</p>
            </div>
            <p className="text-text-secondary text-sm mb-8">
              Terjadi masalah pada pembayaran Anda. Silakan coba lagi atau hubungi kami jika masalah berlanjut.
            </p>
            <div className="flex w-full">
              <Link
                href="/buyer/orders"
                className="w-full flex items-center justify-center gap-2 py-3 bg-brand-primary text-white font-semibold rounded-xl hover:bg-brand-primary-hover transition-colors"
              >
                <ShoppingBag className="w-4 h-4" /> Kembali ke Pesanan
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentReturnPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-base flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
      </div>
    }>
      <PaymentReturnContent />
    </Suspense>
  );
}
