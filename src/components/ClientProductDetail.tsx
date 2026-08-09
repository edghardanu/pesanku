"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, Store, MapPin, CheckCircle, ShieldCheck, LogOut } from "lucide-react";
import Swal from "sweetalert2";
import { ProductItem, AuthUser } from "@/types";
import { findProductVariant, getProductUnitPrice } from "@/lib/productVariants";

export default function ClientProductDetail({ product: initialProduct, user }: { product: ProductItem, user: AuthUser | null }) {
  const router = useRouter();
  const productId = initialProduct.id;
  const [product, setProduct] = useState(initialProduct);
  const [qty, setQty] = useState(product.minOrderQty || 1);
  const [notes, setNotes] = useState("");
  const [selectedVariant, setSelectedVariant] = useState("");
  const [hasActiveOrder, setHasActiveOrder] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    if (productId.startsWith("dummy-")) return;

    let isActive = true;

    const refreshProduct = async () => {
      try {
        const response = await fetch(`/api/products/${productId}`, {
          cache: "no-store",
        });

        if (!response.ok) return;

        const data = await response.json();
        if (isActive && data.product) {
          setProduct(data.product as ProductItem);
          setCurrentTime(Date.now());
        }
      } catch (error) {
        console.error("Gagal memperbarui detail produk:", error);
      }
    };

    void refreshProduct();

    const interval = window.setInterval(refreshProduct, 3000);
    const handleFocus = () => void refreshProduct();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void refreshProduct();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isActive = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [productId]);

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
  }, [user, product.id]);

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

  const isFull = (product.currentQty || 0) >= (product.minQty || 1);
  const minimumOrder = product.minOrderQty || 1;
  const maximumOrder = product.maxOrderQty || Number.MAX_SAFE_INTEGER;
  const selectedQty = Math.min(Math.max(qty, minimumOrder), maximumOrder);
  const deadline = product.deadlineDate ? new Date(product.deadlineDate) : null;
  const hasValidDeadline = Boolean(deadline && !Number.isNaN(deadline.getTime()));
  const isDeadlinePassed = Boolean(deadline && hasValidDeadline && deadline.getTime() < currentTime);
  const isClosedStatus = ['closed', 'processing', 'completed'].includes(product.status || '');
  const isPreorderClosed = isClosedStatus || isDeadlinePassed;
  const isOrderUnavailable = isPreorderClosed;
  const selectedVariantDetails = findProductVariant(product.variants, selectedVariant);
  const unitPrice = getProductUnitPrice(product.price, product.variants, selectedVariant);
  const hasSelectedVariantPrice = selectedVariantDetails?.price !== null && selectedVariantDetails?.price !== undefined;
  const statusLabel = isPreorderClosed
    ? 'Preorder Ditutup'
    : isFull
      ? 'Kuota Terpenuhi'
      : 'Preorder Terbuka';


  const handleCheckout = async () => {
    if (isOrderUnavailable) {
      Swal.fire(
        'Produk Tidak Tersedia',
        'Masa preorder produk ini telah ditutup.',
        'warning',
      );
      return;
    }

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

    if (product.variants?.length && !selectedVariantDetails) {
      Swal.fire('Pilih Varian', `Pilih salah satu varian ${product.name} terlebih dahulu.`, 'info');
      return;
    }

    const totalHarga = selectedQty * unitPrice;

    // STEP 1: Konfirmasi Pesanan
    const confirmResult = await Swal.fire({
      title: 'Konfirmasi Pesanan',
      html: `
        <div class="text-left space-y-3">
          <p><strong>Produk:</strong> ${product.name}</p>
          ${selectedVariant ? `<p><strong>Varian:</strong> ${selectedVariant}</p>` : ''}
          <p><strong>Jumlah:</strong> ${selectedQty} Porsi</p>
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
    router.push(`/process-order?productId=${product.id}&qty=${selectedQty}&notes=${encodeURIComponent(notes)}&variant=${encodeURIComponent(selectedVariant)}`);
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
                  isPreorderClosed
                    ? 'bg-status-error text-white'
                    : isFull
                      ? 'bg-brand-accent text-white'
                      : 'bg-brand-secondary text-slate-900'
                }`}>
                  {isFull && !isPreorderClosed ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  {statusLabel}
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
              <p className="text-h2 text-brand-primary font-bold mb-1">Rp {unitPrice.toLocaleString('id-ID')}</p>
              {hasSelectedVariantPrice && (
                <p className="mb-6 text-xs font-medium text-text-secondary">Harga varian {selectedVariantDetails.name}</p>
              )}
              {!hasSelectedVariantPrice && <div className="mb-6" />}
              
              <div className="prose prose-sm max-w-none text-text-secondary leading-relaxed">
                <h3 className="text-text-primary font-semibold mb-2">Deskripsi Makanan</h3>
                <p>{product.description || 'Tidak ada deskripsi yang ditambahkan untuk produk ini.'}</p>
              </div>

              <div className="grid grid-cols-1 gap-3 mt-6 pt-5 border-t border-border">
                <div className="bg-base border border-border rounded-lg p-3">
                  <p className="text-xs text-text-secondary mb-1">Waktu Proses</p>
                  <p className="font-semibold text-text-primary">{product.processingTime || '-'}</p>
                </div>
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
              <div className={`${product.sellerApprovalStatus === 'approved' ? 'bg-status-success/15 text-status-success' : 'bg-base text-text-secondary'} px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 border border-border`}>
                <ShieldCheck className="w-4 h-4" />
                {product.sellerApprovalStatus === 'approved' ? 'UMKM Terverifikasi' : 'Profil UMKM'}
              </div>
            </div>
          </div>

          {/* Kanan: Panel Pemesanan (Sticky) */}
          <div className="lg:col-span-4">
            <div className="card p-6 border border-border sticky top-24 shadow-xl">
              <h3 className="font-bold text-lg mb-4 border-b border-border pb-4">Atur Pesanan</h3>
              
              <div className="space-y-6">
                {product.variants && product.variants.length > 0 && (
                  <fieldset>
                    <legend className="mb-2 text-sm font-semibold text-text-primary">
                      Pilih Varian <span className="text-status-error">*</span>
                    </legend>
                    <div className="flex flex-wrap gap-2">
                      {product.variants.map((variant) => {
                        const isSelected = selectedVariant === variant.name;
                        return (
                          <button
                            key={variant.name}
                            type="button"
                            onClick={() => setSelectedVariant(variant.name)}
                            aria-pressed={isSelected}
                            className={`min-h-10 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${isSelected
                              ? 'border-brand-primary bg-brand-primary text-white shadow-sm'
                              : 'border-border bg-surface text-text-primary hover:border-brand-primary hover:text-brand-primary'
                            }`}
                          >
                            {variant.name}
                            {variant.price !== null && variant.price !== undefined && (
                              <span className={`ml-1 ${isSelected ? 'text-white/90' : 'text-brand-primary'}`}>· Rp {variant.price.toLocaleString('id-ID')}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                )}

                {/* Input Qty */}
                <div>
                  <label className="text-sm font-semibold text-text-primary block mb-2">Jumlah Porsi</label>
                  <div className="flex items-center border border-border rounded-xl overflow-hidden w-full max-w-[200px]">
                    <button 
                      onClick={() => setQty(Math.max(minimumOrder, selectedQty - 1))}
                      className="px-4 py-2 bg-base hover:bg-border/50 text-text-primary font-bold transition-colors border-r border-border disabled:cursor-not-allowed"
                    >-</button>
                    <input 
                      type="number" 
                      value={selectedQty}
                      readOnly
                      className="w-full text-center py-2 font-semibold bg-surface text-text-primary outline-none"
                    />
                    <button 
                      onClick={() => {
                        const maxQty = maximumOrder;
                        if (selectedQty < maxQty) {
                          setQty(selectedQty + 1);
                        } else {
                          Swal.fire('Batas Maksimal', `Maksimal pesanan adalah ${maxQty} porsi.`, 'warning');
                        }
                      }}
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
                    <span className="text-h2 font-bold text-brand-primary">Rp {(selectedQty * unitPrice).toLocaleString('id-ID')}</span>
                  </div>
                  
                  <button 
                    onClick={handleCheckout}
                    disabled={hasActiveOrder || isOrderUnavailable}
                    className={`w-full py-3.5 text-lg transition-all rounded-xl ${
                      isOrderUnavailable
                        ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed shadow-none'
                        : hasActiveOrder
                        ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed shadow-none'
                        : 'btn-primary shadow-lg shadow-brand-primary/20 hover:scale-[1.02]'
                    }`}
                  >
                    {isPreorderClosed
                        ? 'Preorder Sudah Ditutup'
                        : hasActiveOrder
                          ? 'Selesaikan dulu pesanan anda'
                          : 'Pesan Sekarang'}
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
