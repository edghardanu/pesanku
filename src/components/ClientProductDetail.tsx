"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, Store, MapPin, CheckCircle, ShieldCheck, LogOut, User, Calendar, Truck, UserRound, Phone, Wallet } from "lucide-react";

import Swal from "sweetalert2";
import { ProductItem, AuthUser, OrderItem } from "@/types";
import { findProductVariant, getProductUnitPrice } from "@/lib/productVariants";

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const fulfillmentStyles: Record<string, { label: string; badge: string }> = {
  scheduled: { label: 'Terjadwal', badge: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20' },
  preparing: { label: 'Disiapkan', badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20' },
  ready: { label: 'Siap Dikirim', badge: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/20' },
  shipped: { label: 'Dalam Pengiriman', badge: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20' },
  delivered: { label: 'Terkirim', badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20' },
};

export default function ClientProductDetail({ 
  product: initialProduct, 
  user,
  orders = []
}: { 
  product: ProductItem; 
  user: AuthUser | null;
  orders?: OrderItem[];
}) {
  const router = useRouter();
  const productId = initialProduct.id;
  const [product, setProduct] = useState(initialProduct);
  const [qtyInput, setQtyInput] = useState(String(product.minOrderQty || 1));
  const [notes, setNotes] = useState("");
  const [selectedVariant, setSelectedVariant] = useState("");
  const [hasActiveOrder, setHasActiveOrder] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  const isSeller = user && user.role === 'penjual' && product.sellerId === user.id;
  const storeName = product.storeName || product.sellerName || 'toko';
  const storeSlug = storeName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const storeProfilePath = `/store/${encodeURIComponent(storeSlug)}-${product.sellerId}`;

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
        // error suppressed
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
        .catch((_e) => {});
    }
  }, [user, product.id]);

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: 'Konfirmasi Keluar',
      text: `Apakah Anda ${user?.name || ''} ingin keluar dari akun Pesanku?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#800000',
      iconColor: '#800000',
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
  const minimumOrder = 1;
  const maximumOrder = product.maxOrderQty || Number.MAX_SAFE_INTEGER;
  const parsedQty = Number(qtyInput);
  const selectedQty = Number.isSafeInteger(parsedQty) && parsedQty >= minimumOrder
    ? Math.min(parsedQty, maximumOrder)
    : minimumOrder;
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
      const result = await Swal.fire({
        title: 'Akses Ditolak',
        html: `
          <p class="mb-2">Hanya akun pembeli yang dapat melakukan pemesanan.</p>
          <p class="text-sm text-text-secondary">Anda saat ini masuk sebagai <strong>${user.role}</strong>. Yuk, buat akun pembeli sekarang juga untuk menikmati berbagai jajanan luar biasa dari UMKM lokal!</p>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Daftar Akun Pembeli',
        cancelButtonText: 'Batal',
        confirmButtonColor: '#ff5c35'
      });
      if (result.isConfirmed) {
        // Logout user first then redirect to register
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/register');
      }
      return;
    }

    // Varian sekarang opsional

    const totalHarga = selectedQty * unitPrice;

    // STEP 1: Konfirmasi Pesanan
    const defaultAddress = user?.address || '';

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
          <div class="mt-4">
            <label class="block text-sm font-semibold mb-1">Pilih Tanggal Pesanan <span class="text-red-500">*</span></label>
            <input type="date" id="order-date" lang="id" class="w-full border p-2 rounded text-sm mb-3 focus:outline-none focus:border-[#ff5c35]" required>
            <label class="block text-sm font-semibold mb-1">Alamat Pembeli <span class="text-xs font-normal text-gray-400 ml-1">(Opsional)</span></label>
            <textarea id="order-address" class="w-full border p-2 rounded text-sm focus:outline-none focus:border-[#ff5c35]" rows="3">${escapeHtml(defaultAddress)}</textarea>
          </div>
          <p class="text-sm text-text-secondary mt-3">Apakah Anda yakin ingin melanjutkan pesanan ini?</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, Lanjut Bayar',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#10b981',
      preConfirm: () => {
        const dateInput = document.getElementById('order-date') as HTMLInputElement;
        const addressInput = document.getElementById('order-address') as HTMLTextAreaElement;
        
        const dateVal = dateInput?.value;
        const addressVal = addressInput?.value?.trim() || '';
        
        if (!dateVal) {
          Swal.showValidationMessage('Silakan pilih tanggal pesanan');
          return false;
        }
        
        return { orderDate: dateVal, shippingAddress: addressVal };
      }
    });

    if (!confirmResult.isConfirmed) return;

    Swal.close();
    router.push(`/process-order?productId=${product.id}&qty=${selectedQty}&notes=${encodeURIComponent(notes)}&variant=${encodeURIComponent(selectedVariant)}&deliveryDate=${encodeURIComponent(confirmResult.value.orderDate)}&deliveryAddress=${encodeURIComponent(confirmResult.value.shippingAddress)}`);
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
            <div className="flex items-center gap-2">
              <Link
                href="/profile"
                className="btn-outline border-transparent text-text-secondary hover:text-brand-primary hover:bg-brand-primary/5 flex items-center justify-center p-2 rounded-xl transition-all"
                title="Profil Akun"
              >
                <User className="w-5 h-5" />
              </Link>
              <button 
                onClick={handleLogout}
                className="btn-outline border-status-error/40 text-status-error hover:bg-status-error/10 hover:border-status-error flex items-center gap-1.5 py-1.5 px-3 text-sm font-semibold rounded-xl transition-all"
                title="Keluar / Logout"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
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

            <Link
              href={storeProfilePath}
              aria-label={`Lihat profil lengkap toko ${storeName}`}
              className="card group/store flex flex-col items-start justify-between gap-4 border border-border p-6 transition-all hover:border-brand-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50 sm:flex-row sm:items-center"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary overflow-hidden border border-border transition-colors group-hover/store:border-brand-primary/40">
                  {product.sellerLogoUrl || product.sellerAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.sellerLogoUrl || product.sellerAvatar || undefined} alt={product.storeName || product.sellerName || 'Toko'} className="w-full h-full object-cover" />
                  ) : (
                    <Store className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-text-primary text-lg transition-colors group-hover/store:text-brand-primary">{product.storeName || product.sellerName}</h3>
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
            </Link>
          </div>

          {/* Kanan: Panel Pemesanan / Jadwal Pesanan (Sticky) */}
          <div className="lg:col-span-4">
            {isSeller ? (
              <div className="card p-6 border border-border sticky top-24 shadow-xl bg-surface dark:bg-zinc-900">
                <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
                  <h3 className="font-bold text-lg text-text-primary flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-brand-primary" />
                    Jadwal Pesanan
                  </h3>
                  <span className="bg-brand-primary/10 text-brand-primary px-2.5 py-1 rounded-full text-xs font-bold">
                    {orders.length} Pesanan
                  </span>
                </div>

                {orders.length === 0 ? (
                  <div className="text-center py-12">
                    <Truck className="mx-auto mb-3 h-10 w-10 text-text-secondary/30" />
                    <p className="text-sm font-semibold text-text-primary">Belum Ada Pesanan</p>
                    <p className="mt-1 text-xs text-text-secondary">Produk ini belum memiliki pesanan dari pembeli.</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                    {/* Urutkan pesanan: yang terjadwal dulu, lalu belum terjadwal */}
                    {(() => {
                      const scheduled = orders.filter(o => o.deliveryDate).sort((a, b) => new Date(a.deliveryDate!).getTime() - new Date(b.deliveryDate!).getTime());
                      const unscheduled = orders.filter(o => !o.deliveryDate);
                      const allSorted = [...scheduled, ...unscheduled];

                      return allSorted.map((order) => {
                        const isScheduled = !!order.deliveryDate;
                        const statusKey = order.fulfillmentStatus || 'scheduled';
                        const statusStyle = fulfillmentStyles[statusKey] || { label: 'Terjadwal', badge: 'bg-blue-500/10 text-blue-700' };

                        return (
                          <div key={order.id} className="p-4 rounded-xl border border-border bg-base/50 dark:bg-zinc-800/30 hover:border-brand-primary/30 transition-all flex flex-col gap-2 shadow-sm group text-left">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <span className="font-mono text-xs font-semibold text-text-secondary block truncate">
                                  {order.id}
                                </span>
                                {order.selectedVariant && (
                                  <span className="inline-block mt-1 text-[10px] font-bold bg-brand-primary/15 text-brand-primary px-2 py-0.5 rounded-full">
                                    Varian: {order.selectedVariant}
                                  </span>
                                )}
                              </div>
                              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${isScheduled ? statusStyle.badge : 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/20'}`}>
                                {isScheduled ? statusStyle.label : 'Belum Dijadwalkan'}
                              </span>
                            </div>

                            <div className="text-sm font-semibold text-text-primary mt-1">
                              {order.qty} porsi · <span className="text-status-success font-bold">Rp {order.totalPrice.toLocaleString('id-ID')}</span>
                            </div>

                            <div className="text-xs text-text-secondary space-y-1 mt-1 pt-2 border-t border-border/50">
                              <div className="flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-text-secondary" />
                                <span className="font-medium text-text-primary truncate">{order.buyerName}</span>
                              </div>
                              {order.buyerPhone && (
                                <div className="flex items-center gap-1.5">
                                  <Phone className="w-3.5 h-3.5 text-text-secondary" />
                                  <span>{order.buyerPhone}</span>
                                </div>
                              )}
                              <div className="flex items-start gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-text-secondary mt-0.5 shrink-0" />
                                <span className="line-clamp-1 text-left" title={order.buyerAddress || undefined}>{order.buyerAddress}</span>
                              </div>
                              {order.notes && (
                                <div className="bg-brand-primary/5 p-2 rounded-lg text-[11px] text-brand-primary italic mt-1.5 border border-brand-primary/10 text-left">
                                  Catatan: "{order.notes}"
                                </div>
                              )}
                            </div>

                            <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between text-[11px] font-semibold text-text-secondary">
                              <span>Tanggal Kirim:</span>
                              <span className={isScheduled ? 'text-brand-primary font-bold' : 'text-amber-500 italic'}>
                                {isScheduled 
                                  ? new Date(order.deliveryDate!).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
                                  : 'Belum ditentukan'
                                }
                              </span>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
                {orders.length > 0 && (
                  <Link 
                    href="/seller?tab=produk" 
                    className="mt-4 w-full py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold rounded-xl transition-all text-center flex items-center justify-center gap-1.5 shadow-md shadow-brand-primary/10 active:scale-95 hover:scale-[1.02]"
                  >
                    Kelola Semua Jadwal
                  </Link>
                )}
              </div>
            ) : (
              <div className="card p-6 border border-border sticky top-24 shadow-xl">
                <h3 className="font-bold text-lg mb-4 border-b border-border pb-4">Atur Pesanan</h3>
                
                <div className="space-y-6">
                  {product.variants && product.variants.length > 0 && (
                    <fieldset>
                      <legend className="mb-2 text-sm font-semibold text-text-primary">
                        Pilih Tambah Varian <span className="text-xs font-normal text-gray-400 ml-1">(Opsional)</span>
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
                        type="button"
                        onClick={() => setQtyInput(String(Math.max(minimumOrder, selectedQty - 1)))}
                        className="px-4 py-2 bg-base hover:bg-border/50 text-text-primary font-bold transition-colors border-r border-border disabled:cursor-not-allowed"
                      >-</button>
                      <input 
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="off"
                        value={qtyInput}
                        onChange={(event) => {
                          const digitsOnly = event.target.value.replace(/\D/g, '');
                          setQtyInput(digitsOnly);
                        }}
                        onBlur={() => setQtyInput(String(selectedQty))}
                        className="w-full text-center py-2 font-semibold bg-surface text-text-primary outline-none"
                        aria-label="Jumlah porsi"
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          const maxQty = maximumOrder;
                          if (selectedQty < maxQty) {
                            setQtyInput(String(selectedQty + 1));
                          } else {
                            Swal.fire('Batas Maksimal', `Maksimal pesanan adalah ${maxQty} porsi.`, 'warning');
                          }
                        }}
                        className="px-4 py-2 bg-base hover:bg-border/50 text-text-primary font-bold transition-colors border-l border-border disabled:cursor-not-allowed"
                      >+</button>
                    </div>
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
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
