"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag, Eye, EyeOff, ArrowLeft } from "lucide-react";
import Swal from 'sweetalert2';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    
    if (isForgotPassword) {
      // Handle Reset Password
      const data = {
        email: formData.get("email"),
        newPassword: formData.get("newPassword"),
      };

      try {
        const res = await fetch("/api/auth/reset-password", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || "Gagal mengubah password");
        }

        Swal.fire('Berhasil!', 'Password Anda telah diperbarui. Silakan login dengan password baru.', 'success');
        setIsForgotPassword(false);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Handle Login
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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-center items-center p-4 bg-base relative">
      <Link href="/" className="absolute top-6 left-6 flex items-center gap-2 text-text-secondary hover:text-brand-primary transition-colors font-medium bg-surface border border-border px-4 py-2 rounded-full shadow-sm">
        <ArrowLeft className="w-5 h-5" />
        <span className="inline">Kembali ke Beranda</span>
      </Link>

      <Link href="/" className="flex items-center gap-2 mb-8 hover:opacity-80 transition-opacity">
        <ShoppingBag className="w-10 h-10 text-brand-primary" />
        <span className="text-display-1 text-brand-primary font-bold">pesanku</span>
      </Link>

      <div className="card w-full max-w-md p-8">
        <h1 className="text-h2 text-text-primary mb-2 text-center">
          {isForgotPassword ? "Ganti Password Baru" : "Selamat Datang Kembali!"}
        </h1>
        <p className="text-body-base text-text-secondary mb-8 text-center">
          {isForgotPassword 
            ? "Masukkan email Anda dan password baru yang diinginkan." 
            : "Silakan masuk ke akun Anda."}
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

          {!isForgotPassword ? (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-body-small font-medium text-text-primary">
                  Password
                </label>
                <button 
                  type="button" 
                  onClick={() => {
                    setIsForgotPassword(true);
                    setError("");
                  }} 
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
          ) : (
            <div>
              <label className="block text-body-small font-medium text-text-primary mb-1">
                Password Baru
              </label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  name="newPassword"
                  placeholder="Masukkan password baru"
                  className="input-field pr-10"
                  required
                  minLength={6}
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
          )}

          <button disabled={loading} type="submit" className="btn-primary w-full mt-6 py-3 text-lg disabled:opacity-50">
            {loading ? "Memproses..." : (isForgotPassword ? "Simpan Password Baru" : "Masuk")}
          </button>
        </form>

        <div className="mt-8 text-center space-y-3">
          {isForgotPassword && (
            <button 
              onClick={() => {
                setIsForgotPassword(false);
                setError("");
              }}
              className="text-body-small text-text-secondary hover:text-text-primary hover:underline block w-full"
            >
              Kembali ke Login
            </button>
          )}
          
          {!isForgotPassword && (
            <p className="text-body-small text-text-secondary">
              Belum punya akun?{' '}
              <Link href="/register" className="text-brand-primary font-medium hover:underline">
                Daftar Sekarang
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
