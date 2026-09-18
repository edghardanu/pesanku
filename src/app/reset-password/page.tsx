"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ShoppingBag, Eye, EyeOff, LockKeyhole, ArrowLeft, XCircle, Clock } from "lucide-react";
import Swal from 'sweetalert2';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isExpired, setIsExpired] = useState(false);
  const [isInvalid, setIsInvalid] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    setIsChecking(true);
    if (!token) {
      setIsInvalid(true);
      setIsChecking(false);
      return;
    }

    try {
      const base64Url = token.split('.')[1];
      if (!base64Url) throw new Error("Invalid token format");
      
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window.atob(base64)
          .split('')
          .map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join('')
      );
      
      const payload = JSON.parse(jsonPayload);
      const now = Math.floor(Date.now() / 1000);
      
      if (payload.exp && payload.exp < now) {
        setIsExpired(true);
      }
    } catch (e) {
      setIsInvalid(true);
    } finally {
      setIsChecking(false);
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) return;

    if (newPassword.length < 8) {
      Swal.fire({
        icon: 'warning',
        title: 'Kata Sandi Terlalu Pendek',
        text: 'Kata sandi baru harus memiliki setidaknya 8 karakter.',
        confirmButtonColor: '#ff5c35',
      });
      return;
    }

    const strongRegex = new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])");
    if (!strongRegex.test(newPassword)) {
      Swal.fire({
        icon: 'warning',
        title: 'Kata Sandi Lemah',
        text: 'Kata sandi harus mengandung setidaknya 1 huruf besar, 1 huruf kecil, 1 angka, dan 1 simbol (karakter spesial).',
        confirmButtonColor: '#ff5c35',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      Swal.fire({
        icon: 'warning',
        title: 'Kata Sandi Tidak Cocok',
        text: 'Kata sandi baru dan konfirmasi kata sandi tidak cocok.',
        confirmButtonColor: '#ff5c35',
      });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, newPassword }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || "Gagal mengatur ulang kata sandi.");
      }

      await Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: 'Kata sandi Anda berhasil diatur ulang. Silakan masuk menggunakan kata sandi baru Anda.',
        confirmButtonColor: '#800000',
        allowOutsideClick: false,
      });

      router.push("/login");
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: err.message || "Terjadi kesalahan. Silakan coba lagi.",
        confirmButtonColor: '#ff5c35',
      });
    } finally {
      setLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 p-8 sm:p-10 relative z-10 flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary" style={{ borderTopColor: 'transparent' }}></div>
        <p className="mt-4 text-gray-500 font-medium text-sm">Memeriksa tautan...</p>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 p-8 sm:p-10 relative z-10 flex flex-col items-center text-center">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 border border-amber-100">
            <Clock className="w-10 h-10" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-3">Tautan Kedaluwarsa</h1>
        <p className="text-sm text-gray-500 mb-8 leading-relaxed">
          Waktu 15 menit untuk mengatur ulang kata sandi sudah habis. Demi keamanan, silakan minta tautan yang baru.
        </p>

        <Link
          href="/forgot-password"
          className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white font-bold text-sm py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg flex justify-center items-center"
        >
          Minta Tautan Baru
        </Link>
        
        <div className="mt-6 pt-6 border-t border-gray-100 w-full">
          <Link href="/login" className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-500 hover:text-brand-primary transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Halaman Masuk
          </Link>
        </div>
      </div>
    );
  }

  if (isInvalid) {
    return (
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 p-8 sm:p-10 relative z-10 flex flex-col items-center text-center">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500 border border-red-100">
            <XCircle className="w-10 h-10" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-3">Tautan Tidak Valid</h1>
        <p className="text-sm text-gray-500 mb-8 leading-relaxed">
          Tautan reset kata sandi ini tidak valid atau formatnya rusak. Pastikan Anda menyalin seluruh tautan dengan benar.
        </p>

        <Link
          href="/forgot-password"
          className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white font-bold text-sm py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg flex justify-center items-center"
        >
          Minta Tautan Baru
        </Link>
        
        <div className="mt-6 pt-6 border-t border-gray-100 w-full">
          <Link href="/login" className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-500 hover:text-brand-primary transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Halaman Masuk
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 p-8 sm:p-10 relative z-10 flex flex-col">
      <div className="flex justify-center mb-6">
        <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center">
          <LockKeyhole className="w-8 h-8 text-brand-primary" />
        </div>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">Buat Kata Sandi Baru</h1>
      <p className="text-sm text-gray-500 text-center mb-8 leading-relaxed">
        Silakan buat kata sandi baru untuk akun Anda. Jangan lupa untuk menyimpannya dengan aman.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Kata Sandi Baru
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min. 8 karakter, ada huruf & angka & simbol"
              className="w-full pl-4 pr-10 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all text-sm shadow-inner"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Konfirmasi Kata Sandi Baru
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ketik ulang kata sandi baru"
              className="w-full pl-4 pr-10 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all text-sm shadow-inner"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white font-bold text-sm py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2 mt-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Menyimpan...
            </>
          ) : (
            "Simpan Kata Sandi Baru"
          )}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-gray-100 text-center">
        <Link href="/login" className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-500 hover:text-brand-primary transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Batal & Kembali ke Halaman Masuk
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 relative overflow-hidden">
      {/* Decorative background shapes */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-brand-primary/10 rounded-full blur-3xl opacity-60 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-3xl opacity-60 pointer-events-none" />

      <Suspense fallback={
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 p-8 sm:p-10 relative z-10 flex flex-col items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary" style={{ borderTopColor: 'transparent' }}></div>
          <p className="mt-4 text-gray-500 font-medium text-sm">Memuat...</p>
        </div>
      }>
        <ResetPasswordContent />
      </Suspense>
    </div>
  );
}
