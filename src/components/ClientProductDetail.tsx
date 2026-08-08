"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, Store, MapPin, CheckCircle, ShieldCheck, LogOut } from "lucide-react";
import Swal from "sweetalert2";
import { ProductItem, AuthUser } from "@/types";

export default function ClientProductDetail({ product, user }: { product: ProductItem, user: AuthUser | null }) {
  const router = useRouter();
  const [qty, setQty] = useState(product.minOrderQty || 1);
  const [notes, setNotes] = useState("");
  const [hasActiveOrder, setHasActiveOrder] = useState(false);
  const [qrisUrl, setQrisUrl] = useState('https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=DummyQRIS');

  useEffect(() => {
    if (user && user.role === 'pembeli') {
      fetch(`/api/orders?productId=${product.id}`)
        .then(res => res.json())
        .then(data => {
          if (typeof data.hasActiveOrder === 'boolean') {
            setHasActiveOrder(data.hasActiveOrder);
          }
        })
        .catch(console.error);
    }
  }, [user]);

  // Load the active QRIS from localStorage to simulate Admin's setting
  useEffect(() => {
    setTimeout(() => {
      const savedQris = localStorage.getItem('adminQrisUrl');
      if (savedQris) {
        setQrisUrl(savedQris);
      }
    }, 0);
  }, []);

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: 'Konfirmasi Keluar',
      text: `Apakah Anda ${user?.name || ''} ingin keluar dari akun Pesanku?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ff5c35',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Ya, Keluar',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/login';
      } catch (e) {
        window.location.href = '/';
      }
    }
  };

  const currentTotal = (product.currentQty || 0) + qty;
  const progressPercentage = Math.min((currentTotal / (product.minQty || 1)) * 100, 100);
  const isFull = currentTotal >= (product.minQty || 1);
  const availableStock = Math.max(0, (product.stock || 0) - (product.currentQty || 0));
  const isOutOfStock = availableStock <= 0;
  


  const handleCheckout = async () => {
    if (!user) {
      Swal.fire({
        title: 'Anda Belum Login',
        text: 'Silakan login terlebih dahulu untuk melakukan pemesanan.',
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Ke Halaman Login',
        cancelButtonText: 'Batal',
        confirmButtonColor: '#ff5c35'
      }).then((result) => {
        if (result.isConfirmed) {
          router.push('/login');
        }
      });
      return;
    }

    if (user.role === 'penjual' || user.role === 'admin') {
      Swal.fire('Akses Ditolak', 'Hanya akun pembeli yang dapat melakukan pemesanan.', 'warning');
      return;
    }

    const totalHarga = qty * product.price;

    // STEP 1: Konfirmasi Pesanan
    const confirmResult = await Swal.fire({
      title: 'Konfirmasi Pesanan',
      html: `
        <div class="text-left space-y-3">
          <p><strong>Produk:</strong> ${product.name}</p>
          <p><strong>Jumlah:</strong> ${qty} Porsi</p>
          <p><strong>Total Bayar:</strong> <span class="text-brand-primary font-bold text-lg">Rp ${totalHarga.toLocaleString('id-ID')}</span></p>
          ${notes ? `<p><strong>Catatan:</strong> ${notes}</p>` : ''}
          <hr class="my-2 border-gray-200" />
          <p class="text-sm text-text-secondary">Apakah Anda yakin ingin melanjutkan pesanan ini?</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, Lanjut Bayar',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#10b981'
    });

    if (!confirmResult.isConfirmed) return;

    Swal.close();
    router.push(`/process-order?productId=${product.id}&qty=${qty}&notes=${encodeURIComponent(notes)}`);
  };

  return (
    <div className="min-h-screen bg-base pb-24">
      {/* Navbar Simple */}
      <header className="bg-surface/80 backdrop-blur-md border-b border-border sticky top-0 z-50 transition-all">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-gray-100 rounded-full transition-colors" title="Kembali ke Beranda">
              <ArrowLeft className="w-5 h-5 text-text-primary" />
            </Link>
            <span className="font-semibold text-lg text-text-primary">Detail Produk</span>
          </div>
          {user && (
            <button 
              onClick={handleLogout}
              className="btn-outline border-status-error/40 text-status-error hover:bg-status-error/10 hover:border-status-error flex items-center gap-1.5 py-1.5 px-3 text-sm font-semibold rounded-xl transition-all"
              title="Keluar / Logout"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar</span>
            </button>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 pt-6 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Kiri: Foto Produk & Deskripsi */}
          <div className="lg:col-span-8 space-y-6">
            <div className="relative aspect-video lg:aspect-[4/3] w-full rounded-2xl overflow-hidden shadow-sm bg-surface dark:bg-border">
              <Image 
                src={product.imageUrl || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop'} 
                alt={product.name}
                fill
                sizes="(max-width: 1024px) 100vw, 66vw"
                className="object-contain bg-base dark:bg-border"
                priority
              />
              <div className="absolute top-4 left-4">
                <span className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 shadow-md ${
                  isFull 
                    ? 'bg-brand-accent text-white' 
                    : 'bg-brand-secondary text-slate-900'
                }`}>
                  {isFull ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  {isFull ? "Kuota Terpenuhi" : "Preorder Terbuka"}
                </span>
              </div>
            </div>

            <div className="card p-6 border border-border">
              <h1 className="text-display-2 text-text-primary mb-2">{product.name}</h1>
              {product.batchCategory && (
                <div className="mb-4">
                  <span className="bg-brand-secondary/20 text-brand-secondary-dark dark:text-brand-secondary px-3 py-1 rounded-md text-sm font-bold border border-brand-secondary/30">
                    {product.batchCategory}
                  </span>
                </div>
              )}
              <p className="text-h2 text-brand-primary font-bold mb-6">Rp {product.price.toLocaleString('id-ID')}</p>
              
              <div className="prose prose-sm max-w-none text-text-secondary leading-relaxed">
                <h3 className="text-text-primary font-semibold mb-2">Deskripsi Makanan</h3>
                <p>{product.description || 'Tidak ada deskripsi yang ditambahkan untuk produk ini.'}</p>
              </div>
            </div>

            <div className="card p-6 border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary overflow-hidden border border-border">
                  {product.sellerLogoUrl || product.sellerAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.sellerLogoUrl || product.sellerAvatar || undefined} alt={product.storeName || product.sellerName || 'Toko'} className="w-full h-full object-cover" />
                  ) : (
                    <Store className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-text-primary text-lg">{product.storeName || product.sellerName}</h3>
                  <div className="flex items-center gap-1 text-text-secondary text-sm">
                    <MapPin className="w-3 h-3" />
                    <span>{product.storeAddress || 'Alamat tidak diketahui'}</span>
                  </div>
                </div>
              </div>
              <div className="bg-status-success/15 text-status-success px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" /> UMKM Terverifikasi
              </div>
            </div>
          </div>

          {/* Kanan: Panel Pemesanan (Sticky) */}
          <div className="lg:col-span-4">
            <div className="card p-6 border border-border sticky top-24 shadow-xl">
              <h3 className="font-bold text-lg mb-4 border-b border-border pb-4">Atur Pesanan</h3>
              
              <div className="space-y-6">
                {/* Kuota Produk */}
                <div className={`p-4 rounded-xl border ${isOutOfStock ? 'bg-status-error/5 border-status-error/30' : 'bg-base border-border'}`}>
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-text-secondary">Kuota Produk Tersedia</span>
                    <span className={`font-bold ${isOutOfStock ? 'text-status-error' : 'text-text-primary'}`}>
                      {availableStock} Porsi
                    </span>
                  </div>
                  {isOutOfStock && (
                    <p className="text-xs text-status-error mt-2 font-medium flex items-center gap-1">
                      <span>⚠</span> Stok produk ini telah habis
                    </p>
                  )}
                </div>

                {/* Input Qty */}
                <div>
                  <label className="text-sm font-semibold text-text-primary block mb-2">Jumlah Porsi</label>
                  <div className={`flex items-center border rounded-xl overflow-hidden w-full max-w-[200px] ${isOutOfStock ? 'border-border opacity-50 pointer-events-none' : 'border-border'}`}>
                    <button 
                      onClick={() => setQty(Math.max(product.minOrderQty || 1, qty - 1))}
                      disabled={isOutOfStock}
                      className="px-4 py-2 bg-base hover:bg-border/50 text-text-primary font-bold transition-colors border-r border-border disabled:cursor-not-allowed"
                    >-</button>
                    <input 
                      type="number" 
                      value={qty} 
                      readOnly
                      className="w-full text-center py-2 font-semibold bg-surface text-text-primary outline-none"
                    />
                    <button 
                      onClick={() => {
                        const maxQty = Math.min(product.maxOrderQty || 999, availableStock);
                        if (qty < maxQty) {
                          setQty(qty + 1);
                        } else {
                          Swal.fire('Batas Maksimal', `Maksimal pesanan adalah ${maxQty} porsi (sesuai stok tersedia).`, 'warning');
                        }
                      }}
                      disabled={isOutOfStock}
                      className="px-4 py-2 bg-base hover:bg-border/50 text-text-primary font-bold transition-colors border-l border-border disabled:cursor-not-allowed"
                    >+</button>
                  </div>
                  <p className="text-xs text-text-secondary mt-2 font-medium">Minimal: {product.minOrderQty || 1} Porsi {product.maxOrderQty ? `| Maksimal: ${product.maxOrderQty} Porsi` : ''}</p>
                </div>

                {/* Catatan Tambahan */}
                <div>
                  <label className="text-sm font-semibold text-text-primary block mb-2">Catatan Tambahan <span className="text-text-secondary font-normal">(Opsional)</span></label>
                  <textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Contoh: Jangan terlalu pedas ya kak..."
                    className="w-full text-sm bg-base border border-border rounded-xl px-4 py-3 outline-none focus:border-brand-primary placeholder:text-text-secondary/50 min-h-[80px] resize-y"
                  />
                </div>

                {/* Ringkasan */}
                <div className="border-t border-border pt-4">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-text-secondary font-medium">Total Harga</span>
                    <span className="text-h2 font-bold text-brand-primary">Rp {(qty * product.price).toLocaleString('id-ID')}</span>
                  </div>
                  
                  <button 
                    onClick={handleCheckout}
                    disabled={hasActiveOrder || isOutOfStock}
                    className={`w-full py-3.5 text-lg transition-all rounded-xl ${
                      isOutOfStock
                        ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed shadow-none'
                        : hasActiveOrder
                        ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed shadow-none'
                        : 'btn-primary shadow-lg shadow-brand-primary/20 hover:scale-[1.02]'
                    }`}
                  >
                    {isOutOfStock ? '⚠ Stok Tidak Tersedia / Habis' : hasActiveOrder ? 'Selesaikan dulu pesanan anda' : 'Pesan Sekarang'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
