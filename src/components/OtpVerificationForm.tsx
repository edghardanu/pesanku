"use client";

import { useState, useRef, useEffect } from "react";
import Swal from "sweetalert2";

type OtpStep = "email" | "otp";

export default function OtpVerificationForm() {
  const [currentStep, setCurrentStep] = useState<OtpStep>("email");
  const [emailInput, setEmailInput] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer untuk resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // ========================================
  // STEP 1: Kirim OTP ke email
  // ========================================
  const handleSendOtp = async () => {
    const trimmedEmail = emailInput.trim().toLowerCase();

    if (!trimmedEmail) {
      Swal.fire({ icon: "warning", title: "Email Kosong", text: "Silakan masukkan alamat email Anda.", confirmButtonColor: "#800000" });
      return;
    }

    const emailFormatRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailFormatRegex.test(trimmedEmail)) {
      Swal.fire({ icon: "warning", title: "Format Salah", text: "Masukkan alamat email yang valid.", confirmButtonColor: "#800000" });
      return;
    }

    setIsLoading(true);

    try {
      const sendResponse = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const sendResult = await sendResponse.json();

      if (sendResult.success) {
        setCurrentStep("otp");
        setCountdown(300); // 5 menit = 300 detik
        setOtpDigits(["", "", "", "", "", ""]);

        Swal.fire({
          icon: "success",
          title: "OTP Terkirim!",
          text: `Kode verifikasi telah dikirim ke ${trimmedEmail}`,
          confirmButtonColor: "#800000",
          timer: 3000,
          timerProgressBar: true,
        });

        // Auto-focus ke input OTP pertama
        setTimeout(() => otpInputRefs.current[0]?.focus(), 400);
      } else {
        Swal.fire({ icon: "error", title: "Gagal Mengirim", text: sendResult.message || "Terjadi kesalahan.", confirmButtonColor: "#800000" });
      }
    } catch {
      Swal.fire({ icon: "error", title: "Error", text: "Gagal menghubungi server. Coba lagi.", confirmButtonColor: "#800000" });
    } finally {
      setIsLoading(false);
    }
  };

  // ========================================
  // STEP 2: Verifikasi OTP
  // ========================================
  const handleVerifyOtp = async () => {
    const fullOtpCode = otpDigits.join("");

    if (fullOtpCode.length !== 6) {
      Swal.fire({ icon: "warning", title: "Kode Belum Lengkap", text: "Masukkan 6 digit kode OTP.", confirmButtonColor: "#800000" });
      return;
    }

    setIsLoading(true);

    try {
      const verifyResponse = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailInput.trim().toLowerCase(),
          code: fullOtpCode,
        }),
      });

      const verifyResult = await verifyResponse.json();

      if (verifyResult.success) {
        Swal.fire({
          icon: "success",
          title: "Verifikasi Berhasil! ✅",
          text: verifyResult.message,
          confirmButtonColor: "#800000",
        });
        // Reset form
        setCurrentStep("email");
        setEmailInput("");
        setOtpDigits(["", "", "", "", "", ""]);
        setCountdown(0);
      } else {
        Swal.fire({ icon: "error", title: "Verifikasi Gagal", text: verifyResult.message, confirmButtonColor: "#800000" });
      }
    } catch {
      Swal.fire({ icon: "error", title: "Error", text: "Gagal menghubungi server. Coba lagi.", confirmButtonColor: "#800000" });
    } finally {
      setIsLoading(false);
    }
  };

  // ========================================
  // Handle input OTP per digit
  // ========================================
  const handleOtpDigitChange = (index: number, value: string) => {
    // Hanya angka
    if (value && !/^\d$/.test(value)) return;

    const updatedDigits = [...otpDigits];
    updatedDigits[index] = value;
    setOtpDigits(updatedDigits);

    // Auto-focus ke input berikutnya
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
    if (e.key === "Enter") {
      handleVerifyOtp();
    }
  };

  // Handle paste (misal user copy-paste 6 digit sekaligus)
  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pastedText.length === 0) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < pastedText.length; i++) {
      newDigits[i] = pastedText[i];
    }
    setOtpDigits(newDigits);

    // Focus ke digit terakhir yang terisi
    const lastIndex = Math.min(pastedText.length, 5);
    otpInputRefs.current[lastIndex]?.focus();
  };

  // Format countdown
  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        
        {/* Header */}
        <div className="bg-brand-primary px-6 py-5 text-center">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-white text-xl font-bold">Verifikasi Email</h2>
          <p className="text-white/80 text-sm mt-1">
            {currentStep === "email" ? "Masukkan email untuk menerima kode OTP" : "Masukkan 6 digit kode yang dikirim"}
          </p>
        </div>

        <div className="px-6 py-8">
          {/* ============ STEP 1: Email Input ============ */}
          {currentStep === "email" && (
            <div className="space-y-5">
              <div>
                <label htmlFor="otp-email-input" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Alamat Email
                </label>
                <input
                  id="otp-email-input"
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                  placeholder="contoh@email.com"
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none transition-all text-sm"
                  disabled={isLoading}
                />
              </div>
              <button
                onClick={handleSendOtp}
                disabled={isLoading}
                className="w-full py-3 bg-brand-primary text-white font-semibold rounded-xl hover:bg-brand-primary-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm shadow-lg shadow-brand-primary/20"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Mengirim...
                  </>
                ) : (
                  "Kirim Kode OTP"
                )}
              </button>
            </div>
          )}

          {/* ============ STEP 2: OTP Input ============ */}
          {currentStep === "otp" && (
            <div className="space-y-6">
              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                Kode dikirim ke <span className="font-semibold text-gray-700 dark:text-gray-200">{emailInput}</span>
              </p>

              {/* 6 Digit OTP Boxes */}
              <div className="flex justify-center gap-3">
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { otpInputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={index === 0 ? handleOtpPaste : undefined}
                    className="w-12 h-14 text-center text-xl font-bold border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
                    disabled={isLoading}
                  />
                ))}
              </div>

              {/* Countdown Timer */}
              {countdown > 0 && (
                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                  Kode berlaku selama <span className="font-semibold text-brand-primary">{formatCountdown(countdown)}</span>
                </p>
              )}
              {countdown <= 0 && currentStep === "otp" && (
                <p className="text-center text-sm text-red-500 font-medium">
                  Kode telah kedaluwarsa. Silakan kirim ulang.
                </p>
              )}

              {/* Verify Button */}
              <button
                onClick={handleVerifyOtp}
                disabled={isLoading || otpDigits.join("").length < 6}
                className="w-full py-3 bg-brand-primary text-white font-semibold rounded-xl hover:bg-brand-primary-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm shadow-lg shadow-brand-primary/20"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Memverifikasi...
                  </>
                ) : (
                  "Verifikasi Kode OTP"
                )}
              </button>

              {/* Resend & Back actions */}
              <div className="flex items-center justify-between text-sm">
                <button
                  onClick={() => {
                    setCurrentStep("email");
                    setOtpDigits(["", "", "", "", "", ""]);
                    setCountdown(0);
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                  disabled={isLoading}
                >
                  ← Ganti Email
                </button>
                <button
                  onClick={handleSendOtp}
                  disabled={isLoading || countdown > 0}
                  className="text-brand-primary hover:text-brand-primary-hover font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Kirim Ulang
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
