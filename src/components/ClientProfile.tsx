"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Mail, Phone, Store, ArrowLeft, LogOut, Package, CreditCard, ShieldCheck } from "lucide-react";
import GlobalThemeToggle from "./GlobalThemeToggle";
import Swal from "sweetalert2";

import { AuthUser, SellerProfile } from "@/types";

export default function ClientProfile({ user, sellerData }: { user: AuthUser, sellerData?: SellerProfile | null }) {
  const router = useRouter();
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

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: 'Keluar?',
      text: "Apakah Anda yakin ingin mengakhiri sesi?",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#ff5722',
      cancelButtonColor: '#9ca3af',
      confirmButtonText: 'Ya, Keluar'
    });

    if (result.isConfirmed) {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    }
  };

  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-base text-text-primary pb-24 md:pb-12">
      {/* Header */}
      <div className="bg-surface border-b border-border sticky top-0 z-40 shadow-sm">
        <div className="max-w-m-container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-text-secondary hover:text-brand-primary transition-colors">
            <ArrowLeft className="w-6 h-6" />
            <span className="font-semibold">Kembali</span>
          </Link>
          <h1 className="text-lg font-bold">Profil Akun</h1>
          <div className="w-16"></div> {/* Spacer for centering */}
        </div>
      </div>

      <div className="max-w-m-container mx-auto p-4 space-y-6 mt-4">
        
        {/* Profile Card Summary */}
        <div className="bg-surface rounded-2xl p-6 shadow-sm border border-border flex flex-col items-center">
          <div className="w-24 h-24 rounded-full bg-brand-primary/10 border-4 border-brand-primary/20 flex items-center justify-center text-brand-primary text-3xl font-bold shadow-inner mb-4 relative overflow-hidden">
            {user?.profileImageUrl || sellerData?.logoUrl ? (
               // eslint-disable-next-line @next/next/no-img-element
               <img src={user.profileImageUrl || sellerData?.logoUrl || undefined} alt="Logo" className="w-full h-full object-cover" />
            ) : (
               getInitials(user.name)
            )}
            
            {user.role === 'penjual' && sellerData?.approvalStatus === 'approved' && (
              <div className="absolute bottom-0 bg-status-success w-full h-5 flex items-center justify-center text-white">
                <ShieldCheck className="w-3 h-3" />
              </div>
            )}
          </div>
          <h2 className="text-2xl font-bold text-center text-text-primary">{user.name}</h2>
          <span className={`px-3 py-1 rounded-full text-xs font-bold mt-2 shadow-sm ${user.role === 'penjual' ? 'bg-status-success/10 text-status-success' : user.role === 'admin' ? 'bg-status-warning/10 text-status-warning' : 'bg-brand-primary/10 text-brand-primary'}`}>
            {user.role === 'penjual' ? 'Mitra UMKM' : user.role === 'admin' ? 'Administrator' : 'Status: Pelanggan'}
          </span>
        </div>

        {/* User Info Details */}
        <div className="bg-surface rounded-2xl p-5 shadow-sm border border-border space-y-4">
          <h3 className="font-bold text-text-primary border-b border-border pb-3 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-brand-primary" /> Data Pribadi
          </h3>
          
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-brand-primary/5 flex items-center justify-center text-brand-primary shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs text-text-secondary font-medium">Email Address</p>
              <p className="text-sm font-semibold truncate">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-brand-primary/5 flex items-center justify-center text-brand-primary shrink-0">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-text-secondary font-medium">No. Telepon</p>
              <p className="text-sm font-semibold">{user.phone || 'Belum ditambahkan'}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-4 pt-2 border-t border-border">
            <div className="w-10 h-10 rounded-full bg-brand-primary/5 flex items-center justify-center text-brand-primary shrink-0 mt-1">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-text-secondary font-medium mt-1">Alamat Pengiriman Utama</p>
              <p className="text-sm font-semibold mt-0.5 leading-snug">{user.address || 'Belum ada alamat pengiriman tersimpan.'}</p>
            </div>
          </div>
        </div>

        {/* Store Info Details (If Seller) */}
        {user.role === 'penjual' && sellerData && (
          <div className="bg-surface rounded-2xl p-5 shadow-sm border border-border space-y-4">
            <h3 className="font-bold text-text-primary border-b border-border pb-3 mb-4 flex items-center gap-2">
              <Store className="w-5 h-5 text-status-warning" /> Informasi Toko
            </h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-xs text-text-secondary font-medium mb-1">Nama Toko</p>
                <p className="text-sm font-bold bg-base px-3 py-2 rounded-lg border border-border">{sellerData.storeName}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary font-medium mb-1">Alamat Operasional</p>
                <p className="text-sm font-semibold bg-base px-3 py-2 rounded-lg border border-border">{sellerData.address || '-'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Links Menu */}
        <div className="bg-surface rounded-2xl overflow-hidden shadow-sm border border-border">
          {user.role === 'pembeli' && (
            <Link href="/buyer/orders" className="flex items-center gap-4 p-4 hover:bg-base transition-colors border-b border-border">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                <Package className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold">Daftar Pesanan Saya</p>
                <p className="text-xs text-text-secondary">Pantau jadwal dan preorder Anda</p>
              </div>
            </Link>
          )}

          {user.role === 'penjual' && (
            <Link href="/seller" className="flex items-center gap-4 p-4 hover:bg-base transition-colors border-b border-border">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
                <Store className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold">Dashboard Toko</p>
                <p className="text-xs text-text-secondary">Kelola pesanan dan kas masuk</p>
              </div>
            </Link>
          )}
        </div>

        {/* Logout Button */}
        <button 
          onClick={handleLogout}
          className="w-full flex justify-center items-center gap-3 bg-red-500/10 hover:bg-red-500/20 text-red-600 font-bold py-3.5 rounded-2xl transition-all shadow-sm border border-red-500/20 mt-8"
        >
          <LogOut className="w-5 h-5" />
          Keluar
        </button>
        <p className="text-center text-[10px] text-text-secondary mt-4 mb-8">Pusat Bantuan & Kebijakan Privasi Pesanku © 2026</p>

      </div>
    </div>
  );
}
