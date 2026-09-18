"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag, Eye, EyeOff, ArrowLeft, Home, FileText, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Swal from 'sweetalert2';
import { useDarkMode } from '@/hooks';
import Logo from "@/components/ui/Logo";

export default function LoginPage() {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const errorParam = params.get("error");
      if (errorParam) {
        setError(errorParam);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);

    
    const data = {
      email: formData.get("email"),
      password: formData.get("password"),
    };

    let isSuccess = false;
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        if (json.requiresOtp) {
          router.push(`/verify?email=${encodeURIComponent(json.email)}&autoSend=true`);
          return;
        }
        throw new Error(json.message || "Terjadi kesalahan");
      }

      // Tandai sukses agar loading tidak di-set false (menunggu perpindahan halaman selesai)
      isSuccess = true;

      // Redirect berdasarkan role
      if (json.user?.role === "penjual") {
        router.push("/seller");
      } else if (json.user?.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/");
      }
      router.refresh();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Terjadi kesalahan";
      setError(errMsg);
    } finally {
      if (!isSuccess) {
        setLoading(false);
      }
    }
  };


  return (
    <div className="min-h-screen flex flex-col lg:flex-row-reverse bg-white dark:bg-gray-950 relative overflow-x-hidden">
      {/* Left Form Section */}
      <div className="flex-[1.2] relative z-10 w-full lg:w-3/5 lg:h-screen lg:overflow-y-auto px-4 sm:px-8 py-6 lg:py-12">
      <div className="w-full max-w-md lg:max-w-2xl xl:max-w-3xl mx-auto flex flex-col px-0 lg:px-12 xl:px-20 pt-4 lg:pt-8 pb-20">
      

      <div className="w-full flex-1 flex flex-col pb-24 md:pb-12">

        <Link href="/" className="flex justify-center items-center gap-3 mb-10 hover:opacity-80 transition-opacity">
          <Logo className="w-56 sm:w-64 md:w-80 lg:w-[320px] max-w-full" priority={true} />
        </Link>

        <div className="w-full">
          <h1 className="text-h2 text-text-primary mb-2 text-center">
            Selamat Datang Kembali!
          </h1>
          <p className="text-body-base text-text-secondary mb-8 text-center">
            Silakan masuk ke akun Anda.
          </p>

          {error && (
            <div className="p-3 bg-status-error/10 text-status-error rounded-lg mb-6 text-sm font-medium">
              {error}
            </div>
          )}

          <form className="space-y-3" onSubmit={handleSubmit}>
            <div>
              <label className="block text-body-small font-medium text-text-primary mb-1">
                Email
              </label>
              <input 
                type="email" 
                name="email"
                placeholder="Masukkan email Anda"
                className="input-field"
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-body-small font-medium text-text-primary">
                  Password
                </label>
                <Link 
                  href="/forgot-password"
                  className="text-caption text-brand-primary hover:underline bg-transparent border-none p-0 cursor-pointer"
                >
                  Lupa password?
                </Link>
              </div>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Masukkan password Anda"
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

            <button disabled={loading} type="submit" className="btn-primary w-full mt-6 py-3 text-lg disabled:opacity-50">
              {loading ? "Memproses..." : "Masuk"}
            </button>
          </form>

          <div className="mt-8 text-center space-y-3">
            <p className="text-body-small text-text-secondary">
              Belum punya akun?{' '}
              <Link href="/register" className="text-brand-primary font-medium hover:underline">
                Daftar Sekarang
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
          src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" 
          alt="Makanan UMKM"
          className="absolute inset-0 w-full h-full object-cover opacity-90"
        />
        <div className="relative z-10 w-full h-full bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-between p-4 sm:p-6 lg:p-10 xl:p-16">
          <div className="w-full flex-none">
            <Link href="/" className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2.5 bg-black/35 hover:bg-black/50 backdrop-blur-md border border-white/20 text-white rounded-full transition-all group shadow-xl">
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="font-semibold tracking-wide text-xs sm:text-sm">Beranda</span>
            </Link>
          </div>
          <motion.div className="hidden lg:flex flex-col mt-auto pt-8 lg:pt-12" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.8 }}>
            <h2 className="text-2xl sm:text-3xl lg:text-5xl font-extrabold text-white mb-2 lg:mb-4 leading-tight">Dukung Kuliner<br className="hidden sm:block"/> UMKM Lokal</h2>
            <p className="text-sm sm:text-base lg:text-lg text-white/90 max-w-lg leading-relaxed mb-4 lg:mb-6 hidden sm:block lg:block">Nikmati hidangan lezat dan segar langsung dari tangan ahlinya, dukung pengusaha kecil di sekitarmu.</p>
            <div className="hidden sm:flex gap-4">
               <div className="flex-1 bg-brand-primary backdrop-blur-md rounded-2xl p-4 border border-white/20">
                 <div className="text-3xl font-bold text-white mb-1">Cepat</div>
                 <div className="text-xs text-white font-medium uppercase tracking-wider">Akses Langsung</div>
               </div>
               <div className="flex-1 bg-brand-primary backdrop-blur-md rounded-2xl p-4 border border-white/20">
                 <div className="text-3xl font-bold text-white mb-1">Aman</div>
                 <div className="text-xs text-white font-medium uppercase tracking-wider">Transaksi Terjamin</div>
               </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar (Login Page) */}
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
        
        <button 
          className="flex flex-col items-center gap-1.5 w-1/4 text-brand-primary font-semibold pb-2"
        >
          <User className="w-6 h-6 stroke-[1.5] fill-brand-primary/10 stroke-brand-primary" />
          <span>Masuk</span>
        </button>
      </nav>
    </div>
  );
}
