"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Clock, CheckCircle, XCircle, FileImage, CreditCard } from "lucide-react";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";

export default function ClientBuyerOrders({ orders }: { orders: any[] }) {
  const router = useRouter();
  const [qrisUrl, setQrisUrl] = useState('https://images.unsplash.com/photo-1607523179298-2eb75b0577fc?w=400&h=400&fit=crop');

  // Load the active QRIS from localStorage
  useEffect(() => {
    const savedQris = localStorage.getItem('adminQrisUrl');
    if (savedQris) {
      setQrisUrl(savedQris);
    }
  }, []);

  const handlePayment = async (orderId: string, totalHarga: number) => {
    const { value: file } = await Swal.fire({
      title: 'Pembayaran (QRIS)',
      html: `
        <div class="flex flex-col items-center">
          <p class="text-sm mb-4">Silakan scan kode QRIS berikut untuk membayar sejumlah <strong>Rp ${totalHarga.toLocaleString('id-ID')}</strong></p>
          <div class="w-48 h-48 border border-gray-200 rounded-xl overflow-hidden mb-4 shadow-sm">
            <img src="${qrisUrl}" alt="QRIS Admin" class="w-full h-full object-cover" />
          </div>
        </div>
      `,
      input: 'file',
      inputAttributes: {
        'accept': 'image/*',
        'aria-label': 'Upload Bukti Transfer'
      },
      showCancelButton: true,
      confirmButtonText: 'Kirim Bukti Pembayaran',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#ff5c35',
      preConfirm: (file) => {
        if (!file) {
          Swal.showValidationMessage('Bukti pembayaran wajib dilampirkan!');
          return false;
        }
        return file;
      }
    });

    if (file) {
      Swal.fire({
        title: 'Mengunggah Bukti...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const reader = new FileReader();
      reader.onload = async (e) => {
        const proofUrl = e.target?.result as string;
        try {
          const res = await fetch('/api/checkout/payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: orderId,
              proofUrl: proofUrl
            })
          });

          const data = await res.json();
          
          if (!res.ok) {
            throw new Error(data.error || 'Terjadi kesalahan saat mengunggah bukti.');
          }

          Swal.fire({
            icon: 'success',
            title: 'Berhasil!',
            text: 'Bukti pembayaran Anda telah dikirim dan sedang menunggu verifikasi.',
            confirmButtonColor: '#10b981',
          }).then(() => {
            router.refresh();
          });
          
        } catch (error: any) {
          Swal.fire('Gagal!', error.message, 'error');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-base pb-24">
      <header className="bg-surface border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-text-primary" />
          </Link>
          <span className="font-semibold text-lg text-text-primary">Daftar Pesanan Saya</span>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-6 max-w-4xl">
        {orders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-border mt-8">
            <FileImage className="w-16 h-16 text-text-secondary/50 mx-auto mb-4" />
            <h3 className="text-h3 text-text-primary mb-2">Belum ada pesanan</h3>
            <p className="text-text-secondary mb-6">Anda belum pernah melakukan pemesanan produk apapun.</p>
            <Link href="/#katalog" className="btn-primary py-2 px-6">
              Mulai Belanja
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const isWaitingPayment = !order.paymentId;
              const isPendingVerif = order.paymentId && order.paymentStatus === 'pending';
              const isVerified = order.paymentId && order.paymentStatus === 'approved';
              
              return (
                <div key={order.orderId} className="card p-0 border border-border overflow-hidden bg-white">
                  <div className="p-4 border-b border-border bg-gray-50 flex justify-between items-center">
                    <span className="text-xs font-mono text-text-secondary">{order.orderId}</span>
                    <span className="text-xs text-text-secondary">
                      {new Date(order.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                    <div className="flex gap-4 items-center">
                      <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden relative shrink-0">
                        {order.productImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={order.productImageUrl} alt={order.productName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-200">
                            <FileImage className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-text-primary mb-1">{order.productName}</h3>
                        <p className="text-sm text-text-secondary mb-1">Toko: {order.storeName || 'Toko UMKM'}</p>
                        <p className="text-sm font-medium">Jumlah: {order.qty} porsi</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end w-full sm:w-auto gap-3">
                      <p className="font-bold text-lg text-brand-primary">Rp {order.totalPrice.toLocaleString('id-ID')}</p>
                      
                      {isWaitingPayment && (
                        <div className="w-full text-right">
                          <span className="inline-block px-3 py-1 bg-status-error/10 text-status-error rounded-full text-xs font-bold mb-3 w-full sm:w-auto text-center">Menunggu Pembayaran</span>
                          <button 
                            onClick={() => handlePayment(order.orderId, order.totalPrice)}
                            className="btn-primary py-2 px-6 w-full text-sm flex items-center justify-center gap-2"
                          >
                            <CreditCard className="w-4 h-4" /> Bayar Sekarang
                          </button>
                        </div>
                      )}

                      {isPendingVerif && (
                        <span className="px-3 py-1 bg-status-warning/10 text-status-warning rounded-full text-xs font-bold flex items-center gap-1 w-full sm:w-auto justify-center">
                          <Clock className="w-3.5 h-3.5" /> Menunggu Verifikasi
                        </span>
                      )}

                      {isVerified && (
                        <span className="px-3 py-1 bg-status-success/10 text-status-success rounded-full text-xs font-bold flex items-center gap-1 w-full sm:w-auto justify-center">
                          <CheckCircle className="w-3.5 h-3.5" /> Pembayaran Terverifikasi
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
