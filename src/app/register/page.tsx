"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag, Store, User, Eye, EyeOff, ArrowLeft } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<'buyer' | 'seller'>('buyer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-center items-center p-4 bg-base py-12 relative">
      <Link href="/" className="absolute top-6 left-6 flex items-center gap-2 text-text-secondary hover:text-brand-primary transition-colors font-medium bg-surface border border-border px-4 py-2 rounded-full shadow-sm">
        <ArrowLeft className="w-5 h-5" />
        <span className="inline">Kembali ke Beranda</span>
      </Link>

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
                  <div>
                    <label className="block text-body-small font-medium text-text-primary mb-1">
                      Alamat Lengkap Toko
                    </label>
                    <textarea 
                      name="address"
                      placeholder="Masukkan alamat lengkap toko Anda"
                      className="input-field min-h-[80px] resize-none"
                      required
                    />
                  </div>
                </>
              )}

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
    </div>
  );
}
