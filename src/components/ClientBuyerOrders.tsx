"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Clock, CheckCircle, XCircle, FileImage, CreditCard, LogOut, MessageCircle } from "lucide-react";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";

export default function ClientBuyerOrders({ orders, user }: { orders: any[], user?: any }) {
  const router = useRouter();
  const [qrisUrl, setQrisUrl] = useState('https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=DummyQRIS');

  // Load the active QRIS from localStorage
  useEffect(() => {
    const savedQris = localStorage.getItem('adminQrisUrl');
    if (savedQris) {
      setQrisUrl(savedQris);
    }
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
      } catch (error) {
        console.error('Logout failed:', error);
      }
    }
  };

  const handleCancelOrder = async (orderId: string, productName: string) => {
    const result = await Swal.fire({
      title: 'Batalkan Pesanan?',
      text: `Apakah Anda yakin ingin membatalkan pesanan ${orderId} (${productName})?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Ya, Batalkan',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch('/api/orders/cancel', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId }),
        });

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || 'Gagal membatalkan pesanan');
        }

        await Swal.fire({
          title: 'Pesanan Dibatalkan',
          text: 'Pesanan Anda telah berhasil dibatalkan.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });

        router.refresh();
      } catch (error: any) {
        Swal.fire('Gagal!', error.message || 'Terjadi kesalahan.', 'error');
      }
    }
  };

  const handleCompleteOrder = async (orderId: string, productName: string) => {
    const result = await Swal.fire({
      title: 'Selesaikan Pesanan?',
      text: `Apakah Anda yakin ingin menandai pesanan ${orderId} (${productName}) sebagai selesai?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Ya, Selesai',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch('/api/orders/update-status', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, status: 'completed' }),
        });

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || 'Gagal menyelesaikan pesanan');
        }

        await Swal.fire({
          title: 'Pesanan Selesai',
          text: 'Terima kasih! Pesanan Anda telah ditandai sebagai selesai.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });

        router.refresh();
      } catch (error: any) {
        Swal.fire('Gagal!', error.message || 'Terjadi kesalahan.', 'error');
      }
    }
  };

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

  const handleOpenChat = (orderId: string, storeName: string, productName: string) => {
    const chatKey = `chat_${orderId}`;
    let chatHistory = JSON.parse(localStorage.getItem(chatKey) || '[]');
    
    let updated = false;
    chatHistory = chatHistory.map((c: any) => {
      if (c.sender === 'seller' && !c.isRead) {
        updated = true;
        return { ...c, isRead: true };
      }
      return c;
    });
    if (updated) {
      localStorage.setItem(chatKey, JSON.stringify(chatHistory));
    }

    if (chatHistory.length === 0) {
      chatHistory = [
        { sender: 'seller', text: `Halo! Ada yang bisa kami bantu terkait pesanan <b>${productName}</b>?`, time: '10:05 WIB', isRead: true }
      ];
      localStorage.setItem(chatKey, JSON.stringify(chatHistory));
    }

    const renderMsgs = () => chatHistory.map((c: any) => {
      const isMe = c.sender === 'buyer';
      if (isMe) {
        const tickClass = c.isRead ? "text-blue-200" : "text-black/60";
        const tickStyle = c.isRead ? "color: #60a5fa;" : "";
        return `
          <div class="flex justify-end mt-3">
            <div class="bg-brand-primary text-white rounded-xl rounded-tr-none px-4 py-2 max-w-[80%] text-sm text-left shadow-sm">
              ${c.text}
              <div class="flex items-center justify-end gap-1 mt-1">
                <span class="text-[10px] text-white/80">${c.time}</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${tickClass}" style="${tickStyle}"><path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/></svg>
              </div>
            </div>
          </div>
        `;
      } else {
        return `
          <div class="flex justify-start mt-3">
            <div class="bg-surface border border-border rounded-xl rounded-tl-none px-4 py-2 max-w-[80%] text-sm text-text-primary text-left">
              ${c.text}
              <div class="text-[10px] text-text-secondary mt-1">${c.time}</div>
            </div>
          </div>
        `;
      }
    }).join('');

    Swal.fire({
      title: `Chat: ${storeName}`,
      html: `
        <div class="flex flex-col h-[300px] bg-base border border-border rounded-xl p-4 overflow-y-auto mb-4" id="chat-box">
          <div class="text-xs text-text-secondary text-center mb-4">Hari ini</div>
          <div id="chat-messages" class="flex flex-col gap-3">
            ${renderMsgs()}
          </div>
        </div>
        <div class="flex gap-2">
          <input type="text" id="chat-input" class="input-field flex-1 text-sm bg-base border-border rounded-xl px-3 outline-none focus:border-brand-primary" placeholder="Ketik pesan di sini...">
          <button id="send-chat" class="btn-primary py-2 px-4 rounded-xl flex items-center justify-center transition-transform active:scale-95">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-send"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </div>
      `,
      showConfirmButton: false,
      showCloseButton: true,
      customClass: {
        popup: 'dark:bg-slate-900 dark:text-white rounded-2xl w-[90%] max-w-md border border-border shadow-2xl',
        title: 'text-lg font-bold border-b border-border pb-3 mb-0 text-left w-full',
        htmlContainer: 'mt-4',
        closeButton: 'focus:outline-none'
      },
      didOpen: () => {
        const input = document.getElementById('chat-input') as HTMLInputElement;
        const sendBtn = document.getElementById('send-chat');
        const chatBox = document.getElementById('chat-box');
        const chatMessages = document.getElementById('chat-messages');
        
        if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
        
        const sendMessage = () => {
          if (!input.value.trim()) return;
          const msg = input.value;
          const now = new Date();
          const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} WIB`;
          const msgId = 'msg-' + Date.now();
          
          const newMsgObj = { sender: 'buyer', text: msg, time: time, isRead: false };
          const currentHistory = JSON.parse(localStorage.getItem(chatKey) || '[]');
          currentHistory.push(newMsgObj);
          localStorage.setItem(chatKey, JSON.stringify(currentHistory));
          
          chatMessages?.insertAdjacentHTML('beforeend', `
            <div class="flex justify-end mt-3">
              <div class="bg-brand-primary text-white rounded-xl rounded-tr-none px-4 py-2 max-w-[80%] text-sm text-left shadow-sm">
                ${msg}
                <div class="flex items-center justify-end gap-1 mt-1">
                  <span class="text-[10px] text-white/80">${time}</span>
                  <svg id="${msgId}-ticks" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-black/60"><path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/></svg>
                </div>
              </div>
            </div>
          `);
          
          input.value = '';
          if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
        };

        sendBtn?.addEventListener('click', sendMessage);
        input?.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') sendMessage();
        });
      }
    });
  };

  return (
    <div className="min-h-screen bg-base pb-24">
      <header className="bg-surface border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-gray-100 rounded-full transition-colors" title="Kembali ke Beranda">
              <ArrowLeft className="w-5 h-5 text-text-primary" />
            </Link>
            <span className="font-semibold text-lg text-text-primary">Daftar Pesanan Saya</span>
          </div>
          <button 
            onClick={handleLogout}
            className="btn-outline border-status-error/40 text-status-error hover:bg-status-error/10 hover:border-status-error flex items-center gap-1.5 py-1.5 px-3 text-sm font-semibold rounded-xl transition-all"
            title="Keluar / Logout"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar</span>
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-6 max-w-4xl">
        {orders.length === 0 ? (
          <div className="text-center py-20 bg-surface rounded-2xl border border-border mt-8">
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
                <div key={order.orderId} className="card p-0 border border-border overflow-hidden bg-surface">
                  <div className="p-4 border-b border-border bg-base flex justify-between items-center">
                    <span className="text-xs font-mono text-text-secondary">{order.orderId}</span>
                    <span className="text-xs text-text-secondary font-medium">
                      {new Date(order.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}, {new Date(order.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':')} WIB
                    </span>
                  </div>
                  <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                    <div className="flex gap-4 items-center">
                      <div className="w-16 h-16 rounded-xl bg-base dark:bg-border overflow-hidden relative shrink-0">
                        {order.productImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={order.productImageUrl} alt={order.productName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-base dark:bg-border">
                            <FileImage className="w-6 h-6 text-text-secondary" />
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
                      
                      {(() => {
                        const isWaitingPayment = order.status === 'waiting_verification' && !order.paymentId;
                        const isPendingVerif = order.status === 'waiting_verification' && !!order.paymentId;
                        const isVerified = order.status === 'verified';
                        const isCompleted = order.status === 'completed';
                        const isCancelled = order.status === 'cancelled';

                        return (
                          <div className="w-full flex flex-col items-end gap-2">
                            {isWaitingPayment && (
                              <span className="inline-block px-3 py-1 bg-status-error/10 text-status-error rounded-full text-xs font-bold w-full sm:w-auto text-center">Menunggu Pembayaran</span>
                            )}
                            {isPendingVerif && (
                              <span className="px-3 py-1 bg-status-warning/10 text-status-warning rounded-full text-xs font-bold flex items-center gap-1 w-full sm:w-auto justify-center">
                                <Clock className="w-3.5 h-3.5" /> Menunggu Verifikasi
                              </span>
                            )}
                            {isVerified && (
                              <span className="px-3 py-1 bg-brand-secondary/10 text-brand-secondary-dark dark:text-brand-secondary rounded-full text-xs font-bold flex items-center gap-1 w-full sm:w-auto justify-center">
                                <CheckCircle className="w-3.5 h-3.5" /> Pesanan Diproses
                              </span>
                            )}
                            {isCompleted && (
                              <span className="px-3 py-1 bg-status-success/10 text-status-success rounded-full text-xs font-bold flex items-center gap-1 w-full sm:w-auto justify-center">
                                <CheckCircle className="w-3.5 h-3.5" /> Pesanan Selesai
                              </span>
                            )}
                            {isCancelled && (
                              <span className="px-3 py-1 bg-status-error/10 text-status-error rounded-full text-xs font-bold flex items-center gap-1 w-full sm:w-auto justify-center">
                                <XCircle className="w-3.5 h-3.5" /> Dibatalkan
                              </span>
                            )}

                            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto mt-1">
                              <button 
                                onClick={() => handleOpenChat(order.orderId, order.storeName || 'Toko UMKM', order.productName)}
                                className="btn-outline border-brand-primary/40 text-brand-primary hover:bg-brand-primary/10 hover:border-brand-primary py-1.5 px-3 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 w-full sm:w-auto"
                              >
                                <MessageCircle className="w-3.5 h-3.5" /> Chat
                              </button>
                              
                              {order.deliveryProofUrl && (
                                <button 
                                  onClick={() => {
                                    Swal.fire({
                                      title: `Bukti Barang Sampai`,
                                      imageUrl: order.deliveryProofUrl,
                                      imageWidth: 400,
                                      imageAlt: 'Bukti Barang Sampai',
                                      confirmButtonText: 'Tutup',
                                      confirmButtonColor: '#ff5c35',
                                      customClass: {
                                        popup: 'dark:bg-slate-900 dark:text-white',
                                        title: 'dark:text-white'
                                      }
                                    });
                                  }}
                                  className="btn-outline border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500 py-1.5 px-3 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 w-full sm:w-auto"
                                >
                                  <FileImage className="w-3.5 h-3.5" /> Bukti Barang Sampai
                                </button>
                              )}
                              
                              {/* Selesai Pesanan button - only if verified or pending verification */}
                              {(isPendingVerif || isVerified) && (
                                <button 
                                  onClick={() => handleCompleteOrder(order.orderId, order.productName)}
                                  className="btn-primary bg-emerald-500 hover:bg-emerald-600 text-white py-1.5 px-3 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 w-full sm:w-auto"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" /> Selesai Pesanan
                                </button>
                              )}
                              
                              {/* Only show Batalkan if not yet completed or cancelled */}
                              {(isWaitingPayment || isPendingVerif || isVerified) && (
                                <button 
                                  onClick={() => handleCancelOrder(order.orderId, order.productName)}
                                  className="btn-outline border-status-error/40 text-status-error hover:bg-status-error/10 hover:border-status-error py-1.5 px-3 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 w-full sm:w-auto"
                                >
                                  <XCircle className="w-3.5 h-3.5" /> Batalkan
                                </button>
                              )}

                              {isWaitingPayment && (
                                <button 
                                  onClick={() => handlePayment(order.orderId, order.totalPrice)}
                                  className="btn-primary py-1.5 px-4 text-xs flex items-center justify-center gap-2 w-full sm:w-auto"
                                >
                                  <CreditCard className="w-3.5 h-3.5" /> Bayar Sekarang
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })()}
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
