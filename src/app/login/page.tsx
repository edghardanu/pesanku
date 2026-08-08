"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag, Eye, EyeOff, ArrowLeft, Home, FileText, User, Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Swal from 'sweetalert2';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        setIsDarkMode(true);
        document.documentElement.classList.add('dark');
      } else {
        setIsDarkMode(false);
        document.documentElement.classList.remove('dark');
      }
    }, 0);
  }, []);

  const toggleDarkMode = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
      setIsDarkMode(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    
    const data = {
      email: formData.get("email"),
      password: formData.get("password"),
    };

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
        throw new Error(json.message || "Terjadi kesalahan");
      }

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
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Swal.fire({
      icon: 'info',
      title: 'Reset password',
      text: 'Untuk keamanan akun, reset password publik dinonaktifkan. Silakan hubungi admin Pesanku untuk bantuan pemulihan akun.',
      confirmButtonColor: '#ff5722',
    });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-center items-center p-4 pb-24 md:pb-4 bg-base relative">
      <Link href="/" className="hidden lg:flex absolute top-6 left-4 md:left-6 items-center gap-2 text-text-secondary hover:text-brand-primary transition-colors font-medium bg-surface border border-border px-4 py-2 rounded-full shadow-sm z-10">
        <ArrowLeft className="w-5 h-5" />
        <span>Kembali ke Beranda</span>
      </Link>
      
      <button 
        onClick={toggleDarkMode}
        className="absolute top-6 right-4 md:right-6 p-2 bg-surface border border-border rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center justify-center w-10 h-10 shadow-sm z-10"
        aria-label="Toggle Dark Mode"
      >
        <AnimatePresence mode="wait" initial={false}>
          {isDarkMode ? (
            <motion.div
              key="moon"
              initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.5, opacity: 0, rotate: 90 }}
              transition={{ duration: 0.2 }}
              className="absolute"
            >
              <Moon className="w-5 h-5 text-brand-secondary" />
            </motion.div>
          ) : (
            <motion.div
              key="sun"
              initial={{ scale: 0.5, opacity: 0, rotate: 90 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.5, opacity: 0, rotate: -90 }}
              transition={{ duration: 0.2 }}
              className="absolute"
            >
              <Sun className="w-5 h-5 text-brand-primary" />
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      <Link href="/" className="flex items-center gap-2 mb-8 hover:opacity-80 transition-opacity">
        <ShoppingBag className="w-10 h-10 text-brand-primary" />
        <span className="text-display-1 text-brand-primary font-bold">pesanku</span>
      </Link>

      <div className="card w-full max-w-md p-8">
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

        <form className="space-y-5" onSubmit={handleSubmit}>
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
              <button 
                type="button" 
                onClick={handleForgotPassword}
                className="text-caption text-brand-primary hover:underline bg-transparent border-none p-0 cursor-pointer"
              >
                Lupa password?
              </button>
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
