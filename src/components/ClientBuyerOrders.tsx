"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Clock, CheckCircle, XCircle, FileImage, CreditCard, LogOut, MessageCircle, UserX, Sun, Moon, Home, ShoppingCart, ShoppingBag, FileText, User, Printer, Receipt, Pencil, Save, X } from "lucide-react";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AuthUser, BuyerOrderViewItem, ChatMessage } from "@/types";

export default function ClientBuyerOrders({ orders, user }: { orders: BuyerOrderViewItem[], user?: AuthUser | null }) {
  const router = useRouter();
  const [qrisUrl, setQrisUrl] = useState('https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=DummyQRIS');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [prevOrders, setPrevOrders] = useState<BuyerOrderViewItem[]>(orders);
  const [localOrders, setLocalOrders] = useState<BuyerOrderViewItem[]>(orders);

  if (orders !== prevOrders) {
    setPrevOrders(orders);
    setLocalOrders(orders);
  }

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});

  // Load the active QRIS from localStorage
  useEffect(() => {
    const savedQris = localStorage.getItem('adminQrisUrl');
    if (savedQris) {
      setTimeout(() => {
        setQrisUrl(savedQris);
      }, 0);
    }
  }, []);

  // Mark all orders as read when viewing this page
  useEffect(() => {
    if (user?.role === 'pembeli') {
      fetch('/api/orders', { method: 'PATCH' }).catch(err => console.error(err));
    }
  }, [user]);

  // Check initial mode for dark mode
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

  const toggleDarkMode = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
      setIsDarkMode(true);
    }
  };

  const formatOrderDate = (date: string | Date | null) => {
    if (!date) return 'Tanggal tidak tersedia';

    const orderDate = new Date(date);
    const formattedDate = orderDate.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    const formattedTime = orderDate
      .toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      .replace('.', ':');

    return `${formattedDate}, ${formattedTime} WIB`;
  };

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
      // Optimistic update: langsung hapus dari tampilan
      setLocalOrders(prev => prev.filter(o => o.orderId !== orderId));

      Swal.fire({
        title: 'Pesanan Dibatalkan',
        text: 'Pesanan Anda telah berhasil dibatalkan.',
        icon: 'success',
        timer: 1800,
        showConfirmButton: false
      });

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

        router.refresh();
      } catch (error) {
        // Rollback optimistic update
        setLocalOrders(orders);
        const errMsg = error instanceof Error ? error.message : 'Terjadi kesalahan.';
        Swal.fire('Gagal!', errMsg, 'error');
      }
    }
  };

  const handleDeleteOrder = async (orderId: string, productName: string) => {
    const result = await Swal.fire({
      title: 'Hapus Data Pesanan?',
      text: `Apakah Anda yakin ingin menghapus data pesanan ${orderId} (${productName}) secara permanen?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Ya, Hapus',
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
          throw new Error(json.error || 'Gagal menghapus pesanan');
        }

        await Swal.fire({
          title: 'Terhapus',
          text: 'Data pesanan berhasil dihapus dari sistem.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });

        router.refresh();
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Terjadi kesalahan.';
        Swal.fire('Gagal!', errMsg, 'error');
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
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Terjadi kesalahan.';
        Swal.fire('Gagal!', errMsg, 'error');
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
          
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : 'Terjadi kesalahan.';
          Swal.fire('Gagal!', errMsg, 'error');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const escapeQuotes = (str: string) => str ? str.replace(/"/g, '&quot;').replace(/'/g, '&#39;') : '';

  const handleOpenChat = async (orderId: string, storeName: string, productName: string) => {
    // Show loading state first
    Swal.fire({
      title: 'Memuat Obrolan...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const res = await fetch(`/api/chat?orderId=${orderId}`);
      const { messages } = await res.json();
      
      const chatHistory = messages || [];

      // Virtual fallback: Ensure the seller always has an opening message on the frontend!
      const hasSellerOpening = chatHistory.some((m: ChatMessage) => m.role === 'penjual' || m.role === 'admin');
      if (!hasSellerOpening) {
        chatHistory.unshift({
          role: 'penjual',
          text: `Halo kak! Tadi kakak melakukan pemesanan untuk <b>${productName}</b> ya?`,
          createdAt: chatHistory[0]?.createdAt 
            ? new Date(new Date(chatHistory[0].createdAt).getTime() - 60000).toISOString() 
            : new Date().toISOString(),
          isRead: true
        });
      }

    const renderMsgs = () => chatHistory.map((c: ChatMessage) => {
      const isMe = c.sender === 'buyer';
      if (isMe) {
        const tickClass = c.isRead ? "text-blue-200" : "text-text-primary/60";
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
        popup: 'bg-surface text-text-primary rounded-2xl w-[90%] max-w-md border border-border shadow-2xl',
        title: 'text-lg font-bold border-b border-border pb-3 mb-0 text-left w-full text-text-primary',
        htmlContainer: 'mt-4',
        closeButton: 'focus:outline-none'
      },
      didOpen: () => {
        const input = document.getElementById('chat-input') as HTMLInputElement;
        const sendBtn = document.getElementById('send-chat');
        const chatBox = document.getElementById('chat-box');
        const chatMessages = document.getElementById('chat-messages');
        
        let editingId: string | null = null;

        if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
        
        chatBox?.addEventListener('click', async (e) => {
          const target = e.target as HTMLElement;
          if (target.classList.contains('chat-del-btn')) {
            const id = target.getAttribute('data-id');
            const bubble = document.getElementById(`msg-bubble-${id}`);
            if (bubble) bubble.style.display = 'none';
            await fetch('/api/chat', {
              method: 'DELETE',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ id })
            });
          }
          if (target.classList.contains('chat-edit-btn')) {
            const id = target.getAttribute('data-id');
            const text = target.getAttribute('data-text');
            if (id && text && input) {
              editingId = id;
              input.value = text;
              input.focus();
            }
          }
        });
        
        const sendMessage = async () => {
          if (!input.value.trim()) return;
          const msg = input.value;
          
          if (editingId) {
            const id = editingId;
            editingId = null;
            input.value = '';
            const textSpan = document.getElementById(`msg-text-${id}`);
            const editBtn = document.querySelector(`.chat-edit-btn[data-id="${id}"]`);
            if (textSpan) textSpan.innerText = msg;
            if (editBtn) editBtn.setAttribute('data-text', escapeQuotes(msg));
            await fetch('/api/chat', {
              method: 'PUT',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ id, text: msg })
            });
            return;
          }

          const now = new Date();
          const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} WIB`;
          const msgId = 'msg-' + Date.now();
          
          input.value = '';
          
          chatMessages?.insertAdjacentHTML('beforeend', `
            <div class="flex justify-end mt-3 group" id="msg-bubble-${msgId}">
              <div class="flex flex-col items-end justify-center mr-2 gap-1.5 opacity-80" id="${msgId}-actions" style="display:none;">
                <button class="chat-edit-btn text-[10px] text-brand-primary flex items-center gap-1 hover:text-brand-primary-hover transition-colors bg-brand-primary/5 px-2 py-0.5 rounded-full" data-id="${msgId}" data-text="${escapeQuotes(msg)}">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg> Edit
                </button>
                <button class="chat-del-btn text-[10px] text-status-error flex items-center gap-1 hover:text-red-700 transition-colors bg-status-error/5 px-2 py-0.5 rounded-full" data-id="${msgId}">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg> Hapus
                </button>
              </div>
              <div class="bg-brand-primary text-white rounded-xl rounded-tr-none px-4 py-2 max-w-[80%] text-sm text-left shadow-sm opacity-50" id="${msgId}-container">
                <span id="msg-text-${msgId}">${msg}</span>
                <div class="flex items-center justify-end gap-1 mt-1">
                  <span class="text-[10px] text-white/80">${time}</span>
                  <svg id="${msgId}-ticks" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-text-primary/60"><path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/></svg>
                </div>
              </div>
            </div>
          `);
          if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;

          try {
            const sendRes = await fetch('/api/chat', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ orderId, text: msg })
            });
            const { id: realId } = await sendRes.json();
            
            // Set REAL ID to buttons so they can be clicked
            document.querySelector(`.chat-edit-btn[data-id="${msgId}"]`)?.setAttribute('data-id', realId);
            document.querySelector(`.chat-del-btn[data-id="${msgId}"]`)?.setAttribute('data-id', realId);
            document.getElementById(`msg-bubble-${msgId}`)!.id = `msg-bubble-${realId}`;
            document.getElementById(`msg-text-${msgId}`)!.id = `msg-text-${realId}`;
            
            const actionsBlock = document.getElementById(`${msgId}-actions`);
            if (actionsBlock) actionsBlock.style.display = 'flex';

            const c = document.getElementById(`${msgId}-container`);
            if (c) c.classList.remove('opacity-50');
            const ticks = document.getElementById(`${msgId}-ticks`);
            // Add blue checks since server received it successfully
            if (ticks) {
               ticks.classList.remove('text-text-primary/60');
               ticks.classList.add('text-blue-200');
            }
          } catch (e) {
            console.error('Failed to send msg');
          }
        };

        sendBtn?.addEventListener('click', sendMessage);
        input?.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') sendMessage();
        });
      }
    });

    } catch (error) {
      Swal.fire('Terjadi Kesalahan', 'Gagal memuat obrolan', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-base pb-24">
      <header className="bg-surface/80 backdrop-blur-md border-b border-border sticky top-0 z-50 transition-all">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-gray-100 rounded-full transition-colors" title="Kembali ke Beranda">
              <ArrowLeft className="w-5 h-5 text-text-primary" />
            </Link>
            <span className="font-semibold text-lg text-text-primary">Daftar Pesanan Saya</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleDarkMode}
              className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors relative flex items-center justify-center w-10 h-10"
              aria-label="Toggle Dark Mode"
            >
              <AnimatePresence mode="wait" initial={false}>
                {isDarkMode ? (
                  <motion.div
                    key="moon"
                    initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0.5, opacity: 0, rotate: 90 }}
                    transition={{ duration: 0.2 }}
                    className="absolute"
                  >
                    <Moon className="w-5 h-5 text-brand-secondary" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="sun"
                    initial={{ scale: 0.5, opacity: 0, rotate: 90 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0.5, opacity: 0, rotate: -90 }}
                    transition={{ duration: 0.2 }}
                    className="absolute"
                  >
                    <Sun className="w-5 h-5 text-brand-primary" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>

            {user && (
              <button 
                onClick={handleLogout}
                className="p-2 rounded-full text-status-error hover:bg-status-error/10 transition-colors flex items-center justify-center w-10 h-10"
                title="Keluar / Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-6 max-w-4xl pb-24 md:pb-12">
        {orders.length === 0 ? (
          !user ? (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", bounce: 0.5, duration: 0.8 }}
              className="text-center py-20 px-4 bg-surface rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.06)] border border-border mt-8 flex flex-col items-center max-w-lg mx-auto overflow-hidden relative"
            >
              <div className="absolute -top-32 -left-32 w-64 h-64 bg-brand-primary/10 rounded-full blur-3xl opacity-50 mix-blend-multiply" />
              <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-brand-secondary/20 rounded-full blur-3xl opacity-50 mix-blend-multiply" />
              
              <div className="relative flex flex-col items-center">
                {/* Bayangan Dasar (Floor Shadow) */}
                <motion.div 
                  animate={{ scale: [1, 0.7, 1], opacity: [0.2, 0.05, 0.2] }}
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                  className="absolute bottom-2 left-1/2 -translate-x-1/2 w-40 h-6 bg-black blur-[8px] rounded-[100%] z-0"
                />

                <motion.div 
                  animate={{ y: [0, -12, 0], rotate: [-1, 1, -1] }}
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                  className="relative w-56 h-56 mb-4 mt-6 z-10"
                >
                  {/* Gelembung Awan (Thought Bubble) */}
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.5, y: 10, x: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                    transition={{ delay: 0.4, type: "spring", bounce: 0.6 }}
                    className="absolute top-0 -right-4 z-20 drop-shadow-xl"
                  >
                    <div className="relative bg-white text-slate-800 px-5 py-3 rounded-full font-bold text-lg border border-slate-100 rotate-6 shadow-sm">
                      Yahh..
                      {/* Ekor gelembung awan (Thought dots) */}
                      <div className="absolute -bottom-2 -left-1 w-4 h-4 bg-white rounded-full border border-slate-100 border-t-0 border-r-0"></div>
                      <div className="absolute -bottom-5 -left-4 w-2 h-2 bg-white rounded-full border border-slate-100"></div>
                    </div>
                  </motion.div>

                  <Image 
                    src="/confused-man-smooth.png" 
                    alt="Bingung Belum Login"
                    fill
                    quality={100}
                    unoptimized
                    priority
                    className="object-contain z-10"
                    style={{ clipPath: "inset(2px)" }}
                  />
                </motion.div>
              </div>
              
              <h3 className="text-h2 text-text-primary mb-3 font-bold">Anda belum masuk!</h3>
              <p className="text-body-base text-text-secondary mb-8 max-w-sm">Tampaknya Anda belum login ke dalam akun, silakan masuk untuk melihat dan membuat pesanan baru.</p>
              
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto z-10 relative">
                <Link href="/login" className="btn-primary py-3 px-8 text-base text-white shadow-lg hover:shadow-brand-primary/30 transition-shadow w-full sm:w-auto text-center rounded-xl">
                  Masuk Sekarang
                </Link>
              </div>
            </motion.div>
          ) : (
            <div className="text-center py-20 bg-surface rounded-3xl border border-border mt-8 shadow-sm">
              <div className="mx-auto w-fit relative mb-6 mt-4">
                <div className="w-48 h-36 md:w-64 md:h-48 overflow-hidden relative flex justify-center items-start rounded-3xl shadow-md border border-gray-100 dark:border-gray-800 bg-orange-50/30">
                  <img 
                    src="https://media1.tenor.com/m/1f8NZQnyGgkAAAAC/hamie-hamieverse.gif" 
                    alt="Belum Ada Pesanan" 
                    className="w-48 h-48 md:w-64 md:h-64 object-cover object-top scale-[1.15]"
                  />
                </div>
              </div>
              <h3 className="text-h3 text-text-primary mb-2">Anda Belum Membuat Pesanan</h3>
              <p className="text-text-secondary mb-6">Mulai pesan makanan dan minuman UMKM favoritmu sekarang!</p>
              <Link href="/" className="btn-primary py-2.5 px-8 font-medium">
                Pesan Sekarang
              </Link>
            </div>
          )
        ) : (
          <div className="space-y-4">
            {localOrders.map((order) => {
              const isWaitingPayment = !order.paymentId;
              const isPendingVerif = order.paymentId && order.paymentStatus === 'pending';
              const isVerified = order.paymentId && order.paymentStatus === 'approved';
              
              const updateQty = async (delta: number) => {
                const minAllowed = order.minQty || 1;
                const availableStock = Math.max(0, (order.stock || 0) - (order.currentQty || 0) + order.qty);
                const maxAllowed = Math.min(order.maxQty || 999999, availableStock);
                const newQty = order.qty + delta;

                if (newQty < minAllowed) {
                  Swal.fire({
                    icon: 'warning',
                    title: 'Batas Minimal',
                    text: `Penjual menetapkan minimal pemesanan adalah ${minAllowed} porsi.`,
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 2000,
                  });
                  return;
                }

                if (newQty > maxAllowed) {
                  Swal.fire({
                    icon: 'warning',
                    title: 'Batas Maksimal / Stok',
                    text: `Batas pemesanan adalah ${maxAllowed} porsi.`,
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 2000,
                  });
                  return;
                }

                // Calculate unit price from original state
                const unitPrice = order.totalPrice / order.qty;
                const newTotalPrice = unitPrice * newQty;
                
                // Optimistic update
                setLocalOrders(prev => prev.map(o => {
                  if (o.orderId === order.orderId) {
                    return { ...o, qty: newQty, totalPrice: newTotalPrice };
                  }
                  return o;
                }));

                try {
                  const res = await fetch('/api/orders/update-qty', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderId: order.orderId, qty: newQty }),
                  });
                  if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || 'Gagal menyimpan perubahan');
                  }
                } catch (error) {
                  // Rollback on error
                  setLocalOrders(prev => prev.map(o => {
                    if (o.orderId === order.orderId) {
                      return { ...o, qty: order.qty, totalPrice: order.totalPrice };
                    }
                    return o;
                  }));
                  const errMsg = error instanceof Error ? error.message : 'Terjadi kesalahan.';
                  Swal.fire({
                    icon: 'error',
                    title: 'Gagal',
                    text: errMsg,
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 2000,
                  });
                }
              };
              
              return (
                <div key={order.orderId} className="card p-0 border border-border overflow-hidden bg-surface">
                  <div className="p-4 border-b border-border bg-base flex justify-between items-center">
                    <span className="text-xs font-mono text-text-secondary">{order.orderId}</span>
                    <span className="text-xs text-text-secondary font-medium">
                      {formatOrderDate(order.createdAt)}
                    </span>
                  </div>
                  <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                    <div className="flex gap-4 items-center">
                      <div className="w-16 h-16 rounded-xl bg-base dark:bg-border overflow-hidden relative shrink-0">
                        {order.productImageUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
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
                        {order.processingTime && (
                          <p className="text-sm text-text-secondary mb-1">
                            Waktu Proses: <span className="font-medium text-text-primary">{order.processingTime}</span>
                          </p>
                        )}
                        <p className="text-sm text-brand-primary font-semibold mb-2">Rp {(order.totalPrice / order.qty).toLocaleString('id-ID')} / Porsi</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <p className="text-sm font-medium">Jumlah:</p>
                          <div className={`flex items-center border border-border rounded-lg bg-base overflow-hidden ${order.status === 'completed' || order.status === 'cancelled' || order.paymentId ? 'opacity-50 pointer-events-none bg-gray-100 dark:bg-gray-800' : ''}`}>
                            <button 
                              onClick={() => updateQty(-1)}
                              disabled={order.status === 'completed' || order.status === 'cancelled' || !!order.paymentId}
                              className="px-2.5 py-1 text-text-secondary hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                            >
                              -
                            </button>
                            <span className="text-sm font-semibold w-8 text-center">{order.qty}</span>
                            <button 
                              onClick={() => updateQty(1)}
                              disabled={order.status === 'completed' || order.status === 'cancelled' || !!order.paymentId}
                              className="px-2.5 py-1 text-text-secondary hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Catatan Tambahan — full width row */}
                  <div className="px-5 pb-4 border-t border-border pt-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Pencil className="w-4 h-4 text-text-secondary" />
                      <span className="text-xs sm:text-sm font-semibold text-text-secondary uppercase tracking-wide">Catatan Tambahan</span>
                    </div>
                    {editingNoteId === order.orderId ? (
                      <div className="w-full">
                        <textarea
                          autoFocus
                          value={noteInputs[order.orderId] ?? order.notes ?? ''}
                          onChange={(e) => setNoteInputs(prev => ({ ...prev, [order.orderId]: e.target.value }))}
                          rows={3}
                          placeholder="Contoh: Jangan terlalu pedas ya kak, tolong dibungkus rapi..."
                          className="w-full text-sm bg-base border-2 border-brand-primary/50 focus:border-brand-primary rounded-xl px-3 py-3 resize-none outline-none text-text-primary transition-colors leading-relaxed placeholder:text-text-secondary/40 shadow-sm"
                        />
                        <div className="grid grid-cols-2 gap-2 mt-2.5">
                          <button
                            onClick={async () => {
                              const newNote = noteInputs[order.orderId] ?? order.notes ?? '';
                              try {
                                const res = await fetch('/api/orders/update-note', {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ orderId: order.orderId, notes: newNote }),
                                });
                                if (res.ok) {
                                  setLocalOrders(prev => prev.map(o =>
                                    o.orderId === order.orderId ? { ...o, notes: newNote } : o
                                  ));
                                  Swal.fire({ icon: 'success', title: 'Catatan Disimpan', toast: true, position: 'top-end', showConfirmButton: false, timer: 1800 });
                                } else {
                                  Swal.fire({ icon: 'error', title: 'Gagal menyimpan catatan', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
                                }
                              } catch {
                                Swal.fire({ icon: 'error', title: 'Terjadi kesalahan', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
                              }
                              setEditingNoteId(null);
                            }}
                            className="flex items-center justify-center gap-2 py-3 bg-brand-primary text-white text-sm font-semibold rounded-xl hover:bg-brand-primary-hover active:scale-95 transition-all"
                          >
                            <Save className="w-4 h-4 shrink-0" />
                            <span>Simpan Catatan</span>
                          </button>
                          <button
                            onClick={() => setEditingNoteId(null)}
                            className="flex items-center justify-center gap-2 py-3 bg-gray-100 dark:bg-gray-700 text-text-secondary text-sm font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-95 transition-all"
                          >
                            <X className="w-4 h-4 shrink-0" />
                            <span>Batal</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="group cursor-pointer w-full"
                        onClick={() => {
                          setNoteInputs(prev => ({ ...prev, [order.orderId]: order.notes ?? '' }));
                          setEditingNoteId(order.orderId);
                        }}
                      >
                        {order.notes ? (
                          <div className="flex items-start gap-2.5 bg-base border border-border rounded-xl px-3 py-3 group-hover:border-brand-primary/40 group-hover:bg-brand-primary/[0.02] active:bg-brand-primary/5 transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5 text-brand-primary/60"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                             <span className="leading-relaxed text-sm text-text-secondary flex-1 italic">&ldquo;{order.notes}&rdquo;</span>
                            <Pencil className="w-4 h-4 text-brand-primary/50 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2 text-sm text-text-secondary/60 hover:text-brand-primary active:text-brand-primary transition-colors border-2 border-dashed border-border hover:border-brand-primary/40 rounded-xl px-3 py-4 w-full">
                            <Pencil className="w-4 h-4" />
                            <span className="font-medium">Tap untuk menambahkan catatan...</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="px-5 pb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-border pt-4">
                    <div>
                      <p className="text-xs text-text-secondary font-medium">Total Harga</p>
                      <p className="font-bold text-lg text-brand-primary">Rp {order.totalPrice.toLocaleString('id-ID')}</p>
                    </div>
                    
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
                              
                              <Link 
                                href={`/invoice/${order.orderId}`}
                                className="btn-outline border-gray-300 text-gray-700 hover:bg-gray-50 py-1.5 px-3 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 w-full sm:w-auto"
                              >
                                <Receipt className="w-3.5 h-3.5" /> Detail Pembayaran
                              </Link>
                              
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
                                        popup: 'bg-surface text-text-primary',
                                        title: 'text-text-primary'
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
              );
            })}
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (Orders Page) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-border px-4 py-2 flex justify-between items-end pb-8 shadow-[0_-4px_15px_rgba(0,0,0,0.05)] text-[10px] font-medium rounded-t-2xl">
        <Link 
          href="/" 
          className="flex flex-col items-center gap-1.5 w-1/4 text-text-secondary hover:text-brand-primary transition-colors pb-2"
        >
          <Home className="w-6 h-6 stroke-[1.5]" />
          <span>Beranda</span>
        </Link>
        
        <div className="w-1/4 flex flex-col justify-end items-center relative pb-2 h-full">
          <Link href="/" className="absolute bottom-6 flex justify-center w-full">
            <button className="w-14 h-14 rounded-full bg-brand-primary text-white flex items-center justify-center shadow-lg hover:bg-brand-primary-hover transition-all transform hover:scale-105">
              <ShoppingBag className="w-7 h-7 stroke-[1.5]" />
            </button>
          </Link>
          <span className="text-text-secondary mt-1">Belanja</span>
        </div>
        
        <button 
          className="flex flex-col items-center gap-1.5 w-1/4 text-brand-primary font-semibold pb-2"
        >
          <FileText className="w-6 h-6 stroke-[1.5] fill-brand-primary/10 stroke-brand-primary" />
          <span>Pesanan</span>
        </button>
        
        {user ? (
          <Link 
            href={user.role === 'admin' ? '/admin' : user.role === 'penjual' ? '/seller' : '/buyer/orders'}
            className="flex flex-col items-center gap-1.5 w-1/4 text-text-secondary hover:text-brand-primary transition-colors pb-2"
          >
            <User className="w-6 h-6 stroke-[1.5]" />
            <span>Akun</span>
          </Link>
        ) : (
          <Link 
            href="/login"
            className="flex flex-col items-center gap-1.5 w-1/4 text-text-secondary hover:text-brand-primary transition-colors pb-2"
          >
            <User className="w-6 h-6 stroke-[1.5]" />
            <span>Masuk</span>
          </Link>
        )}
      </nav>
    </div>
  );
}
