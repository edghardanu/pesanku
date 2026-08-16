"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, Camera, CreditCard, Zap } from "lucide-react";
import Swal from "sweetalert2";
import { useRouter, usePathname } from "next/navigation";

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan?: (decodedText: string) => void;
}

export default function QRScannerModal({ isOpen, onClose, onScan }: QRScannerModalProps) {
  const router = useRouter();
  const pathname = usePathname();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  const handleSafeClose = async (decodedText?: string) => {
    if (isClosing) return;
    setIsClosing(true);

    try {
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop().catch(() => {});
        }
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch (e) {
      console.warn("Error gracefully stopping scanner", e);
    }

    setIsClosing(false);

    if (decodedText) {
      if (onScan) {
        onScan(decodedText);
      } else {
        onClose();
        if (pathname !== "/") router.push("/");
        Swal.fire({
          title: "QRIS Terdeteksi",
          text: "Data QRIS: " + decodedText.substring(0, 30) + "... \n Fitur pembayaran sedang dalam pengembangan.",
          icon: "success",
          confirmButtonColor: "#ff5c35"
        });
      }
    } else {
      // Normal close
      onClose();
      if (pathname !== "/") router.push("/");
    }
  };

  useEffect(() => {
    if (!isOpen) {
      if (scannerRef.current) {
        handleSafeClose();
      }
      return;
    }

    setInitError(null);

    const html5QrCode = new Html5Qrcode("qris-reader");
    scannerRef.current = html5QrCode;

    // Directly start scanning to trigger permission prompt immediately
    html5QrCode.start(
      { facingMode: "environment" },
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      },
      (decodedText) => {
        handleSafeClose(decodedText);
      },
      (errorMessage) => {
        // Ignored
      }
    ).catch((err) => {
      // Intentionally not logging err to console.error to avoid Next.js red dev overlay.
      setInitError("Gagal mengakses kamera. Pastikan Anda telah memberikan izin pada browser Anda, lalu muat ulang halaman.");
    });

    return () => {
      if (scannerRef.current) {
        handleSafeClose();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black overflow-hidden animate-in fade-in duration-300">
      
      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-start justify-between px-4 pt-6 pb-12 bg-gradient-to-b from-black/80 to-transparent text-white pointer-events-none">
        <div className="flex flex-col gap-1 drop-shadow-md">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-brand-primary" />
            <h3 className="font-bold text-lg">Scan QRIS</h3>
          </div>
          <p className="text-xs text-white/80">Arahkan kamera ke kode QR</p>
        </div>
        <button 
          onClick={() => handleSafeClose()}
          disabled={isClosing}
          className="p-2 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-md transition-colors border border-white/10 pointer-events-auto disabled:opacity-50"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Scanner Area */}
      <div className="flex-1 w-full h-full relative bg-black flex items-center justify-center">
        {initError && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-white z-20 bg-black/80">
            <p className="text-sm font-medium">{initError}</p>
          </div>
        )}
        
        <div 
          id="qris-reader" 
          className="w-full h-full absolute inset-0 [&_video]:object-cover [&_video]:w-full [&_video]:h-full [&_#qr-shaded-region]:border-brand-primary"
        ></div>
        
        <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
          <div className="w-[280px] h-[280px] relative">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-brand-primary rounded-tl-xl"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-brand-primary rounded-tr-xl"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-brand-primary rounded-bl-xl"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-brand-primary rounded-br-xl"></div>
            
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-brand-primary animate-[scan_2s_ease-in-out_infinite] shadow-[0_0_8px_2px_rgba(255,92,53,0.5)]"></div>
          </div>
        </div>
      </div>

      {/* Footer/Info Overlay */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-6 pt-16 bg-gradient-to-t from-black via-black/80 to-transparent text-white safe-area-bottom pointer-events-none">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-brand-primary flex items-center justify-center shrink-0 shadow-lg shadow-brand-primary/40">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-white mb-0.5">Bayar dengan QRIS</p>
            <p className="text-xs text-white/80 leading-relaxed">
              Scan barcode merchant Pesanku untuk melanjutkan pembayaran pesanan Anda.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
