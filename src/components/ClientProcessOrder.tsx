"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Swal from "sweetalert2";
import { CheckCircle2, Loader2 } from "lucide-react";

function ProcessOrderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Menyiapkan pesanan Anda...");
  
  const hasProcessed = useRef(false);
  const apiStatusRef = useRef<'pending' | 'success' | 'error'>('pending');
  const apiErrorRef = useRef("");

  useEffect(() => {
    // Only process API once
    if (!hasProcessed.current) {
      hasProcessed.current = true;

      const productId = searchParams.get("productId");
      const qty = searchParams.get("qty");
      const notes = searchParams.get("notes") || "";

      if (!productId || !qty) {
        router.push("/");
        return;
      }

      fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: productId,
          qty: parseInt(qty),
          notes: notes
        })
      })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan saat memproses pesanan.');
        apiStatusRef.current = 'success';
      })
      .catch((error) => {
        apiStatusRef.current = 'error';
        apiErrorRef.current = error.message;
      });
    }
  }, [router, searchParams]);

  useEffect(() => {
    const totalDuration = 500; 
    const intervalTime = 20;
    const steps = totalDuration / intervalTime;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      let currentProgress = Math.min(Math.round((currentStep / steps) * 100), 99); 
      
      if (currentProgress > 30 && currentProgress < 70) {
        setStatusText("Menghubungi sistem UMKM...");
      } else if (currentProgress >= 70) {
        setStatusText("Menyelesaikan proses pesanan...");
      }

      if (apiStatusRef.current !== 'pending' && currentProgress === 99) {
        currentProgress = 100;
        setProgress(currentProgress);
        setStatusText("Pesanan Berhasil!");
        clearInterval(timer);
        
        setTimeout(() => {
          if (apiStatusRef.current === 'success') {
            router.refresh();
            router.push("/buyer/orders");
          } else {
            Swal.fire('Gagal!', apiErrorRef.current || 'Terjadi kesalahan.', 'error').then(() => {
              router.push("/");
            });
          }
        }, 100);
        return;
      }

      setProgress(currentProgress);
    }, intervalTime);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-base flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface p-8 rounded-3xl shadow-xl border border-border flex flex-col items-center text-center">
        
        <div className="relative w-full aspect-square max-w-[280px] mb-8 rounded-2xl overflow-hidden bg-brand-secondary/10 shadow-inner flex items-center justify-center">
          <video 
            src="/processing.mp4" 
            autoPlay 
            loop 
            muted 
            playsInline
            className="w-full h-full object-cover"
          />
        </div>

        <h2 className="text-2xl font-bold text-text-primary mb-2">Memproses Pesanan</h2>
        <p className="text-text-secondary text-sm mb-8 h-5">{statusText}</p>

        {/* Loading Bar Container */}
        <div className="w-full bg-border h-4 rounded-full overflow-hidden mb-4 relative shadow-inner">
          <div 
            className="h-full bg-brand-primary rounded-full transition-all duration-200 ease-out relative overflow-hidden"
            style={{ width: `${progress}%` }}
          >
            {/* Shimmer effect inside progress bar */}
            <div className="absolute inset-0 bg-white/20 -skew-x-12 animate-[shimmer_1s_infinite] w-full" />
          </div>
        </div>
        
        <div className="flex items-center justify-between w-full px-1 text-brand-primary font-bold">
          <span className="flex items-center gap-2">
            {progress === 100 ? (
              <CheckCircle2 className="w-5 h-5 text-status-success animate-bounce" />
            ) : (
              <Loader2 className="w-5 h-5 animate-spin" />
            )}
            <span className={progress === 100 ? "text-status-success" : ""}>
              {progress}% Selesai
            </span>
          </span>
        </div>
      </div>

      <style jsx global>{`
        @keyframes shimmer {
          0% { transform: translateX(-150%) skewX(-12deg); }
          100% { transform: translateX(150%) skewX(-12deg); }
        }
      `}</style>
    </div>
  );
}

export default function ClientProcessOrder() {
  return (
    <Suspense fallback={null}>
      <ProcessOrderContent />
    </Suspense>
  );
}
