"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag, Store, User, Eye, EyeOff, ArrowLeft, Home, ShoppingCart, FileText, Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<'buyer' | 'seller'>('buyer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>('');

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

      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Terjadi kesalahan";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-center items-center p-4 bg-base pt-12 pb-24 md:pb-12 relative">
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

      <div className="card w-full max-w-lg p-8">
        <h1 className="text-h2 text-text-primary mb-2 text-center">Daftar Akun Baru</h1>
        <p className="text-body-base text-text-secondary mb-8 text-center">
          Pilih peran Anda dan lengkapi data untuk mulai bergabung.
        </p>

        {success ? (
          <div className="p-4 bg-status-success/10 text-status-success rounded-lg mb-6 text-center">
            <p className="font-semibold">Registrasi berhasil!</p>
            <p className="text-sm mt-1">Mengarahkan Anda ke halaman masuk...</p>
          </div>
        ) : (
          <>
            {/* Role Selection */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <button 
                type="button"
                onClick={() => setRole('buyer')}
                className={`p-4 border rounded-xl flex flex-col items-center gap-2 transition-all ${
                  role === 'buyer' 
                    ? 'border-brand-primary bg-brand-primary/5 text-brand-primary ring-2 ring-brand-primary/20' 
                    : 'border-border bg-surface text-text-secondary hover:bg-border/30'
                }`}
              >
                <User className="w-8 h-8" />
                <span className="font-semibold">Sebagai Pembeli</span>
              </button>
              
              <button 
                type="button"
                onClick={() => setRole('seller')}
                className={`p-4 border rounded-xl flex flex-col items-center gap-2 transition-all ${
                  role === 'seller' 
                    ? 'border-brand-secondary bg-brand-secondary/10 text-brand-secondary ring-2 ring-brand-secondary/20' 
                    : 'border-border bg-surface text-text-secondary hover:bg-border/30'
                }`}
              >
                <Store className="w-8 h-8" />
                <span className="font-semibold">Sebagai Penjual</span>
              </button>
            </div>

            {error && (
              <div className="p-3 bg-status-error/10 text-status-error rounded-lg mb-6 text-sm font-medium">
                {error}
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="flex flex-col items-center mb-6">
                <span className="block text-body-small font-medium text-text-primary mb-3">
                  {role === 'seller' ? 'Foto/Logo UMKM' : 'Foto Profil Pengguna'}
                </span>
                <div className="flex flex-col items-center gap-3">
                   {logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoUrl} alt="Logo" className="w-24 h-24 rounded-2xl object-cover border-2 border-border shadow-sm" />
                   ) : (
                      <div className="w-24 h-24 rounded-2xl bg-base border-2 border-dashed border-border flex items-center justify-center text-text-secondary">
                        <span className="text-xs font-semibold">Square</span>
                      </div>
                   )}
                   <div className="text-center">
                     <input 
                       type="file" 
                       accept="image/*" 
                       id="upload-logo"
                       className="hidden"
                       onChange={handleImageChange}
                     />
                     <label htmlFor="upload-logo" className="cursor-pointer text-sm font-semibold text-brand-primary border border-brand-primary px-4 py-1.5 rounded-lg hover:bg-brand-primary hover:text-white transition-colors block mb-1">
                       Pilih Foto
                     </label>
                     <p className="text-[10px] text-text-secondary">Maks 2MB (JPG/PNG)</p>
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
                </>
              )}

              <div>
                <label className="block text-body-small font-medium text-text-primary mb-1">
                  {role === 'seller' ? 'Alamat Lengkap Toko' : 'Alamat Lengkap Pengiriman'}
                </label>
                <textarea 
                  name="address"
                  placeholder={role === 'seller' ? "Masukkan alamat lengkap toko Anda" : "Masukkan alamat lengkap rumah Anda"}
                  className="input-field min-h-[80px] resize-none"
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

              <button disabled={loading} type="submit" className="btn-primary w-full mt-6 py-3 text-lg disabled:opacity-50">
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
