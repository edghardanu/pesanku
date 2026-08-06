"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, Store, MapPin, CheckCircle, ShieldCheck } from "lucide-react";
import Swal from "sweetalert2";

export default function ClientProductDetail({ product, user }: { product: any, user: any }) {
  const router = useRouter();
  const [qty, setQty] = useState(product.minQty || 1);
  const [qrisUrl, setQrisUrl] = useState('https://images.unsplash.com/photo-1607523179298-2eb75b0577fc?w=400&h=400&fit=crop');

  // Load the active QRIS from localStorage to simulate Admin's setting
  useEffect(() => {
    const savedQris = localStorage.getItem('adminQrisUrl');
    if (savedQris) {
      setQrisUrl(savedQris);
    }
  }, []);

  const progressPercentage = Math.min(((product.currentQty || 0) / product.minQty) * 100, 100);
  const isFull = (product.currentQty || 0) >= product.minQty;
  
  let deadlineText = "Tidak ada batas waktu";
  if (product.deadlineDate) {
    deadlineText = new Date(product.deadlineDate).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

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

    Swal.fire({
      title: 'Memproses Pesanan...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          qty: qty,
          totalPrice: totalHarga
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Terjadi kesalahan saat memproses pesanan.');
      }

      Swal.fire({
        icon: 'success',
        title: 'Pesanan Berhasil Dibuat!',
        text: 'Silakan lanjutkan ke halaman pesanan Anda untuk melakukan pembayaran.',
        confirmButtonColor: '#10b981',
        confirmButtonText: 'Lihat Pesanan Saya'
      }).then(() => {
        router.push('/buyer/orders');
      });
      
    } catch (error: any) {
      Swal.fire('Gagal!', error.message, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-base pb-24">
      {/* Navbar Simple */}
      <header className="bg-surface border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-text-primary" />
          </Link>
          <span className="font-semibold text-lg text-text-primary">Detail Produk</span>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-6 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Kiri: Foto Produk & Deskripsi */}
          <div className="lg:col-span-8 space-y-6">
            <div className="relative aspect-video lg:aspect-[4/3] w-full rounded-2xl overflow-hidden shadow-sm bg-gray-100">
              <Image 
                src={product.imageUrl || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop'} 
                alt={product.name}
                fill
                sizes="(max-width: 1024px) 100vw, 66vw"
                className="object-cover"
                priority
              />
              <div className="absolute top-4 left-4">
                <span className={`px-4 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2 shadow-md ${
                  isFull 
                    ? 'bg-brand-accent text-white' 
                    : 'bg-brand-secondary text-brand-secondary-dark'
                }`}>
                  {isFull ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  {isFull ? "Kuota Terpenuhi" : "Preorder Terbuka"}
                </span>
              </div>
            </div>

            <div className="card p-6 border border-border">
              <h1 className="text-display-2 text-text-primary mb-2">{product.name}</h1>
              <p className="text-h2 text-brand-primary font-bold mb-6">Rp {product.price.toLocaleString('id-ID')}</p>
              
              <div className="prose prose-sm max-w-none text-text-secondary leading-relaxed">
                <h3 className="text-text-primary font-semibold mb-2">Deskripsi Makanan</h3>
                <p>{product.description || 'Tidak ada deskripsi yang ditambahkan untuk produk ini.'}</p>
              </div>
            </div>

            <div className="card p-6 border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                  <Store className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-text-primary text-lg">{product.storeName || product.sellerName}</h3>
                  <div className="flex items-center gap-1 text-text-secondary text-sm">
                    <MapPin className="w-3 h-3" />
                    <span>{product.storeAddress || 'Alamat tidak diketahui'}</span>
                  </div>
                </div>
              </div>
              <div className="bg-green-50 text-green-700 px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" /> UMKM Terverifikasi
              </div>
            </div>
          </div>

          {/* Kanan: Panel Pemesanan (Sticky) */}
          <div className="lg:col-span-4">
            <div className="card p-6 border border-border sticky top-24 shadow-xl shadow-gray-100/50">
              <h3 className="font-bold text-lg mb-4 border-b border-border pb-4">Atur Pesanan</h3>
              
              <div className="space-y-6">
                {/* Progress Preorder */}
                <div className="bg-gray-50 p-4 rounded-xl border border-border">
                  <div className="flex justify-between text-sm mb-2 font-medium">
                    <span className="text-text-secondary">Progress Terkumpul</span>
                    <span className={isFull ? 'text-brand-accent font-bold' : 'text-brand-secondary-dark font-bold'}>
                      {product.currentQty || 0} / {product.minQty} Porsi
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden mb-3">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${isFull ? 'bg-brand-accent' : 'bg-brand-secondary'}`}
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Batas Akhir: <strong className="text-text-primary">{deadlineText}</strong></span>
                  </div>
                </div>

                {/* Input Qty */}
                <div>
                  <label className="text-sm font-semibold text-text-primary block mb-2">Jumlah Porsi</label>
                  <div className="flex items-center border border-border rounded-xl overflow-hidden w-full max-w-[200px]">
                    <button 
                      onClick={() => setQty(Math.max(product.minQty || 1, qty - 1))}
                      className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-text-primary font-bold transition-colors border-r border-border"
                    >-</button>
                    <input 
                      type="number" 
                      value={qty} 
                      readOnly
                      className="w-full text-center py-2 font-semibold bg-white outline-none"
                    />
                    <button 
                      onClick={() => setQty(qty + 1)}
                      className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-text-primary font-bold transition-colors border-l border-border"
                    >+</button>
                  </div>
                  <p className="text-xs text-text-secondary mt-2 font-medium">Minimal pemesanan: {product.minQty || 1} Porsi</p>
                </div>

                {/* Ringkasan */}
                <div className="border-t border-border pt-4">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-text-secondary font-medium">Total Harga</span>
                    <span className="text-h2 font-bold text-brand-primary">Rp {(qty * product.price).toLocaleString('id-ID')}</span>
                  </div>
                  
                  <button 
                    onClick={handleCheckout}
                    className="w-full btn-primary py-3.5 text-lg shadow-lg shadow-brand-primary/20 hover:scale-[1.02] transition-all"
                  >
                    Pesan Sekarang
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
