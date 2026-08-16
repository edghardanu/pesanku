"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, CheckCircle, XCircle, FileImage, CreditCard, LogOut, MessageCircle, UserX, Sun, Moon, Home, ShoppingCart, ShoppingBag, FileText, User, Printer, Receipt, Pencil, Save, X, Loader2, Star, Trash2, Truck, ScanLine, Search } from "lucide-react";
import Swal from "sweetalert2";
import QRScannerModal from "@/components/QRScannerModal";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { DotLottieReact } from "@/lib/dotlottie";
import { AuthUser, BuyerOrderViewItem, ChatMessage } from "@/types";

export default function ClientBuyerOrders({
  orders,
  user,
  checkoutCount = 0,
}: {
  orders: BuyerOrderViewItem[];
  user?: AuthUser | null;
  checkoutCount?: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const openChatOrderId = searchParams.get('openChat');
    if (openChatOrderId) {
      const order = orders.find(o => o.orderId === openChatOrderId);
      if (order) {
        // give it a tiny delay to let SWAL mount cleanly
        setTimeout(() => {
          setActiveTab('chats');
          handleOpenChat(order.orderId, order.storeName || 'Toko UMKM', order.productName);
        }, 500);
      }
    }
  }, [searchParams, orders]);
  const [qrisUrl, setQrisUrl] = useState('https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=DummyQRIS');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [localOrders, setLocalOrders] = useState<BuyerOrderViewItem[]>(orders);
  const [bottomNavLoading, setBottomNavLoading] = useState<'home' | 'catalog' | null>(null);
  const [checkoutNoticeCount, setCheckoutNoticeCount] = useState(checkoutCount);
  const [ratingLoadingOrderId, setRatingLoadingOrderId] = useState<string | null>(null);
  const hasShownCheckoutNotice = useRef(false);
  const [activeTab, setActiveTab] = useState<'orders' | 'chats' | 'tracking'>('orders');

  const filteredLocalOrders = localOrders.filter(o => {
    if (activeTab === 'chats') return o.status === 'chat_only';
    if (activeTab === 'tracking') return o.status !== 'chat_only' && o.status !== 'cancelled';
    return o.status !== 'chat_only';
  });

  useEffect(() => {
    setLocalOrders(orders);
  }, [orders]);

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [qtyDrafts, setQtyDrafts] = useState<Record<string, string>>({});

  // Load the active QRIS from localStorage
  useEffect(() => {
    const savedQris = localStorage.getItem('adminQrisUrl');
    if (savedQris) {
      setTimeout(() => {
        setQrisUrl(savedQris);
      }, 0);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'pembeli') {
      fetch('/api/orders', { method: 'PATCH' }).catch(err => console.error(err));
    }
  }, [user]);

  // Poll for real-time order updates
  useEffect(() => {
    if (!user || user.role !== 'pembeli') return;

    const fetchRealtimeOrders = async () => {
      try {
        const res = await fetch(`/api/buyer/orders?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.orders) {
            setLocalOrders(data.orders);
          }
        }
      } catch (err) {
        console.error('Error polling real-time orders:', err);
      }
    };

    // Initial fetch not needed as server passes initial orders, just start interval
    const interval = setInterval(fetchRealtimeOrders, 3000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (checkoutCount < 1 || hasShownCheckoutNotice.current) return;

    hasShownCheckoutNotice.current = true;
    void Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'Checkout berhasil',
      text: `${checkoutCount} produk berhasil ditambahkan ke daftar pesanan.`,
      showConfirmButton: false,
      timer: 4500,
      timerProgressBar: true,
    });
  }, [checkoutCount]);

  useEffect(() => {
    router.prefetch('/');
  }, [router]);

  useEffect(() => {
    if (!bottomNavLoading) return;

    const timer = window.setTimeout(() => {
      setBottomNavLoading(null);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [bottomNavLoading]);

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

  const handleDeleteChatSection = async (orderId: string, storeName: string) => {
    const result = await Swal.fire({
      title: 'Hapus Chat?',
      text: `Apakah Anda yakin ingin menghapus seluruh riwayat obrolan dengan ${storeName}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      setLocalOrders(prev => prev.filter(o => o.orderId !== orderId));

      try {
        const res = await fetch('/api/orders/cancel', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId }),
        });

        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error || 'Gagal menghapus chat');
        }

        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Obrolan berhasil dihapus',
          showConfirmButton: false,
          timer: 2000
        });
        router.refresh();
      } catch (error) {
        setLocalOrders(orders);
        const errMsg = error instanceof Error ? error.message : 'Terjadi kesalahan.';
        Swal.fire('Gagal!', errMsg, 'error');
      }
    }
  };

  const handleDeleteAllChats = async () => {
    const result = await Swal.fire({
      title: 'Hapus Semua Chat?',
      text: 'Apakah Anda yakin ingin menghapus semua riwayat obrolan dengan penjual secara permanen?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Ya, Hapus Semua',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      setLocalOrders(prev => prev.filter(o => o.status !== 'chat_only'));

      try {
        const res = await fetch('/api/orders/cancel', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ allChats: true }),
        });

        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error || 'Gagal menghapus semua chat');
        }

        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Semua obrolan berhasil dihapus',
          showConfirmButton: false,
          timer: 2000
        });
        router.refresh();
      } catch (error) {
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

  const handleProductRating = async (orderId: string, productName: string, rating: number) => {
    const previousRating = localOrders.find((order) => order.orderId === orderId)?.rating ?? null;
    setRatingLoadingOrderId(orderId);
    setLocalOrders((current) => current.map((order) => (
      order.orderId === orderId ? { ...order, rating, ratedAt: new Date() } : order
    )));

    try {
      const response = await fetch('/api/orders/rating', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, rating }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal menyimpan rating.');
      }

      void Swal.fire({
        icon: 'success',
        title: 'Rating Tersimpan',
        text: `Anda memberikan ${rating} bintang untuk ${productName}.`,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2200,
      });
      router.refresh();
    } catch (error) {
      setLocalOrders((current) => current.map((order) => (
        order.orderId === orderId ? { ...order, rating: previousRating } : order
      )));
      const message = error instanceof Error ? error.message : 'Terjadi kesalahan saat menyimpan rating.';
      void Swal.fire({ icon: 'error', title: 'Rating Gagal Disimpan', text: message });
    } finally {
      setRatingLoadingOrderId(null);
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

  const handleOpenChat = async (orderId: string, storeName: string, productName: string, sellerId?: string) => {
    // Clear unread count optimistically
    setLocalOrders(prev => prev.map(o => o.orderId === orderId ? { ...o, unreadCount: 0 } : o));

    // Show loading state first
    Swal.fire({
      title: 'Memuat Obrolan...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const res = await fetch(`/api/chat?orderId=${orderId}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Gagal memuat obrolan');
      const { messages, status } = await res.json();
      
      const chatHistory: ChatMessage[] = messages || [];

      let storeProducts: any[] = [];
      if (sellerId) {
        try {
          const prodRes = await fetch(`/api/products/public?sellerId=${sellerId}`);
          if (prodRes.ok) {
            const prodData = await prodRes.json();
            storeProducts = prodData.products || [];
          }
        } catch (err) {
          console.error('Failed to fetch store products:', err);
        }
      }

      // Virtual fallback: Ensure the seller always has an opening message on the frontend!
      const hasSellerOpening = chatHistory.some((m: ChatMessage) => m.role === 'penjual' || m.role === 'admin');
      if (!hasSellerOpening) {
        const isChatOnly = status === 'chat_only';
        chatHistory.unshift({
          sender: 'seller',
          role: 'penjual',
          text: isChatOnly 
            ? `Halo kak! Apakah ada yang bisa kami bantu seputar produk <b>${productName}</b>?`
            : `Halo kak! Tadi kakak melakukan pemesanan untuk <b>${productName}</b> ya?`,
          createdAt: chatHistory[0]?.createdAt 
            ? new Date(new Date(chatHistory[0].createdAt).getTime() - 60000).toISOString() 
            : new Date().toISOString(),
          isRead: false
        });
      }

    const renderSingleOfferCard = (pId: string, pName: string, pPrice: string, pImage: string, isMe: boolean) => {
      const cleanImg = pImage || "/street-food-festival.jpg";
      const bgCard = isMe ? 'bg-white/10' : 'bg-surface border border-border';
      const textTitle = isMe ? 'text-white' : 'text-text-primary';
      const textPrice = isMe ? 'text-yellow-200' : 'text-brand-primary';
      const buttonBg = isMe ? 'bg-white text-brand-primary hover:bg-white/95' : 'bg-brand-primary text-white hover:bg-brand-primary-hover';
      
      return `
        <div class="flex flex-col gap-2.5 p-2.5 rounded-xl ${bgCard} w-full min-w-0 max-w-[260px] shadow-sm text-left">
          <div class="flex gap-3 items-center">
            <div class="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-base relative border border-white/10">
              <img src="${cleanImg}" alt="${pName}" class="w-full h-full object-cover" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-bold ${textTitle} line-clamp-2 leading-tight" title="${pName}">${pName}</p>
              <p class="text-xs font-bold mt-1 ${textPrice}">${pPrice}</p>
            </div>
          </div>
          <a href="/product/${encodeURIComponent((pName || 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))}-${pId}" target="_blank" class="w-full ${buttonBg} text-xs font-bold py-1.5 px-3 rounded-lg transition-all text-center flex items-center justify-center gap-1 active:scale-95 decoration-none hover:no-underline">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-external-link"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
            Lihat Produk
          </a>
        </div>
      `;
    };

    const renderMsgs = () => chatHistory.map((c: ChatMessage) => {
      const isMe = (c.senderId && user?.id && c.senderId === user.id) || c.sender === 'buyer';
      
      const trimmedText = (c.text || '').trim();
      let bubbleContent = c.text;
      if (trimmedText.startsWith('[PRODUK_OFFER|') && trimmedText.endsWith(']')) {
        const parts = trimmedText.slice(1, -1).split('|');
        if (parts.length >= 5) {
          const pId = parts[1];
          const pName = parts[2];
          const pPrice = parts[3];
          const pImage = parts.slice(4).join('|');
          bubbleContent = renderSingleOfferCard(pId, pName, pPrice, pImage, isMe);
        }
      }

      if (isMe) {
        const tickClass = c.isRead ? "text-blue-200" : "text-text-primary/60";
        const tickStyle = c.isRead ? "color: #60a5fa;" : "";
        return `
          <div class="flex justify-end mt-3">
            <div class="bg-brand-primary text-white rounded-xl rounded-tr-none px-4 py-2 max-w-[80%] text-sm text-left shadow-sm">
              ${bubbleContent}
              <div class="flex items-center justify-end gap-1 mt-1">
                <span class="text-[10px] text-white/80">${isMe ? 'Anda' : (storeName || 'Penjual')} • ${c.createdAt ? new Date(c.createdAt).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit', hour12: false}) : ''}</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${tickClass}" style="${tickStyle}"><path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/></svg>
              </div>
            </div>
          </div>
        `;
      } else {
        return `
          <div class="flex justify-start mt-3">
            <div class="bg-surface border border-border rounded-xl rounded-tl-none px-4 py-2 max-w-[80%] text-sm text-text-primary text-left">
              ${bubbleContent}
              <div class="text-[10px] text-text-secondary mt-1">${isMe ? 'Anda' : (storeName || 'Penjual')} • ${c.createdAt ? new Date(c.createdAt).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit', hour12: false}) : ''}</div>
            </div>
          </div>
        `;
      }
    }).join('');

    const renderProductList = () => {
      if (storeProducts.length === 0) {
        return `<div class="text-xs text-text-secondary text-center py-4 bg-base rounded-xl border border-border">Belum ada produk aktif</div>`;
      }
      return storeProducts.map(p => {
        const pImage = p.imageUrl || "/street-food-festival.jpg";
        const formattedPrice = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p.price);
        return `
          <div class="flex flex-col gap-2 p-2.5 bg-base border border-border rounded-xl hover:border-brand-primary/50 transition-colors w-full">
            <div class="flex gap-2.5 items-center">
              <div class="w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-surface relative">
                <img src="${pImage}" alt="${p.name}" class="w-full h-full object-cover" />
              </div>
              <div class="flex-1 min-w-0 text-left">
                <p class="text-sm font-bold text-text-primary line-clamp-2 leading-tight" title="${p.name}">${p.name}</p>
                <p class="text-xs font-bold text-brand-primary mt-1">${formattedPrice}</p>
              </div>
            </div>
            <button class="w-full bg-brand-primary text-white hover:bg-brand-primary-hover text-xs font-bold py-1.5 px-3 rounded-lg transition-all text-center flex items-center justify-center gap-1 mt-0.5 active:scale-95 btn-ask-product" data-pid="${p.id}" data-pname="${p.name}" data-pprice="${formattedPrice}" data-pimg="${pImage}">
              Tanyakan
            </button>
          </div>
        `;
      }).join('');
    };

    Swal.fire({
      title: `Chat dengan ${storeName}`,
      width: 'min(95vw, 950px)',
      html: `
        <style>
          #store-products-list::-webkit-scrollbar {
            width: 8px !important;
            display: block !important;
          }
          #store-products-list::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.05) !important;
            border-radius: 4px !important;
          }
          #store-products-list::-webkit-scrollbar-thumb {
            background: #cbd5e1 !important;
            border-radius: 4px !important;
          }
          #store-products-list::-webkit-scrollbar-thumb:hover {
            background: #94a3b8 !important;
          }
        </style>
        <div class="grid grid-cols-1 md:grid-cols-12 gap-4 text-left">
          <!-- Column 1: Chat -->
          <div class="md:col-span-7 flex flex-col justify-between">
            <div class="flex flex-col h-[320px] md:h-[500px] bg-base border border-border rounded-xl p-3 md:p-4 overflow-y-auto mb-3 md:mb-4" id="chat-box">
              <div class="text-[10px] md:text-xs text-text-secondary text-center mb-3">Hari ini</div>
              <div id="chat-messages" class="flex flex-col gap-2 md:gap-3">
                ${renderMsgs()}
              </div>
            </div>
            <div class="flex gap-2">
              <input type="text" id="chat-input" class="input-field flex-1 text-sm bg-base border-border rounded-xl px-3 outline-none focus:border-brand-primary" placeholder="Ketik pesan di sini...">
              <button id="send-chat" class="btn-primary py-2 px-4 rounded-xl flex items-center justify-center transition-transform active:scale-95 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-send"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              </button>
            </div>
          </div>
          
          <!-- Column 2: Products Showcase -->
          <div class="md:col-span-5 border-t md:border-t-0 md:border-l border-border pt-3 md:pt-0 md:pl-4 flex flex-col h-[340px] md:h-[550px] transition-all duration-300 overflow-hidden" id="products-column">
            <div class="flex flex-col h-full w-full">
              <button id="toggle-products-btn" class="w-full text-[11px] md:text-xs font-bold text-text-primary mb-2 flex items-center justify-between shrink-0 uppercase tracking-wider bg-transparent hover:bg-black/5 p-2 -mx-2 rounded-lg transition-colors cursor-pointer outline-none select-none">
                <div class="flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-brand-primary"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                  Produk dari Toko Ini
                </div>
                <svg id="toggle-products-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="transition-transform duration-300 transform"><polyline points="18 15 12 9 6 15"></polyline></svg>
              </button>
              <div class="flex-1 overflow-y-scroll pr-1.5 space-y-2 max-h-[300px] md:max-h-[510px] transition-all duration-300" id="store-products-list">
                ${renderProductList()}
              </div>
            </div>
          </div>
        </div>
      `,
      showConfirmButton: false,
      showCloseButton: true,
      customClass: {
        popup: 'bg-surface text-text-primary rounded-2xl border border-border shadow-2xl',
        title: 'text-lg font-bold border-b border-border pb-3 mb-0 text-left w-full text-text-primary',
        htmlContainer: 'mt-4 w-full px-0',
        closeButton: 'focus:outline-none'
      },
      didOpen: () => {
        const input = document.getElementById('chat-input') as HTMLInputElement;
        const sendBtn = document.getElementById('send-chat');
        const chatBox = document.getElementById('chat-box');
        const chatMessages = document.getElementById('chat-messages');
        const productsList = document.getElementById('store-products-list');
        
        let editingId: string | null = null;
        if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;

        const toggleBtn = document.getElementById('toggle-products-btn');
        const toggleIcon = document.getElementById('toggle-products-icon');
        const productsColumn = document.getElementById('products-column');
        
        let isProductsOpen = true;
        
        toggleBtn?.addEventListener('click', () => {
          isProductsOpen = !isProductsOpen;
          if (isProductsOpen) {
            productsList!.style.display = 'block';
            toggleIcon!.style.transform = 'rotate(0deg)';
            productsColumn!.classList.remove('h-auto', 'md:h-auto');
            productsColumn!.classList.add('h-[340px]', 'md:h-[550px]');
          } else {
            productsList!.style.display = 'none';
            toggleIcon!.style.transform = 'rotate(180deg)';
            productsColumn!.classList.remove('h-[340px]', 'md:h-[550px]');
            productsColumn!.classList.add('h-auto', 'md:h-auto');
          }
        });

        const sendProductAsk = async (pId: string, pName: string, pPrice: string, pImage: string) => {
          const offerCode = `[PRODUK_OFFER|${pId}|${pName}|${pPrice}|${pImage}]`;
          const now = new Date();
          const tempMsg: ChatMessage = {
            id: 'temp-' + Date.now(),
            text: offerCode,
            senderId: user?.id,
            isRead: false,
            createdAt: now.toISOString()
          };
          chatHistory.push(tempMsg);
          if (chatMessages) {
            chatMessages.innerHTML = renderMsgs();
          }
          if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;

          try {
            const sendRes = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderId, text: offerCode }),
            });
            if (sendRes.ok) {
              const resData = await sendRes.json();
              const idx = chatHistory.findIndex((m: ChatMessage) => m.id === tempMsg.id);
              if (idx !== -1) {
                chatHistory[idx].id = resData.id;
              }
            }
          } catch (err) {
            console.error('Failed to send product ask:', err);
          }
        };

        const attachAskListeners = () => {
          document.querySelectorAll('.btn-ask-product').forEach(btn => {
            btn.addEventListener('click', (e) => {
              const target = e.currentTarget as HTMLButtonElement;
              const pId = target.getAttribute('data-pid')!;
              const pName = target.getAttribute('data-pname')!;
              const pPrice = target.getAttribute('data-pprice')!;
              const pImage = target.getAttribute('data-pimg')!;
              sendProductAsk(pId, pName, pPrice, pImage);
            });
          });
        };
        attachAskListeners();
        
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
                  <span class="text-[10px] text-white/80">Anda • ${time}</span>
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
            // Pesan berhasil terkirim, tetapi centang tetap abu-abu sampai penjual membacanya.
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

  const chatsCount = localOrders.filter(o => o.status === 'chat_only').reduce((acc, o) => acc + (o.unreadCount || 0), 0);
  const ordersCount = localOrders.filter(o => o.status !== 'chat_only').reduce((acc, o) => acc + (o.unreadCount || 0), 0);
  const trackingCount = localOrders.filter(o => o.status !== 'chat_only' && o.status !== 'cancelled').reduce((acc, o) => acc + (o.unreadCount || 0), 0);
  const totalUnreadCount = localOrders.reduce((acc, o) => acc + (o.unreadCount || 0), 0);

  return (
    <div className="min-h-screen bg-base pb-24">
      <style>{`
        @keyframes flow-horizontal {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes flow-vertical {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        .animate-flow-horizontal {
          background: linear-gradient(90deg, transparent, rgba(255, 92, 53, 0.8), transparent);
          animation: flow-horizontal 2.5s infinite linear;
        }
        .animate-flow-vertical {
          background: linear-gradient(180deg, transparent, rgba(255, 92, 53, 0.8), transparent);
          animation: flow-vertical 2.5s infinite linear;
        }
        @keyframes drive-horizontal {
          0% { left: 0%; opacity: 0; transform: scale(0.8); }
          10% { opacity: 1; transform: scale(1); }
          90% { opacity: 1; transform: scale(1); }
          100% { left: calc(100% - 24px); opacity: 0; transform: scale(0.8); }
        }
        @keyframes drive-vertical {
          0% { top: 0%; opacity: 0; transform: scale(0.8); }
          10% { opacity: 1; transform: scale(1); }
          90% { opacity: 1; transform: scale(1); }
          100% { top: calc(100% - 24px); opacity: 0; transform: scale(0.8); }
        }
        .animate-drive-horizontal {
          position: absolute;
          animation: drive-horizontal 2.5s infinite linear;
        }
        .animate-drive-vertical {
          position: absolute;
          animation: drive-vertical 2.5s infinite linear;
        }
      `}</style>
      <header className="bg-surface/80 backdrop-blur-md border-b border-border sticky top-0 z-50 transition-all">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <Link href="/" className="p-2 hover:bg-gray-100 rounded-full transition-colors" title="Kembali ke Beranda">
              <ArrowLeft className="w-5 h-5 text-text-primary" />
            </Link>
            <span className="truncate font-semibold text-base text-text-primary sm:text-lg"><span className="hidden sm:inline">Daftar </span>Pesanan Saya</span>
            {totalUnreadCount > 0 && (
              <span
                className="inline-flex min-w-6 shrink-0 items-center justify-center rounded-full bg-brand-primary px-2 py-1 text-xs font-bold text-white shadow-sm"
                aria-label={`${totalUnreadCount} notifikasi baru`}
                title={`${totalUnreadCount} notifikasi baru`}
              >
                {totalUnreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleDarkMode}
              className="relative hidden h-10 w-10 items-center justify-center rounded-full p-2 transition-colors hover:bg-black/10 dark:hover:bg-white/10 sm:flex"
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
              <>
                <Link
                  href="/profile"
                  className="hidden h-10 w-10 items-center justify-center rounded-full p-2 text-text-secondary transition-colors hover:bg-brand-primary/10 hover:text-brand-primary sm:flex"
                  title="Profil Akun"
                >
                  <User className="w-5 h-5" />
                </Link>
                <button 
                  onClick={handleLogout}
                  className="p-2 rounded-full text-status-error hover:bg-status-error/10 transition-colors flex items-center justify-center w-10 h-10"
                  title="Keluar / Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-6 max-w-4xl pb-24 md:pb-12">
        <AnimatePresence>
          {checkoutNoticeCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="mb-6 flex items-start gap-3 rounded-2xl border border-status-success/30 bg-status-success/10 p-4 shadow-sm sm:items-center"
              role="status"
            >
              <CheckCircle className="mt-0.5 h-6 w-6 shrink-0 text-status-success sm:mt-0" />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-text-primary">Checkout berhasil</p>
                <p className="mt-0.5 text-sm text-text-secondary">
                  <strong className="text-status-success">{checkoutNoticeCount} produk</strong> telah masuk ke daftar pesanan dan menunggu pembayaran.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCheckoutNoticeCount(0)}
                className="rounded-full p-1.5 text-text-secondary transition-colors hover:bg-black/5 hover:text-text-primary dark:hover:bg-white/10"
                aria-label="Tutup notifikasi checkout"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Tabs */}
        {user && (
          <div className="mb-6 grid w-full grid-cols-3 border-b border-border" role="tablist" aria-label="Navigasi pesanan">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'orders'}
              onClick={() => setActiveTab('orders')}
              className={`relative flex min-w-0 items-center justify-center gap-1 border-b-2 px-1 py-3 text-[11px] font-semibold transition-colors sm:gap-2 sm:px-4 sm:text-sm ${
                activeTab === 'orders'
                  ? 'border-brand-primary text-brand-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <ShoppingBag className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap sm:hidden">Pesanan</span>
              <span className="hidden whitespace-nowrap sm:inline">Pesanan Saya</span>
              {ordersCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-primary px-1 text-[9px] font-bold text-white shadow-sm sm:static sm:h-5 sm:min-w-[20px] sm:px-1.5 sm:text-[10px]">
                  {ordersCount}
                </span>
              )}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'chats'}
              onClick={() => setActiveTab('chats')}
              className={`relative flex min-w-0 items-center justify-center gap-1 border-b-2 px-1 py-3 text-[11px] font-semibold transition-colors sm:gap-2 sm:px-4 sm:text-sm ${
                activeTab === 'chats'
                  ? 'border-brand-primary text-brand-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <MessageCircle className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap sm:hidden">Chat Penjual</span>
              <span className="hidden whitespace-nowrap sm:inline">Chat dengan Penjual</span>
              {chatsCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-primary px-1 text-[9px] font-bold text-white shadow-sm sm:static sm:h-5 sm:min-w-[20px] sm:px-1.5 sm:text-[10px]">
                  {chatsCount}
                </span>
              )}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'tracking'}
              onClick={() => setActiveTab('tracking')}
              className={`relative flex min-w-0 items-center justify-center gap-1 border-b-2 px-1 py-3 text-[11px] font-semibold transition-colors sm:gap-2 sm:px-4 sm:text-sm ${
                activeTab === 'tracking'
                  ? 'border-brand-primary text-brand-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <Truck className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap sm:hidden">Lacak</span>
              <span className="hidden whitespace-nowrap sm:inline">Lacak Pesanan Anda</span>
              {trackingCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-primary px-1 text-[9px] font-bold text-white shadow-sm sm:static sm:h-5 sm:min-w-[20px] sm:px-1.5 sm:text-[10px]">
                  {trackingCount}
                </span>
              )}
            </button>
          </div>
        )}

        {activeTab === 'chats' && filteredLocalOrders.length > 0 && (
          <div className="flex justify-end mb-4">
            <button
              onClick={handleDeleteAllChats}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-status-error bg-status-error/10 hover:bg-status-error/20 border border-status-error/20 rounded-xl transition-all hover-btn cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Hapus Semua Chat
            </button>
          </div>
        )}

        {filteredLocalOrders.length === 0 ? (
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
                <div
                  className="relative z-10 mb-4 mt-6 h-56 w-56 sm:h-64 sm:w-64"
                  role="img"
                  aria-label="Peringatan untuk masuk ke akun"
                >
                  <DotLottieReact
                    src="/animations/danger-icon.lottie"
                    autoplay
                    loop
                    className="h-full w-full"
                  />
                </div>
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
                <div
                  className="relative h-36 w-48 overflow-hidden rounded-3xl md:h-48 md:w-64"
                  role="img"
                  aria-label={activeTab === 'chats' ? "Belum ada riwayat obrolan" : activeTab === 'tracking' ? "Belum ada pesanan untuk dilacak" : "Belum ada riwayat pesanan"}
                >
                  <DotLottieReact
                    src="/animations/no-history.lottie"
                    autoplay
                    loop
                    className="h-full w-full"
                  />
                </div>
              </div>
              <h3 className="text-h3 text-text-primary mb-2">
                {activeTab === 'chats' ? "Belum Ada Percakapan" : activeTab === 'tracking' ? "Belum Ada Pesanan yang Dilacak" : "Anda Belum Membuat Pesanan"}
              </h3>
              <p className="text-text-secondary mb-6">
                {activeTab === 'chats' 
                  ? "Hubungi penjual untuk bertanya tentang produk atau melakukan pemesanan pre-sales." 
                  : activeTab === 'tracking'
                  ? "Pantau status pesanan aktif Anda di sini mulai dari pembayaran hingga barang sampai."
                  : "Mulai pesan makanan dan minuman UMKM favoritmu sekarang!"}
              </p>
              <Link href="/" className="btn-primary py-2.5 px-8 font-medium">
                {activeTab === 'chats' ? "Mulai Bertanya" : "Pesan Sekarang"}
              </Link>
            </div>
          )
        ) : activeTab === 'tracking' ? (
          <div className="flex flex-col gap-6">
            {filteredLocalOrders.map((order) => {
              const steps = [
                { label: 'Pesanan Dibuat', completed: true, date: order.createdAt },
                { label: 'Menunggu Konfirmasi Penjual', completed: order.status !== 'waiting_verification', active: order.status === 'waiting_verification', date: '' },
                { label: 'Menunggu Pembayaran', completed: !!order.paymentId, active: order.status === 'verified' && !order.paymentId, date: order.paymentId ? 'Telah Dibayar' : '' },
                { label: 'Verifikasi Pembayaran', completed: order.status === 'processing' || order.status === 'completed', active: order.status === 'verified' && !!order.paymentId, date: '' },
                { label: 'Diproses Penjual', completed: order.status === 'processing' || order.status === 'completed', active: order.status === 'processing', date: '' },
                { label: 'Barang sedang Dikirim', completed: order.status === 'completed', active: order.status === 'processing', date: '' },
                { label: 'Pesanan Selesai / Sampai', completed: order.status === 'completed', active: false, date: order.ratedAt || '' }
              ];

              return (
                <div key={order.orderId} className="bg-base border border-border rounded-2xl overflow-hidden shadow-sm p-5 hover:border-brand-primary/30 transition-colors">
                  <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
                    <div>
                      <h3 className="font-semibold text-text-primary text-base sm:text-lg">{order.productName}</h3>
                      <p className="text-xs sm:text-sm text-text-secondary mt-1">Toko: <span className="font-medium text-text-primary">{order.storeName || 'Toko UMKM'}</span></p>
                    </div>
                    <span className="text-[10px] sm:text-xs font-bold text-brand-primary bg-brand-primary/10 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full">
                      {order.orderId}
                    </span>
                  </div>
                  
                  {/* MOBILE & TABLET: Vertical Timeline */}
                  <div className="relative lg:hidden pb-4 pt-4">
                    <div className="flex flex-col gap-6 sm:gap-8 relative z-10">
                      {steps.map((step, idx) => {
                        const isLast = idx === steps.length - 1;
                        const nextStep = steps[idx + 1];
                        const isLineActive = nextStep?.active;
                        const isLineCompleted = nextStep?.completed;
                        
                        return (
                          <div key={idx} className={`relative flex items-start gap-4 sm:gap-6 ${!step.completed && !step.active ? 'opacity-50 grayscale' : ''}`}>
                            {!isLast && (
                              <>
                                <div className={`absolute top-[32px] sm:top-[40px] left-[14px] sm:left-[18px] w-1 -bottom-6 sm:-bottom-8 rounded-full overflow-hidden ${isLineCompleted ? 'bg-brand-primary' : 'bg-gray-200 dark:bg-gray-700'}`}>
                                  {isLineActive && <div className="w-full h-full animate-flow-vertical"></div>}
                                </div>
                                {isLineActive && nextStep?.label === 'Barang sedang Dikirim' && (
                                  <div className="absolute top-[32px] sm:top-[40px] left-[14px] sm:left-[18px] w-1 -bottom-6 sm:-bottom-8 z-20 pointer-events-none">
                                    <div className="w-5 h-5 sm:w-6 sm:h-6 animate-drive-vertical text-brand-primary bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-md border border-border absolute -left-[8px] sm:-left-[10px]">
                                      <Truck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                            <div className={`relative z-10 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 ring-4 ring-base transition-all ${step.completed ? 'bg-brand-primary text-white shadow-md' : step.active ? 'bg-brand-primary/10 border-2 border-brand-primary text-brand-primary ring-brand-primary/20' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                              {step.completed ? <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" /> : <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-current"></div>}
                            </div>
                            <div className="flex flex-col pt-1 sm:pt-1.5">
                              <span className={`text-sm sm:text-base font-bold ${step.active ? 'text-brand-primary' : step.completed ? 'text-text-primary' : 'text-text-secondary'}`}>{step.label}</span>
                              {step.date && <span className="text-[11px] sm:text-xs text-text-secondary mt-1">{typeof step.date === 'string' ? step.date : new Date(step.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* DESKTOP: Horizontal Timeline */}
                  <div className="hidden lg:block w-full pb-8 pt-4 relative">
                    <div className="flex flex-row justify-between w-full relative z-10">
                      {steps.map((step, idx) => {
                        const isLast = idx === steps.length - 1;
                        const nextStep = steps[idx + 1];
                        const isLineActive = nextStep?.active;
                        const isLineCompleted = nextStep?.completed;
                        
                        return (
                          <div key={idx} className={`relative flex flex-col items-center flex-1 ${!step.completed && !step.active ? 'opacity-50 grayscale' : ''}`}>
                            {!isLast && (
                              <>
                                <div className={`absolute top-[18px] left-[50%] w-full h-1 rounded-full overflow-hidden ${isLineCompleted ? 'bg-brand-primary' : 'bg-gray-200 dark:bg-gray-700'}`}>
                                  {isLineActive && <div className="w-full h-full animate-flow-horizontal"></div>}
                                </div>
                                {isLineActive && nextStep?.label === 'Barang sedang Dikirim' && (
                                  <div className="absolute top-[18px] left-[50%] w-full h-1 z-20 pointer-events-none">
                                    <div className="w-6 h-6 animate-drive-horizontal text-brand-primary bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-md border border-border absolute -top-[10px]">
                                      <Truck className="w-3.5 h-3.5" />
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                            <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ring-4 ring-base transition-all ${step.completed ? 'bg-brand-primary text-white shadow-md' : step.active ? 'bg-brand-primary/10 border-2 border-brand-primary text-brand-primary ring-brand-primary/20' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                              {step.completed ? <CheckCircle className="w-5 h-5" /> : <div className="w-2.5 h-2.5 rounded-full bg-current"></div>}
                            </div>
                            <div className="flex flex-col items-center mt-4 text-center px-2">
                              <span className={`text-sm font-bold ${step.active ? 'text-brand-primary' : step.completed ? 'text-text-primary' : 'text-text-secondary'}`}>{step.label}</span>
                              {step.date && <span className="text-xs text-text-secondary mt-1.5">{typeof step.date === 'string' ? step.date : new Date(step.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLocalOrders.map((order) => {
              const isWaitingPayment = !order.paymentId;
              const isPendingVerif = order.paymentId && order.paymentStatus === 'pending';
              const isVerified = order.paymentId && order.paymentStatus === 'approved';
              
              const clearQtyDraft = () => {
                setQtyDrafts(prev => {
                  if (!(order.orderId in prev)) return prev;

                  const next = { ...prev };
                  delete next[order.orderId];
                  return next;
                });
              };

              const updateQty = async (requestedQty: number) => {
                const minAllowed = order.minQty || 1;
                const newQty = requestedQty;

                if (!Number.isSafeInteger(newQty)) {
                  clearQtyDraft();
                  return;
                }

                if (newQty === order.qty) {
                  clearQtyDraft();
                  return;
                }

                if (newQty < minAllowed) {
                  clearQtyDraft();
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

                if (order.maxQty && newQty > order.maxQty) {
                  clearQtyDraft();
                  Swal.fire({
                    icon: 'warning',
                    title: 'Batas Maksimal',
                    text: `Maksimal pemesanan adalah ${order.maxQty} porsi.`,
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
                clearQtyDraft();

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

              const quantityInputValue = qtyDrafts[order.orderId] ?? String(order.qty);
              const quantityBaseValue = quantityInputValue ? Number(quantityInputValue) : order.qty;
              const orderUnitPrice = order.qty > 0 ? order.totalPrice / order.qty : 0;
              const draftQuantity = Number(quantityInputValue);
              const displayedTotalPrice = quantityInputValue && Number.isSafeInteger(draftQuantity) && draftQuantity > 0
                ? orderUnitPrice * draftQuantity
                : order.totalPrice;
              const isQuantityLocked = order.status === 'completed' || order.status === 'cancelled' || !!order.paymentId;
              
              return (
                <div key={order.orderId} className="card p-0 border border-border overflow-hidden bg-surface">
                  <div className="p-4 border-b border-border bg-base flex justify-between items-center">
                    <span className="text-xs font-mono text-text-secondary">
                      {order.status === 'chat_only' ? `Chat dengan ${order.storeName || 'Toko UMKM'}` : order.orderId}
                    </span>
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
                        {order.selectedVariant && (
                          <p className="mb-1 text-sm font-semibold text-brand-primary">
                            Varian: {order.selectedVariant}
                            {order.selectedVariantPrice !== null && order.selectedVariantPrice !== undefined
                              ? ` · Rp ${order.selectedVariantPrice.toLocaleString('id-ID')}`
                              : ''}
                          </p>
                        )}
                        {order.processingTime && order.status !== 'chat_only' && (
                          <p className="text-sm text-text-secondary mb-1">
                            Waktu Proses: <span className="font-medium text-text-primary">{order.processingTime}</span>
                          </p>
                        )}
                        {order.status !== 'chat_only' && (
                          <>
                            <p className="text-sm text-brand-primary font-semibold mb-2">Rp {orderUnitPrice.toLocaleString('id-ID')} / Porsi</p>
                            <div className="flex items-center gap-3 mt-1.5">
                              <p className="text-sm font-medium">Jumlah:</p>
                              <div className={`flex items-center border border-border rounded-lg bg-base overflow-hidden focus-within:border-brand-primary focus-within:ring-2 focus-within:ring-brand-primary/20 ${isQuantityLocked ? 'opacity-50 bg-gray-100 dark:bg-gray-800' : ''}`}>
                                <button
                                  type="button"
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={() => void updateQty(quantityBaseValue - 1)}
                                  disabled={isQuantityLocked}
                                  className="px-2.5 py-1 text-text-secondary hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                                  aria-label={`Kurangi jumlah ${order.productName}`}
                                >
                                  -
                                </button>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  autoComplete="off"
                                  value={quantityInputValue}
                                  disabled={isQuantityLocked}
                                  onChange={(event) => {
                                    const digitsOnly = event.target.value.replace(/\D/g, '');
                                    setQtyDrafts(prev => ({ ...prev, [order.orderId]: digitsOnly }));
                                  }}
                                  onBlur={(event) => {
                                    const value = event.currentTarget.value;
                                    if (!value) {
                                      clearQtyDraft();
                                      return;
                                    }

                                    void updateQty(Number(value));
                                  }}
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter') event.currentTarget.blur();
                                  }}
                                  className="w-12 border-x border-border bg-transparent px-1 py-1 text-center text-sm font-semibold text-text-primary outline-none disabled:cursor-not-allowed"
                                  aria-label={`Jumlah porsi ${order.productName}`}
                                />
                                <button
                                  type="button"
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={() => void updateQty(quantityBaseValue + 1)}
                                  disabled={isQuantityLocked}
                                  className="px-2.5 py-1 text-text-secondary hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                                  aria-label={`Tambah jumlah ${order.productName}`}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Catatan Tambahan — full width row */}
                  {order.status !== 'chat_only' && (
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
                  )}

                  {order.status === 'completed' && (
                    <div className="border-t border-border px-5 py-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-bold text-text-primary">Beri Rating Produk</p>
                          <p className="mt-0.5 text-xs text-text-secondary">
                            {order.rating ? `Rating Anda: ${order.rating} dari 5 bintang. Tap untuk mengubah.` : 'Pilih 1 sampai 5 bintang untuk produk ini.'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1" role="group" aria-label={`Rating untuk ${order.productName}`}>
                          {[1, 2, 3, 4, 5].map((value) => {
                            const isActive = value <= (order.rating || 0);
                            const isLoading = ratingLoadingOrderId === order.orderId;
                            return (
                              <button
                                key={value}
                                type="button"
                                onClick={() => handleProductRating(order.orderId, order.productName, value)}
                                disabled={isLoading}
                                aria-label={`Beri ${value} bintang untuk ${order.productName}`}
                                aria-pressed={order.rating === value}
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-amber-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 disabled:cursor-wait disabled:opacity-60 dark:hover:bg-amber-500/10"
                              >
                                <Star className={`h-7 w-7 transition-all ${isActive ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-slate-300 hover:text-amber-400 dark:text-slate-600'}`} />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      {ratingLoadingOrderId === order.orderId && (
                        <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-brand-primary" role="status">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Menyimpan rating...
                        </p>
                      )}
                    </div>
                  )}

                  <div className={`px-5 pb-5 flex flex-col sm:flex-row items-start sm:items-center ${order.status === 'chat_only' ? 'justify-end' : 'justify-between'} gap-4 border-t border-border pt-4`}>
                    {order.status !== 'chat_only' && (
                      <div>
                        <p className="text-xs text-text-secondary font-medium">Total Harga</p>
                        <p className="font-bold text-lg text-brand-primary">Rp {displayedTotalPrice.toLocaleString('id-ID')}</p>
                      </div>
                    )}
                    
                    {(() => {
                      const isWaitingPayment = order.status === 'waiting_verification' && !order.paymentId;
                      const isPendingVerif = order.status === 'waiting_verification' && !!order.paymentId;
                        const isVerified = order.status === 'verified';
                        const isCompleted = order.status === 'completed';
                        const isCancelled = order.status === 'cancelled';
                        const isChatOnly = order.status === 'chat_only';

                        return (

                          <div className="w-full flex flex-col items-end gap-2">
                            {isChatOnly && (
                              <span className="inline-block px-3 py-1 bg-brand-primary/10 text-brand-primary rounded-full text-xs font-bold w-full sm:w-auto text-center">Tanya Produk / Pre-sales</span>
                            )}
                            {isWaitingPayment && !isChatOnly && (
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
                              <div className="flex flex-col items-center sm:items-end gap-1.5 w-full sm:w-auto">
                                <span className="px-3 py-1 bg-status-error/10 text-status-error rounded-full text-xs font-bold flex items-center gap-1 w-full sm:w-auto justify-center">
                                  <XCircle className="w-3.5 h-3.5" /> Dibatalkan
                                </span>
                                {order.cancelReason && (
                                  <span className="text-[10px] text-text-secondary pr-1 italic text-center sm:text-right max-w-[200px] line-clamp-2" title={order.cancelReason}>
                                    "{order.cancelReason}"
                                  </span>
                                )}
                              </div>
                            )}

                            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto mt-1">
                              <button 
                                onClick={() => handleOpenChat(order.orderId, order.storeName || 'Toko UMKM', order.productName, order.sellerId)}
                                className="relative btn-outline border-brand-primary/40 text-brand-primary hover:bg-brand-primary/10 hover:border-brand-primary py-1.5 px-3 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 w-full sm:w-auto"
                              >
                                <MessageCircle className="w-3.5 h-3.5" /> Chat
                                {(order.unreadCount || 0) > 0 && (
                                  <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-primary px-1 text-[9px] font-bold text-white shadow-sm ring-2 ring-surface">
                                    {order.unreadCount}
                                  </span>
                                )}
                              </button>

                              {isChatOnly && (
                                <button
                                  onClick={() => handleDeleteChatSection(order.orderId, order.storeName || 'Toko UMKM')}
                                  className="btn-outline border-status-error/40 text-status-error hover:bg-status-error/10 hover:border-status-error py-1.5 px-3 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 w-full sm:w-auto cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Hapus Chat
                                </button>
                              )}
                              
                              {!isChatOnly && (
                                <Link 
                                  href={`/invoice/${order.orderId}`}
                                  className="btn-outline border-gray-300 text-gray-700 hover:bg-gray-50 py-1.5 px-3 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 w-full sm:w-auto"
                                >
                                  <Receipt className="w-3.5 h-3.5" /> Detail Pembayaran
                                </Link>
                              )}
                              
                              {order.deliveryProofUrl && !isChatOnly && (
                                <div className="flex flex-col items-center sm:items-end w-full sm:w-auto">
                                  <span className="text-[10px] text-text-secondary mb-1 font-semibold">Bukti Barang Sampai</span>
                                  <div 
                                    onClick={() => {
                                      Swal.fire({
                                        title: `Bukti Barang Sampai`,
                                        imageUrl: order.deliveryProofUrl as string,
                                        imageWidth: 400,
                                        imageAlt: 'Bukti Barang Sampai',
                                        confirmButtonText: 'Tutup',
                                        confirmButtonColor: '#ff5c35',
                                        customClass: {
                                          popup: 'bg-surface text-text-primary rounded-xl',
                                          title: 'text-text-primary text-lg'
                                        }
                                      });
                                    }}
                                    className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-border cursor-pointer hover:opacity-80 transition-opacity shadow-sm group"
                                  >
                                    <img src={order.deliveryProofUrl} alt="Bukti Delivery" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                      <FileImage className="w-4 h-4 text-white" />
                                    </div>
                                  </div>
                                </div>
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
      <QRScannerModal isOpen={isQRScannerOpen} onClose={() => setIsQRScannerOpen(false)} />

      {/* Mobile Bottom Navigation Bar (Orders Page) */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-border px-2 py-2 flex justify-between items-end pb-8 shadow-[0_-4px_15px_rgba(0,0,0,0.05)] text-[10px] font-medium rounded-t-2xl">
        <div className="flex w-[40%] justify-around">
          <Link 
            href="/" 
            prefetch={true}
            onNavigate={() => setBottomNavLoading('home')}
            aria-busy={bottomNavLoading === 'home'}
            className={`flex flex-col items-center gap-1.5 w-1/2 transition-colors pb-2 ${bottomNavLoading === 'home' ? 'text-brand-primary font-semibold' : 'text-text-secondary hover:text-brand-primary'}`}
          >
            {bottomNavLoading === 'home' ? (
              <Loader2 className="w-6 h-6 stroke-[1.8] animate-spin" />
            ) : (
              <Home className="w-6 h-6 stroke-[1.5]" />
            )}
            <span>{bottomNavLoading === 'home' ? 'Membuka' : 'Beranda'}</span>
          </Link>
          
          <Link 
            href="/#katalog" 
            prefetch={true}
            onNavigate={() => setBottomNavLoading('catalog')}
            aria-busy={bottomNavLoading === 'catalog'}
            className={`flex flex-col items-center gap-1.5 w-1/2 transition-colors pb-2 ${bottomNavLoading === 'catalog' ? 'text-brand-primary font-semibold' : 'text-text-secondary hover:text-brand-primary'}`}
          >
            {bottomNavLoading === 'catalog' ? (
              <Loader2 className="w-6 h-6 stroke-[1.8] animate-spin" />
            ) : (
              <ShoppingBag className="w-6 h-6 stroke-[1.5]" />
            )}
            <span>{bottomNavLoading === 'catalog' ? 'Membuka' : 'Belanja'}</span>
          </Link>
        </div>
        
        <div className="w-[20%] flex flex-col justify-end items-center relative pb-2 h-full">
          <div className="absolute bottom-6 flex justify-center w-full">
            <button 
              onClick={() => setIsQRScannerOpen(true)}
              className="w-14 h-14 rounded-full bg-brand-primary text-white flex items-center justify-center shadow-lg hover:bg-brand-primary-hover transition-all transform hover:scale-105"
            >
              <ScanLine className="w-7 h-7 stroke-[1.5]" />
            </button>
          </div>
          <span className="text-text-secondary mt-1">QRIS</span>
        </div>
        
        <div className="flex w-[40%] justify-around">
          <button 
            className="flex flex-col items-center gap-1.5 w-1/2 text-brand-primary font-semibold pb-2"
          >
            <FileText className="w-6 h-6 stroke-[1.5] fill-brand-primary/10 stroke-brand-primary" />
            <span>Pesanan</span>
          </button>
          
          {user ? (
            <Link 
              href="/profile"
              className="flex flex-col items-center gap-1.5 w-1/2 text-text-secondary hover:text-brand-primary transition-colors pb-2"
            >
              <User className="w-6 h-6 stroke-[1.5]" />
              <span>Akun</span>
            </Link>
          ) : (
            <Link 
              href="/login"
              className="flex flex-col items-center gap-1.5 w-1/2 text-text-secondary hover:text-brand-primary transition-colors pb-2"
            >
              <User className="w-6 h-6 stroke-[1.5]" />
              <span>Masuk</span>
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}
