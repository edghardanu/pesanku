"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, Camera, CreditCard, ImageIcon } from "lucide-react";
import Swal from "sweetalert2";
import { useRouter, usePathname } from "next/navigation";

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan?: (decodedText: string) => void;
}

type Mode = "camera" | "upload";

export default function QRScannerModal({ isOpen, onClose, onScan }: QRScannerModalProps) {
  const router = useRouter();
  const pathname = usePathname();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [mode, setMode] = useState<Mode>("camera");
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        router.push("/");
        Swal.fire({
          title: "QRIS Terdeteksi",
          text: "Data QRIS: " + decodedText.substring(0, 30) + "... \n Fitur pembayaran sedang dalam pengembangan.",
          icon: "success",
          confirmButtonColor: "#ff5c35"
        });
      }
    } else {
      onClose();
      router.push("/");
    }
  };

  // Start camera scanning
  const startCamera = () => {
    setInitError(null);
    const html5QrCode = new Html5Qrcode("qris-reader");
    scannerRef.current = html5QrCode;

    html5QrCode.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => { handleSafeClose(decodedText); },
      () => {}
    ).catch(() => {
      setInitError("Gagal mengakses kamera. Pastikan Anda telah memberikan izin pada browser Anda, lalu muat ulang halaman.");
    });
  };

  // Stop camera scanning
  const stopCamera = async () => {
    try {
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop().catch(() => {});
        }
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch (e) {
      console.warn("Error stopping camera", e);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    if (mode === "camera") {
      startCamera();
    }

    return () => { stopCamera(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode]);

  // Handle mode switch
  const handleModeSwitch = async (newMode: Mode) => {
    if (newMode === mode) return;
    if (newMode === "upload") {
      await stopCamera();
    }
    setUploadPreview(null);
    setUploadError(null);
    setInitError(null);
    setMode(newMode);
  };

  // Handle image upload and scan
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setIsProcessing(true);

    const objectUrl = URL.createObjectURL(file);
    setUploadPreview(objectUrl);

    try {
      const html5QrCode = new Html5Qrcode("qris-upload-reader");
      const result = await html5QrCode.scanFile(file, false);
      html5QrCode.clear();

      // Success
      setIsProcessing(false);
      handleSafeClose(result);
    } catch {
      setIsProcessing(false);
      setUploadError("Tidak ada kode QR yang terdeteksi pada gambar. Coba gunakan gambar yang lebih jelas.");
    }
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black overflow-hidden animate-in fade-in duration-300">

      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-start justify-between px-4 pt-6 pb-12 bg-gradient-to-b from-black/80 to-transparent text-white pointer-events-none">
        <div className="flex flex-col gap-1 drop-shadow-md">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-brand-primary" />
            <h3 className="font-bold text-lg">Scan QRIS</h3>
          </div>
          <p className="text-xs text-white/80">
            {mode === "camera" ? "Arahkan kamera ke kode QR" : "Unggah gambar QR dari perangkat"}
          </p>
        </div>
        <button
          onClick={() => handleSafeClose()}
          disabled={isClosing}
          className="p-2 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-md transition-colors border border-white/10 pointer-events-auto disabled:opacity-50"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Scanner / Upload Area */}
      <div className="flex-1 w-full h-full relative bg-black flex items-center justify-center">

        {/* ── CAMERA MODE ── */}
        {mode === "camera" && (
          <>
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
          </>
        )}

        {/* ── UPLOAD MODE ── */}
        {mode === "upload" && (
          <>
            {/* Hidden reader div required by html5-qrcode scanFile */}
            <div id="qris-upload-reader" className="hidden"></div>

            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 z-10">
              {uploadPreview ? (
                <div className="relative w-full max-w-[320px] aspect-square rounded-2xl overflow-hidden border-2 border-brand-primary shadow-lg shadow-brand-primary/30">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={uploadPreview} alt="Preview QR" className="w-full h-full object-contain bg-black" />
                  {isProcessing && (
                    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3">
                      <div className="w-10 h-10 border-4 border-white/20 border-t-brand-primary rounded-full animate-spin"></div>
                      <p className="text-white text-sm font-medium">Memindai QR...</p>
                    </div>
                  )}
                  {uploadError && (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-3 p-4 text-center">
                      <p className="text-red-400 text-sm font-medium">{uploadError}</p>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-2 px-5 py-2 rounded-full bg-brand-primary text-white text-sm font-semibold hover:brightness-110 transition-all"
                      >
                        Coba Gambar Lain
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-4 w-full max-w-[320px] aspect-square rounded-2xl border-2 border-dashed border-white/30 bg-white/5 hover:border-brand-primary hover:bg-brand-primary/10 transition-all duration-300 group"
                >
                  <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-brand-primary/20 transition-colors">
                    <ImageIcon className="w-8 h-8 text-white/60 group-hover:text-brand-primary transition-colors" />
                  </div>
                  <div className="text-center">
                    <p className="text-white font-semibold text-base">Pilih Gambar</p>
                    <p className="text-white/50 text-xs mt-1">JPG, PNG, WEBP</p>
                  </div>
                </button>
              )}

              {/* Re-upload button when preview exists but no error */}
              {uploadPreview && !uploadError && !isProcessing && (
                <button
                  onClick={() => { setUploadPreview(null); setUploadError(null); }}
                  className="mt-4 px-5 py-2 rounded-full bg-white/10 border border-white/20 text-white text-sm font-medium hover:bg-white/20 transition-all"
                >
                  Ganti Gambar
                </button>
              )}
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              capture={undefined}
            />
          </>
        )}
      </div>

      {/* Footer: Mode Toggle + Info */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-6 pt-8 bg-gradient-to-t from-black via-black/90 to-transparent text-white safe-area-bottom">

        {/* Mode Toggle Buttons */}
        <div className="flex items-center justify-center gap-3 mb-5">
          <button
            id="qr-mode-camera"
            onClick={() => handleModeSwitch("camera")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 border ${
              mode === "camera"
                ? "bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-primary/40 scale-105"
                : "bg-white/10 text-white/70 border-white/20 hover:bg-white/20 hover:text-white"
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Kamera</span>
          </button>

          <button
            id="qr-mode-upload"
            onClick={() => handleModeSwitch("upload")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 border ${
              mode === "upload"
                ? "bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-primary/40 scale-105"
                : "bg-white/10 text-white/70 border-white/20 hover:bg-white/20 hover:text-white"
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Unggah Gambar</span>
          </button>
        </div>

        {/* Info Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-brand-primary flex items-center justify-center shrink-0 shadow-lg shadow-brand-primary/40">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-white mb-0.5">Bayar dengan QRIS</p>
            <p className="text-xs text-white/80 leading-relaxed">
              {mode === "camera"
                ? "Scan barcode merchant Pesanku untuk melanjutkan pembayaran pesanan Anda."
                : "Unggah gambar QRIS dari galeri untuk melanjutkan pembayaran."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
