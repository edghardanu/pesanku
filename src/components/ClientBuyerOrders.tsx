"use client";
import ClientOrderDetail from './ClientOrderDetail';

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, CheckCircle, XCircle, FileImage, CreditCard, LogOut, MessageCircle, UserX, Sun, Moon, Home, ShoppingCart, ShoppingBag, FileText, User, Printer, Receipt, Pencil, Save, X, Loader2, Star, Trash2, Truck, ScanLine, Search, RotateCcw, Upload, DollarSign } from "lucide-react";
import Swal from "sweetalert2";
import dynamic from "next/dynamic";
const QRScannerModal = dynamic(() => import("@/components/QRScannerModal"), { ssr: false });
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { DotLottieReact } from "@/lib/dotlottie";
import { formatOrderDateTimeWIB, formatChatTimeWIB, WIB_TIMEZONE } from "@/lib/promotionFormatting";
import { AuthUser, BuyerOrderViewItem, ChatMessage } from "@/types";
import ChatInterface from "@/components/ChatInterface";
import { useDarkMode } from "@/hooks";

export default function ClientBuyerOrders({
  orders,
  user,
  checkoutCount = 0,
  feeAplikasi = 0,
  feeJasa = 0,
  feeAdmin = 0,
  penaltyPercentage = 0,
}: {
  orders: BuyerOrderViewItem[];
  user?: AuthUser | null;
  checkoutCount?: number;
  feeAplikasi?: number;
  feeJasa?: number;
  feeAdmin?: number;
  penaltyPercentage?: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  const [localOrders, setLocalOrders] = useState<BuyerOrderViewItem[]>(orders);
  const [bottomNavLoading, setBottomNavLoading] = useState<'home' | 'catalog' | null>(null);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [checkoutNoticeCount, setCheckoutNoticeCount] = useState(checkoutCount);
  const [ratingLoadingOrderId, setRatingLoadingOrderId] = useState<string | null>(null);
  const hasShownCheckoutNotice = useRef(false);
  const [activeTab, setActiveTab] = useState<'orders' | 'tracking'>('orders');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [activeReturnOrder, setActiveReturnOrder] = useState<BuyerOrderViewItem | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [returnPhoto, setReturnPhoto] = useState<string | null>(null);
  const [returnBankCode, setReturnBankCode] = useState("");
  const [returnBankAccount, setReturnBankAccount] = useState("");
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);
  const [cancelledExpiredOrderIds, setCancelledExpiredOrderIds] = useState<string[]>([]);
  const [selectedChatOrderId, setSelectedChatOrderId] = useState<string | null>(null);

  useEffect(() => {
    const openChatOrderId = searchParams.get('openChat');
    if (openChatOrderId && selectedChatOrderId !== openChatOrderId) {
      const order = orders.find(o => o.orderId === openChatOrderId);
      const productName = order ? order.productName : searchParams.get('productName');

      if (productName) {
        setActiveTab('orders');
        setSelectedOrderId(openChatOrderId);
      }
    }
  }, [searchParams, orders, selectedChatOrderId]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      Swal.fire({
        icon: 'error',
        title: 'Ukuran file terlalu besar',
        text: 'Maksimum ukuran foto adalah 2MB.',
        confirmButtonColor: '#ff5c35'
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setReturnPhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const filteredLocalOrders = localOrders.filter(o => {
    if (cancelledExpiredOrderIds.includes(o.orderId)) return false;
    if (activeTab === 'tracking' && o.status === 'cancelled') return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchStore = o.storeName?.toLowerCase().includes(q) || false;
      const matchProduct = o.productName?.toLowerCase().includes(q) || false;
      const matchId = o.orderId.toLowerCase().includes(q) || false;
      if (!matchStore && !matchProduct && !matchId) return false;
    }

    return true;
  });

  // Untuk tab chats, pisahkan chat_only dan order biasa yg ada pesan baru dari seller
  const chatOnlyOrders = filteredLocalOrders.filter(o => o.status === 'chat_only');
  const regularOrdersWithChat = filteredLocalOrders.filter(o => o.status !== 'chat_only');


  useEffect(() => {
    setLocalOrders(orders.filter(o => !cancelledExpiredOrderIds.includes(o.orderId)));
  }, [orders, cancelledExpiredOrderIds]);

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [qtyDrafts, setQtyDrafts] = useState<Record<string, string>>({});



  useEffect(() => {
    if (user?.role === 'pembeli') {
      fetch('/api/orders', { method: 'PATCH' }).catch((_err) => { /* ignore */ });
    }
  }, [user]);

  // Poll for real-time order updates
  useEffect(() => {
    if (!user || user.role !== 'pembeli') return;

    let failCount = 0;
    let timeoutId: ReturnType<typeof setTimeout>;
    let abortController: AbortController | null = null;

    const fetchRealtimeOrders = async () => {
      // Skip if the page/tab is backgrounded/hidden
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        const delay = Math.min(15000 * Math.pow(2, Math.max(0, failCount - 1)), 60000);
        timeoutId = setTimeout(fetchRealtimeOrders, delay);
        return;
      }

      // Cancel any previous in-flight request
      abortController?.abort();
      abortController = new AbortController();

      try {
        const res = await fetch(`/api/buyer/orders?t=${Date.now()}`, {
          cache: 'no-store',
          signal: abortController.signal,
        });
        if (res.ok) {
          const data = await res.json();
          if (data.orders) {
            const activeOrders = data.orders.filter(
              (o: BuyerOrderViewItem) => !cancelledExpiredOrderIds.includes(o.orderId)
            );
            setLocalOrders(activeOrders);
          }
        }
        failCount = 0; // reset on success
      } catch (err: unknown) {
        // AbortError is expected on cleanup — not a real error
        if (err instanceof Error && err.name !== 'AbortError') {
          failCount++;
          // fail log suppressed
        }
      }

      // Schedule next poll with exponential back-off capped at 30s for fast real-time update
      const delay = Math.min(3000 * Math.pow(2, Math.max(0, failCount - 1)), 30000);
      timeoutId = setTimeout(fetchRealtimeOrders, delay);
    };

    // Start first poll after initial 3s
    timeoutId = setTimeout(fetchRealtimeOrders, 3000);

    return () => {
      clearTimeout(timeoutId);
      abortController?.abort();
    };
  }, [user, cancelledExpiredOrderIds]);

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
    const checkExpiredOrders = async () => {
      const now = Date.now();
      for (const order of localOrders) {
        const isWaitingPayment = order.status === 'waiting_verification' && !order.paymentId;
        if (isWaitingPayment && order.createdAt) {
          const createdTime = new Date(order.createdAt).getTime();
          const elapsed = Math.floor((now - createdTime) / 1000);

          if (elapsed >= 86400 && !cancelledExpiredOrderIds.includes(order.orderId)) {
            setCancelledExpiredOrderIds(prev => [...prev, order.orderId]);

            // Delete order from localOrders immediately
            setLocalOrders(prev => prev.filter(o => o.orderId !== order.orderId));

            try {
              await fetch('/api/orders/cancel', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: order.orderId }),
              });
              router.refresh();
            } catch (_err) {
              // error suppressed
            }

            Swal.close();

            Swal.fire({
              icon: 'error',
              title: 'Waktu Pembayaran Habis',
              text: `Pesanan dihapus secara otomatis, Silahkan ulangi proses checkout`,
              confirmButtonColor: '#800000',
            });
            break;
          }
        }
      }
    };

    const interval = setInterval(checkExpiredOrders, 1000);
    return () => clearInterval(interval);
  }, [localOrders, cancelledExpiredOrderIds, router]);

  useEffect(() => {
    if (!bottomNavLoading) return;

    const timer = window.setTimeout(() => {
      setBottomNavLoading(null);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [bottomNavLoading]);



  const formatOrderDate = (date: string | Date | null) => {
    if (!date) return 'Tanggal tidak tersedia';
    return formatOrderDateTimeWIB(date);
  };

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
      } catch (_error) {
        // error suppressed
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
      // Optimistic update: ubah status jadi cancelled
      setLocalOrders(prev => prev.map(o => o.orderId === orderId ? { ...o, status: 'cancelled' } : o));

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
    const result = await Swal.fire({
      title: 'Konfirmasi Rating',
      text: `Apakah Anda yakin ingin memberikan ${rating} bintang untuk ${productName}? Rating yang telah diberikan tidak dapat diubah lagi.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Iya',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#94a3b8',
    });

    if (!result.isConfirmed) return;

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


  const handlePayment = async (orderId: string, totalHarga: number, createdAt?: string | Date | null) => {
    if (createdAt) {
      const createdTime = new Date(createdAt).getTime();
      const now = new Date().getTime();
      const elapsed = Math.floor((now - createdTime) / 1000);
      if (elapsed >= 86400) {
        if (!cancelledExpiredOrderIds.includes(orderId)) {
          setCancelledExpiredOrderIds(prev => [...prev, orderId]);
          setLocalOrders(prev => prev.filter(o => o.orderId !== orderId));
          try {
            await fetch('/api/orders/cancel', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderId }),
            });
            router.refresh();
          } catch (_err) {
            // error suppressed
          }
        }
        Swal.fire({
          icon: 'error',
          title: 'Waktu Pembayaran Habis',
          text: 'Batas waktu pembayaran 24 jam telah habis. Pesanan Anda telah dihapus secara otomatis.',
          confirmButtonColor: '#800000',
        });
        return;
      }
    }



    // Tampilkan loading
    Swal.fire({
      title: 'Menyiapkan Pembayaran...',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); },
    });

    try {
      const res = await fetch('/api/ipaymu/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal membuat pembayaran');
      }

      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        throw new Error('URL pembayaran tidak tersedia');
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Terjadi kesalahan.';

      if (errMsg.toLowerCase().includes('ipaymu') || errMsg.toLowerCase().includes('invalid ip')) {
        const userMsg = 'Mohon maaf, sistem layanan pembayaran sedang mengalami kendala. Silakan coba beberapa saat lagi atau hubungi tim bantuan.';
        const isDev = process.env.NODE_ENV === 'development';

        const diagnosticHtml = isDev ? `
              <div class="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-left border border-dashed border-red-300 dark:border-red-800/50 mt-4">
                <span class="text-[11px] text-red-800 dark:text-red-400 font-bold uppercase tracking-wide">Diagnostic Code (DEV ONLY)</span>
                <p class="text-[13px] text-red-700 dark:text-red-300 mt-1.5 mb-0 font-mono break-all font-medium">${errMsg}</p>
              </div>
        ` : '';

        Swal.fire({
          icon: 'error',
          title: 'Gagal Memproses Pembayaran',
          html: `
            <div class="text-center">
              <p class="mb-0 text-text-secondary text-[15px]">${userMsg}</p>
              ${diagnosticHtml}
            </div>
          `,
          confirmButtonColor: '#800000',
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Gagal Memproses Pembayaran',
          text: errMsg,
          confirmButtonColor: '#800000',
        });
      }
    }
  };

  const autoPayProcessed = useRef(false);
  useEffect(() => {
    const autoPayId = searchParams.get('autoPay');
    if (autoPayId && !autoPayProcessed.current && localOrders.length > 0) {
      autoPayProcessed.current = true;
      const targetOrder = localOrders.find(o => o.orderId === autoPayId);
      if (targetOrder && targetOrder.status === 'waiting_verification') {
        const total = targetOrder.totalPrice + (feeAplikasi || 0) + (feeJasa || 0) + (feeAdmin || 0);
        handlePayment(targetOrder.orderId, total, targetOrder.createdAt);

        // Remove the autoPay param from url so it doesn't refire on reload
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('autoPay');
        window.history.replaceState({}, '', newUrl.toString());
      }
    }
  }, [searchParams, localOrders, feeAplikasi, feeJasa, feeAdmin]);


  // chatsCount: semua unread dari semua order (karena tab chat menghubungkan ke semua percakapan)
  const chatsCount = localOrders.reduce((acc, o) => acc + (o.unreadCount || 0), 0);
  const ordersCount = 0; // Badge unread dipindahkan ke tab Chat
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
                    <Moon className="w-5 h-5 text-brand-primary" />
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

      <main className="container mx-auto px-4 pt-6 pb-24 md:pb-12 transition-all duration-300 max-w-[1500px]">
        {activeReturnOrder ? (
          <div>
            <button
              onClick={() => {
                setActiveReturnOrder(null);
                setReturnReason("");
                setReturnPhoto(null);
              }}
              className="flex items-center gap-2 mb-6 text-text-secondary hover:text-brand-primary transition-colors text-sm font-semibold cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" /> Kembali ke Pesanan
            </button>

            <div className="bg-surface border border-border rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <h2 className="text-xl font-bold mb-6 text-text-primary border-b border-border pb-4">Pengajuan Pengembalian Pesanan</h2>

              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!returnPhoto) {
                  Swal.fire({
                    icon: 'warning',
                    title: 'Foto Bukti Wajib',
                    text: 'Harap unggah foto bukti pengembalian.',
                    confirmButtonColor: '#ff5c35'
                  });
                  return;
                }
                if (!returnReason.trim()) {
                  Swal.fire({
                    icon: 'warning',
                    title: 'Alasan Wajib',
                    text: 'Harap isi alasan pengembalian.',
                    confirmButtonColor: '#ff5c35'
                  });
                  return;
                }

                setIsSubmittingReturn(true);
                try {
                  const res = await fetch('/api/orders/update-status', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      orderId: activeReturnOrder.orderId,
                      status: 'return_pending',
                      returnReason: returnReason,
                      returnProofUrl: returnPhoto,
                      returnBankCode: returnBankCode,
                      returnBankAccount: returnBankAccount
                    })
                  });

                  if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || 'Gagal mengirim pengajuan return');
                  }

                  await Swal.fire({
                    icon: 'success',
                    title: 'Pengajuan Return Terkirim',
                    text: 'Permintaan pengembalian pesanan Anda telah dikirim ke penjual.',
                    confirmButtonText: 'Tutup',
                    confirmButtonColor: '#ff5c35'
                  });

                  window.location.reload();
                } catch (err: any) {
                  Swal.fire({
                    icon: 'error',
                    title: 'Gagal',
                    text: err.message || 'Terjadi kesalahan sistem.',
                    confirmButtonColor: '#ff5c35'
                  });
                } finally {
                  setIsSubmittingReturn(false);
                }
              }} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5 font-bold">Nama Pesanan</label>
                  <input
                    type="text"
                    readOnly
                    value={activeReturnOrder.productName}
                    className="input-field w-full bg-base/50 text-text-secondary border border-border cursor-not-allowed rounded-xl px-4 py-3 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5 font-bold">Jumlah Pesanan</label>
                  <input
                    type="text"
                    readOnly
                    value={`${activeReturnOrder.qty} Porsi`}
                    className="input-field w-full bg-base/50 text-text-secondary border border-border cursor-not-allowed rounded-xl px-4 py-3 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5 font-bold">Waktu Pengajuan (WIB)</label>
                  <input
                    type="text"
                    readOnly
                    value={formatOrderDateTimeWIB(new Date())}
                    className="input-field w-full bg-base/50 text-text-secondary border border-border cursor-not-allowed rounded-xl px-4 py-3 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5 font-bold">Total Harga Pesanan</label>
                  <input
                    type="text"
                    readOnly
                    value={`Rp ${activeReturnOrder.totalPrice.toLocaleString('id-ID')}`}
                    className="input-field w-full bg-base/55 text-text-secondary border border-border cursor-not-allowed rounded-xl px-4 py-3 font-bold text-brand-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5 font-bold">Unggah Foto Bukti Pengembalian <span className="text-status-error">*</span></label>
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl p-6 bg-base hover:border-brand-primary/50 transition-colors relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      required
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    {returnPhoto ? (
                      <div className="flex flex-col items-center">
                        <img src={returnPhoto} alt="Preview Bukti" className="max-h-48 rounded-xl object-contain mb-3" />
                        <p className="text-xs text-brand-primary font-semibold">Ketuk untuk mengganti foto</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <Upload className="w-8 h-8 text-text-secondary mb-2" />
                        <p className="text-sm font-bold text-text-primary mb-1">Pilih File Foto Bukti</p>
                        <p className="text-xs text-text-secondary">Wajib format JPG/PNG, maksimal 2MB.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5 font-bold">Alasan Pengembalian <span className="text-status-error">*</span></label>
                  <textarea
                    required
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    placeholder="Tulis alasan pengembalian pesanan secara detail..."
                    rows={4}
                    className="input-field w-full border border-border bg-base rounded-xl px-4 py-3 focus:border-brand-primary focus:outline-none placeholder-text-secondary text-text-primary"
                  />
                </div>

                <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-xl p-4 space-y-4">
                  <h3 className="font-bold text-sm text-brand-primary mb-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" /> Informasi Rekening Pengembalian Dana
                  </h3>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Nama Bank (Cth: BCA, BRI, BNI) <span className="text-status-error">*</span></label>
                    <input
                      type="text"
                      required
                      value={returnBankCode}
                      onChange={(e) => setReturnBankCode(e.target.value)}
                      placeholder="Masukkan nama bank tujuan"
                      className="input-field w-full text-sm border border-border bg-base rounded-xl px-4 py-2.5 focus:border-brand-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Nomor Rekening & Atas Nama <span className="text-status-error">*</span></label>
                    <input
                      type="text"
                      required
                      value={returnBankAccount}
                      onChange={(e) => setReturnBankAccount(e.target.value)}
                      placeholder="Cth: 1234567890 a/n Budi Santoso"
                      className="input-field w-full text-sm border border-border bg-base rounded-xl px-4 py-2.5 focus:border-brand-primary focus:outline-none"
                    />
                    <p className="text-[10px] text-text-secondary mt-1">Pastikan valid, dana akan ditransfer otomatis melalui sistem iPaymu.</p>
                  </div>
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveReturnOrder(null);
                      setReturnReason("");
                      setReturnPhoto(null);
                    }}
                    className="btn-outline flex-1 py-3 text-sm font-semibold rounded-xl text-center cursor-pointer border border-border text-text-secondary"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReturn}
                    className="btn-primary flex-1 py-3 text-sm font-semibold rounded-xl text-center bg-brand-primary hover:bg-brand-primary-hover text-white transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmittingReturn ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Mengirim...
                      </>
                    ) : (
                      "Kirim Pengajuan"
                    )}
                  </button>
                </div>

                <p className="text-[11px] text-text-secondary mt-2 text-center border-t border-border pt-4">
                  Dengan mengajukan pengembalian, Anda menyetujui <Link href="/refund-policy" className="text-brand-primary hover:underline font-semibold" target="_blank">Kebijakan Pengembalian Dana</Link>.
                </p>
              </form>
            </div>
          </div>
        ) : (
          <>
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

            {/* Navigation Tabs - Lacak Pesanan removed per user request */}
            {user && (
              <div className="mb-6 w-full border-b border-border pb-3" role="heading" aria-label="Pesanan Saya">
                <div className="flex items-center gap-2 px-1 text-sm font-bold text-brand-primary">
                  <ShoppingBag className="h-5 w-5" />
                  <span>Pesanan Saya</span>
                  {ordersCount > 0 && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-primary px-1.5 text-[10px] font-bold text-white shadow-sm ml-2">
                      {ordersCount}
                    </span>
                  )}
                </div>
              </div>
            )}

            {!user ? (
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
            ) : filteredLocalOrders.length === 0 ? (
              <div className="text-center py-20 bg-surface rounded-3xl border border-border mt-8 shadow-sm">
                <div className="mx-auto w-fit relative mb-6 mt-4">
                  <div
                    className="relative h-36 w-48 overflow-hidden rounded-3xl md:h-48 md:w-64"
                    role="img"
                    aria-label={activeTab === 'tracking' ? "Belum ada pesanan untuk dilacak" : "Belum ada riwayat pesanan"}
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
                  {activeTab === 'tracking' ? "Belum Ada Pesanan yang Dilacak" : "Anda Belum Membuat Pesanan"}
                </h3>
                <p className="text-text-secondary mb-6">
                  {activeTab === 'tracking'
                    ? "Pantau status pesanan aktif Anda di sini mulai dari pembayaran hingga barang sampai."
                    : "Mulai pesan makanan dan minuman UMKM favoritmu sekarang!"}
                </p>
                <Link href="/" className="btn-primary py-2.5 px-8 font-medium">
                  {activeTab === 'tracking' ? "Kembali Belanja" : "Pesan Sekarang"}
                </Link>
              </div>
            ) : (
              <div className="flex w-full h-[calc(100vh-140px)] bg-white border border-border sm:rounded-xl shadow-sm overflow-hidden relative">
                {/* SIDEBAR: Order List */}
                <div className={`w-full md:w-[280px] lg:w-[320px] xl:w-[350px] shrink-0 border-r border-border flex flex-col h-full bg-surface-secondary/50 ${selectedOrderId ? 'hidden md:flex' : 'flex'}`}>
                  <div className="p-4 border-b border-border bg-white flex flex-col gap-3 sticky top-0 z-10 shrink-0">
                    <h2 className="font-bold text-lg text-text-primary flex items-center gap-2">
                      <MessageCircle className="w-5 h-5 text-brand-primary" />
                      Chat & Pesanan
                    </h2>
                    <div className="relative relative w-full h-10 bg-base rounded-full flex items-center px-4 shadow-inner border border-border focus-within:ring-2 focus-within:ring-brand-primary/20 focus-within:border-brand-primary transition-all">
                      <Search className="w-4 h-4 text-text-secondary mr-2" />
                      <input
                        type="text"
                        placeholder="Cari pesanan / toko / ID..."
                        className="bg-transparent border-none outline-none w-full text-[13px] text-text-primary placeholder:text-text-secondary"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {(() => {
                      const getStatusPriority = (status: string | null) => {
                        if (!status) return 0;
                        if (status === 'completed') return 6;
                        if (status === 'processing') return 5;
                        if (status === 'verified') return 4;
                        if (status === 'preorder_running') return 4;
                        if (status === 'waiting_verification') return 3;
                        if (status === 'chat_only') return 2;
                        return 1;
                      };

                      const productOrderMap = new Map<string, typeof filteredLocalOrders[0]>();

                      for (const order of filteredLocalOrders) {
                        const key: string = order.productId || order.orderId || '';
                        if (!key) continue;
                        const existing = productOrderMap.get(key);

                        if (!existing) {
                          productOrderMap.set(key, order);
                        } else {
                          const existingPriority = getStatusPriority(existing.status);
                          const currentPriority = getStatusPriority(order.status);

                          if (currentPriority > existingPriority) {
                            productOrderMap.set(key, order);
                          } else if (currentPriority === existingPriority) {
                            const existingTime = existing.createdAt ? new Date(existing.createdAt).getTime() : 0;
                            const currentTime = order.createdAt ? new Date(order.createdAt).getTime() : 0;
                            if (currentTime >= existingTime) {
                              productOrderMap.set(key, order);
                            }
                          }
                        }
                      }

                      return Array.from(productOrderMap.values());
                    })().map((order) => (
                      <div
                        key={order.orderId}
                        onClick={() => setSelectedOrderId(order.orderId)}
                        className={`p-4 justify-between items-start border-b border-border hover:bg-gray-50/80 cursor-pointer transition-colors relative flex gap-3 ${selectedOrderId === order.orderId ? 'bg-brand-primary/5' : ''}`}
                      >
                        {selectedOrderId === order.orderId && <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-primary rounded-r-full"></div>}
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-brand-primary/10 text-brand-primary font-bold text-sm border border-brand-primary/20 shrink-0 select-none shadow-sm">
                          {(order.storeName || 'P').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-0.5">
                            <span className="font-bold text-[13px] text-gray-900 truncate pr-2">{order.storeName || 'Toko UMKM'}</span>
                            <span className="text-[10px] text-gray-500 whitespace-nowrap">{formatOrderDate(order.createdAt).split(',')[0]}</span>
                          </div>
                          <div className="text-[12px] font-medium text-gray-700 truncate mb-1 pr-2">{order.productName}</div>

                          {/* Status Badge */}
                          <div className="flex items-center justify-between mt-2">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${(order.status === 'cancelled' || order.status === 'failed') ? 'bg-red-100 text-red-700'
                              : order.status === 'completed' ? 'bg-green-100 text-green-700'
                                : order.status === 'waiting_verification' ? 'bg-yellow-100 text-yellow-800'
                                  : order.status === 'chat_only' && order.negotiationStatus === 'approved' ? 'bg-emerald-100 text-emerald-700'
                                    : order.status === 'chat_only' && order.negotiationStatus === 'rejected' ? 'bg-red-100 text-red-700'
                                      : order.status === 'chat_only' ? 'bg-sky-100 text-sky-700'
                                        : 'bg-indigo-100 text-indigo-700'
                              }`}>
                              {order.status === 'cancelled' ? 'Batal'
                                : order.status === 'failed' ? 'Batal'
                                  : order.status === 'completed' ? 'Selesai'
                                    : order.status === 'waiting_verification' ? 'Menunggu Pembayaran'
                                      : order.status === 'verified' ? 'Diproses'
                                        : order.status === 'preorder_running' ? 'Diproses'
                                          : order.status === 'processing' ? 'Dikirim'
                                            : order.status === 'chat_only' && order.negotiationStatus === 'approved' ? 'Disetujui'
                                              : order.status === 'chat_only' && order.negotiationStatus === 'rejected' ? 'Ditolak'
                                                : order.status === 'chat_only' ? 'Penawaran'
                                                  : 'Diproses'}
                            </span>
                            {(order.unreadCount || 0) > 0 ? <span className="w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">{(order.unreadCount || 0)}</span> : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* MAIN CONTENT: Order Detail + Chat */}
                <div className={`flex-1 h-full bg-base overflow-y-auto ${!selectedOrderId ? 'hidden md:block' : 'block'} w-full min-w-0 relative`}>
                  {selectedOrderId ? (
                    <div className="w-full h-full min-w-0">
                      {/* Mobile Back Button */}
                      <div className="md:hidden sticky top-0 z-50 bg-white border-b border-gray-200 p-3 shadow-sm shrink-0">
                        <button
                          onClick={() => setSelectedOrderId(null)}
                          className="flex items-center gap-1.5 text-gray-700 font-bold text-sm bg-gray-100 px-3 py-1.5 rounded-md hover:bg-gray-200 transition-colors"
                        >
                          <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar
                        </button>
                      </div>

                      {filteredLocalOrders.filter(o => o.orderId === selectedOrderId).map((order) => (
                        <ClientOrderDetail
                          key={order.orderId}
                          order={order}
                          user={user || null}
                          onNavigateTab={(tab: 'orders' | 'tracking' | 'chats') => { if (tab === 'orders' || tab === 'tracking') setActiveTab(tab); }}
                          onCancelOrder={() => {
                            handleCancelOrder(order.orderId, order.productName);
                          }}
                          feeAplikasi={feeAplikasi}
                          feeJasa={feeJasa}
                          feeAdmin={feeAdmin}
                          penaltyPercentage={penaltyPercentage}

                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-10 bg-neutral-50 h-[calc(100vh-140px)] w-full">
                      <div className="w-24 h-24 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary shadow-sm mb-6 animate-pulse-slow">
                        <MessageCircle className="w-12 h-12" />
                      </div>
                      <h3 className="text-xl font-extrabold text-text-primary mb-2">Pilih Pesanan & Chat</h3>
                      <p className="text-sm text-text-secondary max-w-sm leading-relaxed">
                        Silakan pilih daftar pesanan atau percakapan di sebelah kiri untuk melihat detail pesanan beserta ruang negosiasi Anda dengan penjual.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
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
    </div >
  );
}
