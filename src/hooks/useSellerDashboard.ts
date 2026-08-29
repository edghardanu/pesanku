// ============================================================
//  src/hooks/useSellerDashboard.ts
//  Custom hook untuk state & logic utama Seller Dashboard
// ============================================================
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Swal from 'sweetalert2';
import { OrderItem, SellerProfile } from '@/types';
import { useDarkMode } from '@/hooks';

type TabType = 'pesanan_masuk' | 'chat_pembeli' | 'produk' | 'promosi' | 'keuangan' | 'pengaturan' | 'pesanan_dikembalikan';

interface UseSellerDashboardOptions {
  profile?: SellerProfile | null;
  userEmail?: string;
  userName?: string;
  initialSellerOrders?: OrderItem[];
  initialProducts?: {
    id: string;
    name: string;
    price: number;
    imageUrl: string | null;
    description: string | null;
    preorderMinQty: number | null;
    currentQty: number | null;
    status: string | null;
    deadlineDate: Date | null;
    processingTime?: string | null;
    batchCategory?: string | null;
    maxOrderQty?: number | null;
    minOrderQty?: number | null;
  }[];
}

/**
 * Hook yang mengelola seluruh state dan side effects untuk Seller Dashboard.
 * Memisahkan logic dari tampilan UI.
 */
export function useSellerDashboard({
  profile,
  userEmail = '',
  userName = '',
  initialSellerOrders = [],
  initialProducts = [],
}: UseSellerDashboardOptions) {
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  // ── Tab navigation ─────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabType>('produk');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleTabChange = useCallback((tab: TabType) => {
    if (tab === activeTab) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveTab(tab);
      setIsTransitioning(false);
    }, 150);
    setIsMobileSidebarOpen(false);
  }, [activeTab]);

  // ── Orders ─────────────────────────────────────────────
  const [sellerOrders, setSellerOrders] = useState<OrderItem[]>(initialSellerOrders);
  const [searchQueryPesanan, setSearchQueryPesanan] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setSellerOrders(initialSellerOrders), 0);
    return () => window.clearTimeout(timer);
  }, [initialSellerOrders]);

  // ── Products ───────────────────────────────────────────
  const [localProducts, setLocalProducts] = useState(initialProducts);

  // ── Notifications ──────────────────────────────────────
  const [notifications, setNotifications] = useState({
    newOrders: [] as OrderItem[],
    unreadChats: [] as OrderItem[],
    chatThreads: [] as OrderItem[],
  });
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isNotifDesktopOpen, setIsNotifDesktopOpen] = useState(false);
  const isInitialLoad = useRef(true);

  // ── Settings form ──────────────────────────────────────
  const [formData, setFormData] = useState({
    storeName: profile?.storeName || '',
    address: profile?.address || '',
    category: profile?.category || '',
    bankAccount: profile?.bankAccount || '',
    ipaymuVa: profile?.ipaymuVa || '',
    description: profile?.description || '',
    logoUrl: profile?.logoUrl || '',
    email: userEmail,
    oldPassword: '',
    password: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // ── Polling: products + notifications + orders ─────────
  useEffect(() => {
    let abortController: AbortController | null = null;

    const fetchData = async () => {
      abortController?.abort();
      abortController = new AbortController();
      const { signal } = abortController;

      try {
        const [prodRes, notifRes, ordersRes] = await Promise.all([
          fetch(`/api/products?t=${Date.now()}`, { cache: 'no-store', signal }),
          fetch(`/api/seller/notifications?t=${Date.now()}`, { cache: 'no-store', signal }),
          fetch(`/api/seller/orders?t=${Date.now()}`, { cache: 'no-store', signal }),
        ]);

        if (prodRes.ok) {
          const data = await prodRes.json();
          if (data.products) setLocalProducts(data.products);
        }

        if (ordersRes.ok) {
          const data = await ordersRes.json();
          if (data.orders) {
            setSellerOrders(prev => {
              const hasChange = data.orders.some((newOrder: { id: string; status: string | null }) => {
                const existing = prev.find(o => o.id === newOrder.id);
                return !existing || existing.status !== newOrder.status;
              });
              return hasChange ? data.orders : prev;
            });
          }
        }

        if (notifRes.ok) {
          const data = await notifRes.json();
          setNotifications(prev => {
            const newOrders = data.newOrders || [];
            const unreadChats = data.unreadChats || [];

            if (!isInitialLoad.current) {
              if (newOrders.length > prev.newOrders.length) {
                if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification('Pesanan Baru Masuk!', { body: 'Anda mendapat pesanan baru.' });
                }
                Swal.fire({
                  toast: true,
                  position: 'top-end',
                  icon: 'info',
                  title: 'Pesanan Baru Masuk!',
                  showConfirmButton: false,
                  timer: 5000,
                  timerProgressBar: true,
                });
                try {
                  const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                  audio.volume = 0.5;
                  audio.play().catch(() => {});
                } catch {}
              }

              if (unreadChats.length > prev.unreadChats.length) {
                if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification('Pesan Baru!', { body: 'Ada pesan baru dari pembeli.' });
                }
                Swal.fire({
                  toast: true,
                  position: 'top-end',
                  icon: 'info',
                  title: 'Pesan Baru dari Pembeli!',
                  showConfirmButton: false,
                  timer: 5000,
                  timerProgressBar: true,
                });
                try {
                  const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                  audio.volume = 0.5;
                  audio.play().catch(() => {});
                } catch {}
              }
            }

            const chatThreads = data.chatThreads || [];
            if (
              newOrders.length === prev.newOrders.length &&
              unreadChats.length === prev.unreadChats.length &&
              chatThreads.length === prev.chatThreads.length
            ) {
              return prev;
            }
            return { newOrders, unreadChats, chatThreads };
          });

          setTimeout(() => { isInitialLoad.current = false; }, 500);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      }
    };

    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }

    fetchData();
    const interval = setInterval(fetchData, 15_000);
    return () => {
      clearInterval(interval);
      abortController?.abort();
    };
  }, []);

  // ── Mark notifications as read on tab open ─────────────
  useEffect(() => {
    if (activeTab === 'pesanan_masuk' && notifications.newOrders.length > 0) {
      const orderIds = notifications.newOrders.map((o: OrderItem) => o.id);
      fetch('/api/seller/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds }),
      }).catch(() => {});
      setNotifications(prev => ({ ...prev, newOrders: [] }));
    }
  }, [activeTab, notifications.newOrders]);

  // ── Save profile ───────────────────────────────────────
  const handleSaveProfile = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage('');
    try {
      const res = await fetch('/api/seller/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setSaveMessage('Profil berhasil disimpan!');
      } else {
        const data = await res.json();
        setSaveMessage(data.error || 'Gagal menyimpan profil.');
      }
    } catch {
      setSaveMessage('Terjadi kesalahan koneksi saat menyimpan profil.');
    } finally {
      setIsSaving(false);
    }
  }, [formData]);

  // ── Total notif badge ──────────────────────────────────
  const totalNotifs = notifications.newOrders.length + notifications.unreadChats.length;

  // ── Filtered orders (search) ───────────────────────────
  const filteredSellerOrders = searchQueryPesanan.trim()
    ? sellerOrders.filter(o =>
        o.id.toLowerCase().includes(searchQueryPesanan.toLowerCase()) ||
        (o.buyerName || '').toLowerCase().includes(searchQueryPesanan.toLowerCase()) ||
        (o.productName || '').toLowerCase().includes(searchQueryPesanan.toLowerCase()),
      )
    : sellerOrders;

  return {
    // Dark mode
    isDarkMode,
    toggleDarkMode,
    // Tab
    activeTab,
    handleTabChange,
    isTransitioning,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    // Orders
    sellerOrders,
    setSellerOrders,
    filteredSellerOrders,
    searchQueryPesanan,
    setSearchQueryPesanan,
    incomingCount: sellerOrders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length,
    // Products
    localProducts,
    setLocalProducts,
    // Notifications
    notifications,
    isNotifOpen,
    setIsNotifOpen,
    isNotifDesktopOpen,
    setIsNotifDesktopOpen,
    totalNotifs,
    // Settings
    formData,
    setFormData,
    isSaving,
    saveMessage,
    handleSaveProfile,
  };
}
