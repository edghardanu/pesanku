"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { ShoppingBag, Store, User, Eye, EyeOff, ArrowLeft, Home, ShoppingCart, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { useDarkMode } from '@/hooks';
import { formatCountdown } from '@/lib/format';

export default function RegisterPage() {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const router = useRouter();
  const [role, setRole] = useState<'buyer' | 'seller'>('buyer');
  const [publicStats, setPublicStats] = useState({ totalUmkm: "...", avgRating: "..." });

  useEffect(() => {
    fetch('/api/public-stats').then(r => r.json()).then(data => {
      if (data) {
        setPublicStats({ totalUmkm: data.totalUmkm, avgRating: data.avgRating });
      }
    }).catch(e => console.error(e));
  }, []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>('');

  // === OTP States ===
  const [otpStep, setOtpStep] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer OTP
  useEffect(() => {
    if (otpCountdown <= 0) return;
    const timer = setInterval(() => setOtpCountdown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [otpCountdown]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Ukuran minimum file 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setLogoUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      password: formData.get("password"),
      role: role,
      storeName: formData.get("storeName"),
      address: formData.get("address"),
      bankAccount: formData.get("bankAccount"),
      logoUrl: logoUrl
    };

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || "Terjadi kesalahan");
      }

      // Registrasi berhasil → pindah ke step OTP
      setRegisteredEmail(json.email || (formData.get("email") as string).trim().toLowerCase());
      setOtpStep(true);
      setOtpCountdown(300); // 5 menit
      setOtpDigits(["", "", "", "", "", ""]);

      Swal.fire({
        icon: "success",
        title: "Registrasi Berhasil!",
        text: "Kode verifikasi telah dikirim ke email Anda.",
        confirmButtonColor: "#800000",
        timer: 3000,
        timerProgressBar: true,
      });

      // Auto-focus ke input OTP pertama
      setTimeout(() => otpInputRefs.current[0]?.focus(), 400);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Terjadi kesalahan";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // Handle OTP digit input
  // ========================================
  const handleOtpDigitChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;
    const updated = [...otpDigits];
    updated[index] = value;
    setOtpDigits(updated);
    if (value && index < 5) otpInputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
    if (e.key === "Enter") handleVerifyOtp();
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted.length) return;
    const newDigits = [...otpDigits];
    for (let i = 0; i < pasted.length; i++) newDigits[i] = pasted[i];
    setOtpDigits(newDigits);
    otpInputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  // ========================================
  // Verifikasi OTP
  // ========================================
  const handleVerifyOtp = async () => {
    const fullCode = otpDigits.join("");
    if (fullCode.length !== 6) {
      Swal.fire({ icon: "warning", title: "Kode Belum Lengkap", text: "Masukkan 6 digit kode OTP.", confirmButtonColor: "#800000" });
      return;
    }

    setOtpLoading(true);
    try {
      const verifyRes = await fetch("/api/otp/verify-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: registeredEmail, code: fullCode }),
      });
      const verifyResult = await verifyRes.json();

      if (verifyResult.success) {
        Swal.fire({
          icon: "success",
          title: "Akun Aktif! ✅",
          text: verifyResult.message,
          confirmButtonColor: "#800000",
        }).then(() => {
          router.push("/login");
        });
      } else {
        Swal.fire({ icon: "error", title: "Verifikasi Gagal", text: verifyResult.message, confirmButtonColor: "#800000" });
      }
    } catch {
      Swal.fire({ icon: "error", title: "Error", text: "Gagal menghubungi server.", confirmButtonColor: "#800000" });
    } finally {
      setOtpLoading(false);
    }
  };

  // ========================================
  // Kirim ulang OTP
  // ========================================
  const handleResendOtp = async () => {
    if (otpCountdown > 0) return;
    setOtpLoading(true);
    try {
      const res = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: registeredEmail }),
      });
      const result = await res.json();
      if (result.success) {
        setOtpCountdown(300);
        setOtpDigits(["", "", "", "", "", ""]);
        Swal.fire({ icon: "success", title: "Kode Baru Terkirim!", text: "Cek email Anda.", confirmButtonColor: "#800000", timer: 2000, timerProgressBar: true });
        setTimeout(() => otpInputRefs.current[0]?.focus(), 300);
      } else {
        Swal.fire({ icon: "error", title: "Gagal", text: result.message, confirmButtonColor: "#800000" });
      }
    } catch {
      Swal.fire({ icon: "error", title: "Error", text: "Gagal menghubungi server.", confirmButtonColor: "#800000" });
    } finally {
      setOtpLoading(false);
    }
  };




  return (
    <div className="min-h-screen flex flex-col lg:flex-row-reverse bg-white dark:bg-gray-950 relative overflow-x-hidden">
      {/* Left Form Section */}
      <div className="flex-[1.2] relative z-10 w-full lg:w-3/5 lg:h-screen lg:overflow-y-auto px-4 sm:px-8 py-6 lg:py-12">
        <div className="w-full max-w-xl mx-auto flex flex-col px-0 lg:px-8 pt-4 pb-8">


          <div className="w-full flex-1 flex flex-col pb-24 md:pb-12">

            <Link href="/" className="flex justify-center items-center gap-3 mb-10 hover:opacity-80 transition-opacity">
              <ShoppingBag className="w-10 h-10 text-brand-primary" />
              <span className="text-display-1 text-brand-primary font-bold text-3xl">pesanku</span>
            </Link>

            <div className="w-full">
              <h1 className="text-2xl font-bold text-text-primary mb-1 text-center">Daftar Akun Baru</h1>
              <p className="text-body-base text-text-secondary mb-5 text-center">
                Pilih peran Anda dan lengkapi data untuk mulai bergabung.
              </p>

              {otpStep ? (
                /* ============ OTP VERIFICATION STEP ============ */
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-brand-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-bold text-text-primary">Verifikasi Email Anda</h2>
                    <p className="text-sm text-text-secondary mt-2">
                      Kode 6 digit telah dikirim ke <span className="font-semibold text-text-primary">{registeredEmail}</span>
                    </p>
                  </div>

                  {/* 6 Digit OTP Boxes */}
                  <div className="flex justify-center gap-2 sm:gap-3">
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
                        className="w-11 h-14 sm:w-12 sm:h-14 text-center text-xl font-bold border-2 border-border rounded-xl bg-surface text-text-primary focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
                        disabled={otpLoading}
                      />
                    ))}
                  </div>

                  {/* Countdown */}
                  {otpCountdown > 0 ? (
                    <p className="text-center text-sm text-text-secondary">
                      Kode berlaku selama <span className="font-semibold text-brand-primary">{formatCountdown(otpCountdown)}</span>
                    </p>
                  ) : (
                    <p className="text-center text-sm text-status-error font-medium">
                      Kode telah kedaluwarsa.
                    </p>
                  )}

                  {/* Verify Button */}
                  <button
                    onClick={handleVerifyOtp}
                    disabled={otpLoading || otpDigits.join("").length < 6}
                    className="btn-primary w-full py-3 text-lg disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {otpLoading ? (
                      <>
                        <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Memverifikasi...
                      </>
                    ) : (
                      "Verifikasi & Aktifkan Akun"
                    )}
                  </button>

                  {/* Resend */}
                  <div className="flex items-center justify-center">
                    <button
                      onClick={handleResendOtp}
                      disabled={otpLoading || otpCountdown > 0}
                      className="text-sm text-brand-primary hover:text-brand-primary-hover font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Kirim Ulang Kode
                    </button>
                  </div>
                </div>
              ) : success ? (
                <div className="p-4 bg-status-success/10 text-status-success rounded-lg mb-6 text-center">
                  <p className="font-semibold">Registrasi berhasil!</p>
                  <p className="text-sm mt-1">Mengarahkan Anda ke halaman masuk...</p>
                </div>
              ) : (
                <>
                  {/* Role Selection */}
                  <div className="grid grid-cols-2 gap-4 mb-5">
                    <button
                      type="button"
                      onClick={() => setRole('buyer')}
                      className={`p-4 border rounded-xl flex items-center justify-center gap-2 transition-all ${role === 'buyer'
                        ? 'border-brand-primary bg-brand-primary/5 text-brand-primary ring-2 ring-brand-primary/20'
                        : 'border-border bg-surface text-text-secondary hover:bg-border/30'
                        }`}
                    >
                      <User className="w-5 h-5" />
                      <span className="font-semibold text-sm">Pembeli</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRole('seller')}
                      className={`p-4 border rounded-xl flex items-center justify-center gap-2 transition-all ${role === 'seller'
                        ? 'border-brand-secondary bg-brand-secondary/10 text-brand-secondary ring-2 ring-brand-secondary/20'
                        : 'border-border bg-surface text-text-secondary hover:bg-border/30'
                        }`}
                    >
                      <Store className="w-5 h-5" />
                      <span className="font-semibold text-sm">Penjual</span>
                    </button>
                  </div>

                  {error && (
                    <div className="p-3 bg-status-error/10 text-status-error rounded-lg mb-6 text-sm font-medium">
                      {error}
                    </div>
                  )}

                  <form className="space-y-3" onSubmit={handleSubmit}>
                    <div className="flex flex-col items-center mb-6">
                      <label className="block text-body-small font-medium text-text-primary mb-2">
                        {role === 'seller' ? 'Foto/Logo UMKM' : 'Foto Profil Pengguna'}
                      </label>
                      <div className="flex flex-col items-center gap-3">
                        {logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={logoUrl} alt="Logo" className="w-32 h-32 rounded-3xl object-cover border-4 border-white shadow-md" />
                        ) : (
                          <div className="w-32 h-32 rounded-3xl bg-base border-2 border-dashed border-border flex flex-col items-center justify-center text-text-secondary gap-1">
                            <span className="text-sm font-semibold">Foto</span>
                          </div>
                        )}
                        <div className="flex flex-col items-center mt-1">
                          <input
                            type="file"
                            accept="image/*"
                            id="upload-logo"
                            className="hidden"
                            onChange={handleImageChange}
                          />
                          <label htmlFor="upload-logo" className="cursor-pointer text-sm font-semibold text-brand-primary border border-brand-primary px-5 py-2 rounded-lg hover:bg-brand-primary hover:text-white transition-colors block mb-1">
                            Pilih Foto
                          </label>
                          <p className="text-[9px] text-text-secondary">Maks 2MB (JPG/PNG)</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-body-small font-medium text-text-primary mb-1">
                        Nama Lengkap
                      </label>
                      <input
                        type="text"
                        name="name"
                        placeholder="Masukkan nama lengkap"
                        className="input-field"
                        required
                      />
                    </div>

                    {role === 'seller' && (
                      <>
                        <div>
                          <label className="block text-body-small font-medium text-text-primary mb-1">
                            Nama Toko / UMKM
                          </label>
                          <input
                            type="text"
                            name="storeName"
                            placeholder="Contoh: Ayam Bakar Pak Budi"
                            className="input-field"
                            required
                          />
                        </div>
                        <div className="mt-3">
                          <label className="block text-body-small font-medium text-text-primary mb-1">
                            Informasi Rekening Pencairan Dana
                          </label>
                          <input
                            type="text"
                            name="bankAccount"
                            placeholder="Contoh: BCA - 1234567890 a/n Budi Santoso"
                            className="input-field"
                            required
                          />
                          <p className="text-[11px] text-text-secondary mt-1">
                            Digunakan untuk pencairan dana hasil penjualan Anda.
                          </p>
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block text-body-small font-medium text-text-primary mb-1">
                        {role === 'seller' ? 'Alamat Lengkap Toko' : 'Alamat Lengkap Pengiriman'}
                      </label>
                      <textarea
                        name="address"
                        placeholder={role === 'seller' ? "Masukkan alamat lengkap toko Anda" : "Masukkan alamat lengkap rumah Anda"}
                        className="input-field min-h-[50px] text-sm py-2 resize-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-body-small font-medium text-text-primary mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        placeholder="Masukkan email aktif"
                        className="input-field"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-body-small font-medium text-text-primary mb-1">
                        No. Handphone (WhatsApp)
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        placeholder="08xxxxxxxxxx"
                        className="input-field"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-body-small font-medium text-text-primary mb-1">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          name="password"
                          placeholder="Minimal 8 karakter"
                          className="input-field pr-10"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-secondary hover:text-text-primary"
                        >
                          {showPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 mb-1 text-[11px] text-text-secondary text-center">
                      Dengan mendaftar, Anda menyetujui <Link href="/terms" target="_blank" className="text-brand-primary hover:underline font-semibold">Syarat & Ketentuan</Link> Pesanku.
                    </div>

                    <button disabled={loading} type="submit" className="btn-primary w-full mt-2 py-3 text-lg disabled:opacity-50">
                      {loading ? "Memproses..." : "Daftar"}
                    </button>
                  </form>
                </>
              )}

              <div className="mt-8 text-center">
                <p className="text-body-small text-text-secondary">
                  Sudah punya akun?{' '}
                  <Link href="/login" className="text-brand-primary font-medium hover:underline">
                    Masuk
                  </Link>
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Right Image Section (Now visually on Left) */}
      <div className="flex order-first lg:order-none w-full lg:w-2/5 h-44 sm:h-52 lg:h-screen lg:sticky lg:top-0 relative shadow-lg lg:shadow-[10px_0px_30px_-15px_rgba(0,0,0,0.3)] bg-brand-primary overflow-hidden">



        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1555126634-323283e090fa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"
          alt="Toko UMKM Lokal"
          className="absolute inset-0 w-full h-full object-cover opacity-90"
        />
        <div className="relative z-10 w-full h-full bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-between p-4 sm:p-6 lg:p-10 xl:p-16">
          <div className="w-full flex-none">
            <Link href="/login" className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2.5 bg-black/35 hover:bg-black/50 backdrop-blur-md border border-white/20 text-white rounded-full transition-all group shadow-xl">
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="font-semibold tracking-wide text-xs sm:text-sm">Masuk</span>
            </Link>
          </div>
          <motion.div className="hidden lg:flex flex-col mt-auto pt-8 lg:pt-12" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8 }}>
            <div className="flex items-center justify-center gap-4 mb-6 lg:mb-8">
              <div className="bg-white rounded-xl shadow-lg p-2">
                <ShoppingBag className="w-10 h-10 lg:w-14 lg:h-14 text-brand-primary" strokeWidth={2.5} />
              </div>
              <span className="text-4xl lg:text-7xl font-extrabold text-brand-primary tracking-wide drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">pesanku</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-5xl font-extrabold text-white mb-2 lg:mb-4 leading-tight">Mulai<br className="hidden sm:block" /><span className="text-white drop-shadow-md">Perjalananmu</span></h2>
            <p className="text-sm sm:text-base lg:text-lg text-white/90 leading-relaxed mb-4 lg:mb-6 hidden sm:block lg:block">Bergabung ribuan pelanggan dan mitra UMKM yang saling terhubung dalam platform Pesanku.</p>
            <div className="hidden sm:grid grid-cols-2 gap-4">
              <div className="bg-brand-primary rounded-2xl p-4 border border-white/10 shadow-md">
                <div className="text-3xl font-bold text-white mb-1">{publicStats.totalUmkm}</div>
                <div className="text-xs text-white/80 font-medium uppercase tracking-wider">Mitra UMKM</div>
              </div>
              <div className="bg-brand-primary rounded-2xl p-4 border border-white/10 shadow-md">
                <div className="text-3xl font-bold text-white mb-1 flex items-center gap-1">{publicStats.avgRating} <span className="text-2xl text-yellow-400">★</span></div>
                <div className="text-xs text-white/80 font-medium uppercase tracking-wider">Kepuasan Pelanggan</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar (Register Page) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-surface border-t border-border px-4 py-2 flex justify-between items-end pb-8 shadow-[0_-4px_15px_rgba(0,0,0,0.05)] text-[10px] font-medium rounded-t-2xl">
        <Link
          href="/"
          className="flex flex-col items-center gap-1.5 w-1/4 text-text-secondary hover:text-brand-primary transition-colors pb-2"
        >
          <Home className="w-6 h-6 stroke-[1.5]" />
          <span>Beranda</span>
        </Link>

        <div className="w-1/4 flex flex-col justify-end items-center relative pb-2 h-full">
          <Link
            href="/#katalog"
            className="absolute bottom-6 flex justify-center w-full"
            aria-label="Buka katalog produk"
          >
            <span className="w-14 h-14 rounded-full bg-brand-primary text-white flex items-center justify-center shadow-lg hover:bg-brand-primary-hover transition-all transform hover:scale-105">
              <ShoppingBag className="w-7 h-7 stroke-[1.5]" />
            </span>
          </Link>
          <span className="text-text-secondary mt-1">Belanja</span>
        </div>

        <Link
          href="/buyer/orders"
          className="flex flex-col items-center gap-1.5 w-1/4 text-text-secondary hover:text-brand-primary transition-colors pb-2"
        >
          <FileText className="w-6 h-6 stroke-[1.5]" />
          <span>Pesanan</span>
        </Link>

        <Link
          href="/login"
          className="flex flex-col items-center gap-1.5 w-1/4 text-brand-primary font-semibold pb-2"
        >
          <User className="w-6 h-6 stroke-[1.5] fill-brand-primary/10 stroke-brand-primary" />
          <span>Masuk</span>
        </Link>
      </nav>
    </div>
  );
}
