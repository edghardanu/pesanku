"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ShoppingBag, Plus, FileText, Package, DollarSign, Settings, LogOut, Info, X, Upload, Store, Sun, Moon, MessageCircle, User, Menu, Megaphone, Bell, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SellerPreorderCalendar from "@/components/SellerPreorderCalendar";
import SellerPromotionCenter from "@/components/SellerPromotionCenter";
import { validateProductVariants } from "@/lib/productVariants";
import { formatChatTimeWIB, formatShortDateTimeWIB, WIB_TIMEZONE } from "@/lib/promotionFormatting";

import Swal from 'sweetalert2';

type Product = {
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
  variants?: ProductVariant[];
};

import { SellerProfile, OrderItem, ChatMessage, ProductVariant, PromotionOfferItem, PromotionRequestItem } from "@/types";

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

type ClientSellerDashboardProps = {
  userEmail?: string;
  profile?: SellerProfile | null;
  myProducts: Product[];
  activeCount: number;
  waitingCount: number;
  completedCount: number;
  userName: string;
  sellerOrders?: OrderItem[];
  feeAdmin?: number;
  feeAplikasi?: number;
  feeJasa?: number;
  promotionOffers?: PromotionOfferItem[];
  promotionRequests?: PromotionRequestItem[];
};

export default function ClientSellerDashboard({
  profile,
  myProducts,
  activeCount,
  waitingCount,
  completedCount,
  userName,
  userEmail = '',
  sellerOrders: initialSellerOrders = [],
  feeAdmin = 0, feeAplikasi = 0, feeJasa = 0,
  promotionOffers = [],
  promotionRequests = []
}: ClientSellerDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'pesanan_masuk' | 'chat_pembeli' | 'produk' | 'promosi' | 'keuangan' | 'pengaturan'>('produk');
  const [selectedProductIdFilter, setSelectedProductIdFilter] = useState<string | undefined>(undefined);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [sellerOrders, setSellerOrders] = useState<OrderItem[]>(initialSellerOrders);

  useEffect(() => {
    const syncTimer = window.setTimeout(() => setSellerOrders(initialSellerOrders), 0);
    return () => window.clearTimeout(syncTimer);
  }, [initialSellerOrders]);
  
  const incomingCount = sellerOrders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length;
  
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        setIsDarkMode(true);
      } else {
        document.documentElement.classList.remove('dark');
        setIsDarkMode(false);
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

  const [localProducts, setLocalProducts] = useState(myProducts);
  
  const [notifications, setNotifications] = useState({ newOrders: [] as any[], unreadChats: [] as any[], chatThreads: [] as any[] });
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isNotifDesktopOpen, setIsNotifDesktopOpen] = useState(false);

  // Poll for real-time updates on products, notifications, AND seller orders
  useEffect(() => {
    let initialLoad = true;
    const fetchData = async () => {
      try {
        const [prodRes, notifRes, ordersRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/seller/notifications'),
          fetch(`/api/seller/orders?t=${Date.now()}`, { cache: 'no-store' }),
        ]);
        
        if (prodRes.ok) {
          const data = await prodRes.json();
          if (data.products) setLocalProducts(data.products);
        }

        // Sync seller orders — menangkap perubahan status dari pembeli (misal: selesai)
        if (ordersRes.ok) {
          const data = await ordersRes.json();
          if (data.orders) {
            setSellerOrders(prev => {
              // Hanya update jika ada perubahan status (hindari re-render tidak perlu)
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
             
             if (!initialLoad) {
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
                   timer: 4000,
                   timerProgressBar: true
                 });
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
                   timer: 4000,
                   timerProgressBar: true
                 });
               }
             }
             
             return {
                newOrders,
                unreadChats,
                chatThreads: data.chatThreads || []
             };
          });
          initialLoad = false;
        }
      } catch (err) {
        console.error('Error polling data:', err);
      }
    };

    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }

    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  const [formData, setFormData] = useState({
    storeName: profile?.storeName || '',
    address: profile?.address || '',
    category: profile?.category || '',
    bankAccount: profile?.bankAccount || '',
    description: profile?.description || '',
    logoUrl: profile?.logoUrl || '',
    email: userEmail || '',
    oldPassword: '',
    password: ''
  });
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      Swal.fire('Error', 'File harus berupa gambar', 'error');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      Swal.fire('Error', 'Ukuran gambar maksimal 2MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setFormData({ ...formData, logoUrl: event.target.result as string });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleTabChange = (tab: 'pesanan_masuk' | 'chat_pembeli' | 'produk' | 'promosi' | 'keuangan' | 'pengaturan') => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setIsMobileSidebarOpen(false); // Close mobile sidebar on tab change
  };

  useEffect(() => {
    if (activeTab === 'pesanan_masuk' && notifications.newOrders.length > 0) {
      const orderIds = notifications.newOrders.map((o: any) => o.id);
      fetch('/api/seller/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds })
      }).catch(console.error);

      setNotifications(prev => ({ ...prev, newOrders: [] }));
    }
  }, [activeTab, notifications.newOrders]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage('');
    try {
      const res = await fetch('/api/seller/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setSaveMessage('Profil berhasil disimpan!');
      } else {
        const data = await res.json();
        setSaveMessage(data.error || 'Gagal menyimpan profil.');
      }
    } catch (error) {
      setSaveMessage('Terjadi kesalahan koneksi saat menyimpan profil.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: 'Konfirmasi Keluar',
      text: `Apakah Anda ${userName} ingin keluar?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ff5c35', // brand-primary
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Ya',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
      } catch (error) {
        console.error('Logout failed:', error);
      }
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    const result = await Swal.fire({
      title: 'Hapus Produk?',
      text: `Apakah Anda yakin ingin menghapus produk "${name}"? Tindakan ini tidak dapat dibatalkan.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444', // status-error
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/products?id=${id}`, {
          method: 'DELETE'
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || 'Gagal menghapus produk');
        }

        // Update local state for immediate feedback
        setLocalProducts(localProducts.filter(p => p.id !== id));
        router.refresh();

        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Produk berhasil dihapus',
          showConfirmButton: false,
          timer: 3000
        });
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Terjadi kesalahan.';
        Swal.fire('Error', errMsg, 'error');
      }
    }
  };

  const handleUploadDeliveryProof = async (orderId: string) => {
    const { value: file } = await Swal.fire({
      title: 'Upload Bukti Barang Sampai',
      text: 'Pilih foto/gambar bukti barang telah sampai ke pembeli.',
      input: 'file',
      inputAttributes: {
        'accept': 'image/*',
        'aria-label': 'Upload Foto Barang Sampai'
      },
      showCancelButton: true,
      confirmButtonText: 'Upload',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#ff5c35',
      preConfirm: (file) => {
        if (!file) {
          Swal.showValidationMessage('Foto bukti wajib dilampirkan!');
          return false;
        }
        return file;
      }
    });

    if (file) {
      Swal.fire({
        title: 'Mengunggah...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const reader = new FileReader();
      reader.onload = async (e) => {
        const deliveryProofUrl = e.target?.result as string;
        try {
          const res = await fetch('/api/orders/update-status', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId,
              status: 'completed',
              deliveryProofUrl
            })
          });

          const data = await res.json();
          
          if (!res.ok) {
            throw new Error(data.error || 'Terjadi kesalahan saat mengunggah bukti.');
          }

          Swal.fire({
            icon: 'success',
            title: 'Berhasil!',
            text: 'Bukti barang sampai telah berhasil diunggah.',
            confirmButtonColor: '#10b981',
          }).then(() => {
            window.location.reload();
          });
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : 'Terjadi kesalahan.';
          Swal.fire('Gagal!', errMsg, 'error');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadDispatchReceipt = async (orderId: string, currentStatus: string) => {
    const { value: file } = await Swal.fire({
      title: 'Upload Bukti Delivery',
      text: 'Pilih foto/gambar resi atau bukti penyerahan barang ke kurir.',
      input: 'file',
      inputAttributes: {
        'accept': 'image/*',
        'aria-label': 'Upload Foto Bukti Delivery'
      },
      showCancelButton: true,
      confirmButtonText: 'Upload',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#ff5c35',
      preConfirm: (file) => {
        if (!file) {
          Swal.showValidationMessage('Foto bukti wajib dilampirkan!');
          return false;
        }
        return file;
      }
    });

    if (file) {
      Swal.fire({
        title: 'Mengunggah...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const reader = new FileReader();
      reader.onload = async (e) => {
        const dispatchReceiptUrl = e.target?.result as string;
        try {
          const res = await fetch('/api/orders/update-status', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId,
              status: currentStatus, 
              dispatchReceiptUrl
            })
          });

          const data = await res.json();
          
          if (!res.ok) {
            throw new Error(data.error || 'Terjadi kesalahan saat mengunggah bukti.');
          }

          Swal.fire({
            icon: 'success',
            title: 'Berhasil!',
            text: 'Bukti delivery (resi) telah berhasil diunggah.',
            confirmButtonColor: '#10b981',
          }).then(() => {
            window.location.reload();
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

  const handleOpenChat = async (orderId: string, buyerName: string, productName: string) => {
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
      const { messages, status, productId } = await res.json();
      
      const chatHistory: ChatMessage[] = messages || [];

      const hasSellerOpening = chatHistory.some((m: ChatMessage) => m.sender === 'seller' || m.role === 'penjual' || m.role === 'admin');
      if (!hasSellerOpening) {
        const isChatOnly = status === 'chat_only';
        chatHistory.unshift({
          sender: 'seller', // Add this to render on the right side
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
          <button data-product-id="${pId}" class="view-product-calendar-btn w-full ${buttonBg} text-xs font-bold py-1.5 px-3 rounded-lg transition-all text-center flex items-center justify-center gap-1 active:scale-95 cursor-pointer border-none outline-none">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Lihat Jadwal Produk
          </button>
        </div>
      `;
    };

    const renderMsgs = () => chatHistory.map((c: ChatMessage) => {
      const isMe = c.sender === 'seller';
      
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
                <span class="text-[10px] text-white/80">${isMe ? 'Anda' : (buyerName || 'Pembeli')} • ${c.createdAt ? formatChatTimeWIB(c.createdAt) : ''}</span>
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
              <div class="text-[10px] text-text-secondary mt-1">${isMe ? 'Anda' : (buyerName || 'Pembeli')} • ${c.createdAt ? formatChatTimeWIB(c.createdAt) : ''}</div>
            </div>
          </div>
        `;
      }
    }).join('');

    const renderProductList = () => {
      const activeProducts = localProducts.filter(p => p.status === 'active');
      if (activeProducts.length === 0) {
        return `<div class="text-xs text-text-secondary text-center py-8">Tidak ada produk aktif di toko Anda.</div>`;
      }
      return activeProducts.map(p => {
        const imageUrl = p.imageUrl || "/street-food-festival.jpg";
        const priceStr = `Rp ${p.price.toLocaleString('id-ID')}`;
        const cleanName = p.name.replace(/"/g, '&quot;');
        const cleanDesc = (p.description || '').replace(/"/g, '&quot;');
        return `
          <div class="flex gap-3 p-3 bg-surface hover:bg-brand-primary/5 border border-border rounded-xl transition-all group duration-200 text-left">
            <div class="w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden shrink-0 bg-base relative border border-border/50">
              <img src="${imageUrl}" alt="${cleanName}" class="w-full h-full object-cover group-hover:scale-105 transition-transform" />
            </div>
            <div class="flex-1 min-w-0 flex flex-col justify-between py-0.5">
              <div>
                <p class="text-sm font-bold text-text-primary truncate" title="${cleanName}">${p.name}</p>
                <p class="text-xs text-text-secondary mt-1 line-clamp-1 leading-tight">${cleanDesc}</p>
              </div>
              <div class="flex justify-between items-center mt-2">
                <span class="text-sm font-bold text-brand-primary">${priceStr}</span>
                <button class="offer-product-btn text-xs bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-1 px-3 rounded-lg transition-colors flex items-center gap-1 active:scale-95 whitespace-nowrap" data-id="${p.id}" data-name="${cleanName}" data-price="${priceStr}" data-img="${imageUrl}">
                  Tawarkan
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    };

    Swal.fire({
      title: `Chat: ${buyerName}`,
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
            <div class="flex items-center justify-between mb-3 bg-brand-primary/5 border border-brand-primary/20 rounded-xl p-3">
              <div class="text-xs text-text-primary font-semibold truncate max-w-[65%]">Produk: ${productName}</div>
              <button data-product-id="${productId || ''}" class="view-product-calendar-btn text-[10px] font-bold text-brand-primary hover:text-brand-primary-hover bg-brand-primary/10 hover:bg-brand-primary/20 transition-all border border-brand-primary/35 px-2.5 py-1.5 rounded-lg cursor-pointer flex items-center gap-1 shrink-0 select-none">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                Lihat Jadwal Produk
              </button>
            </div>
            <div class="flex flex-col h-[260px] md:h-[350px] bg-base border border-border rounded-xl p-4 overflow-y-auto mb-4" id="chat-box">
              <div class="text-xs text-text-secondary text-center mb-4">Hari ini</div>
              <div id="chat-messages" class="flex flex-col gap-3">
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
          <div class="md:col-span-5 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-4 flex flex-col h-[280px] md:h-[400px] transition-all duration-300 overflow-hidden" id="products-column">
            <div class="flex flex-col h-full w-full">
              <button id="toggle-products-btn" class="w-full text-xs font-bold text-text-primary mb-2 flex items-center justify-between shrink-0 uppercase tracking-wider bg-transparent hover:bg-black/5 p-2 -mx-2 rounded-lg transition-colors cursor-pointer outline-none select-none">
                <div class="flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-brand-primary"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                  Tawarkan Produk Toko
                </div>
                <svg id="toggle-products-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="transition-transform duration-300 transform"><polyline points="18 15 12 9 6 15"></polyline></svg>
              </button>
              <div class="flex-1 overflow-y-scroll pr-2 space-y-2 max-h-[220px] md:max-h-[330px] transition-all duration-300" id="store-products-list">
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
        
        const popup = Swal.getPopup();
        popup?.addEventListener('click', (e) => {
          const target = e.target as HTMLElement;
          const viewCalendarBtn = target.closest('.view-product-calendar-btn');
          if (viewCalendarBtn) {
            const pId = viewCalendarBtn.getAttribute('data-product-id');
            if (pId) {
              Swal.close();
              setSelectedProductIdFilter(pId);
              setActiveTab('produk');
              
              // Scroll to calendar
              setTimeout(() => {
                const calendarEl = document.getElementById('preorder-calendar-title');
                if (calendarEl) {
                  calendarEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }, 150);
            }
          }
        });
        
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
            productsColumn!.classList.add('h-[280px]', 'md:h-[400px]');
          } else {
            productsList!.style.display = 'none';
            toggleIcon!.style.transform = 'rotate(180deg)';
            productsColumn!.classList.remove('h-[280px]', 'md:h-[400px]');
            productsColumn!.classList.add('h-auto', 'md:h-auto');
          }
        });

        const sendProductOffer = async (pId: string, pName: string, pPrice: string, pImage: string) => {
          const offerCode = `[PRODUK_OFFER|${pId}|${pName}|${pPrice}|${pImage}]`;
          const now = new Date();
          const time = formatChatTimeWIB(now);
          const msgId = 'msg-' + Date.now();
          
          chatMessages?.insertAdjacentHTML('beforeend', `
            <div class="flex justify-end mt-3 group" id="msg-bubble-${msgId}">
              <div class="flex flex-col items-end justify-center mr-2 gap-1.5 opacity-80" id="${msgId}-actions" style="display:none;">
                <button class="chat-del-btn text-[10px] text-status-error flex items-center gap-1 hover:text-red-700 transition-colors bg-status-error/5 px-2 py-0.5 rounded-full" data-id="${msgId}">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg> Hapus
                </button>
              </div>
              <div class="bg-brand-primary text-white rounded-xl rounded-tr-none px-4 py-2 max-w-[80%] text-sm text-left shadow-sm opacity-50" id="${msgId}-container">
                <span id="msg-text-${msgId}">${renderSingleOfferCard(pId, pName, pPrice, pImage, true)}</span>
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
              body: JSON.stringify({ orderId, text: offerCode })
            });
            const { id: realId } = await sendRes.json();
            
            const delBtn = document.querySelector(`.chat-del-btn[data-id="${msgId}"]`);
            if (delBtn) delBtn.setAttribute('data-id', realId);
            
            const msgBubble = document.getElementById(`msg-bubble-${msgId}`);
            if (msgBubble) msgBubble.id = `msg-bubble-${realId}`;
            
            const msgText = document.getElementById(`msg-text-${msgId}`);
            if (msgText) msgText.id = `msg-text-${realId}`;
            
            const actionsBlock = document.getElementById(`${msgId}-actions`);
            if (actionsBlock) actionsBlock.style.display = 'flex';

            const containerBlock = document.getElementById(`${msgId}-container`);
            if (containerBlock) containerBlock.classList.remove('opacity-50');

            const ticks = document.getElementById(`${msgId}-ticks`);
            if (ticks) {
              ticks.classList.remove('text-text-primary/60');
              ticks.classList.add('text-white');
            }
          } catch (err) {
            console.error(err);
          }
        };

        productsList?.addEventListener('click', (e) => {
          const btn = (e.target as HTMLElement).closest('.offer-product-btn');
          if (btn) {
            const pId = btn.getAttribute('data-id');
            const pName = btn.getAttribute('data-name');
            const pPrice = btn.getAttribute('data-price');
            const pImage = btn.getAttribute('data-img');
            if (pId && pName && pPrice) {
              sendProductOffer(pId, pName, pPrice, pImage || '');
            }
          }
        });
        
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
          const time = formatChatTimeWIB(now);
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
            // Pesan berhasil terkirim, tetapi centang tetap abu-abu sampai pembeli membacanya.
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

  const handleMarkNotifsRead = async (orderId?: string, chatId?: string) => {
    try {
      const payload: any = {};
      
      // If we mark a chat read from notifications it probably shouldn't just be one message, but the whole chat thread.
      // But for simplicity, we pass the chat message ID returned in unreadChats.
      if (orderId) payload.orderIds = [orderId];
      if (chatId) payload.chatIds = [chatId];

      if (Object.keys(payload).length > 0) {
        // Optimistically remove from local state
        setNotifications(prev => ({
          ...prev,
          newOrders: orderId ? prev.newOrders.filter((o: any) => o.id !== orderId) : prev.newOrders,
          unreadChats: chatId ? prev.unreadChats.filter((c: any) => c.id !== chatId) : prev.unreadChats
        }));

        await fetch('/api/seller/notifications/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const totalNotifs = notifications.newOrders.length + notifications.unreadChats.length;

  const formatMessageSnippet = (msg: string | null) => {
    if (!msg) return '-';
    const trimmedText = msg.trim();
    if (trimmedText.startsWith('[PRODUK_OFFER|') && trimmedText.endsWith(']')) {
      const parts = trimmedText.slice(1, -1).split('|');
      if (parts.length >= 5) {
        return `📦 Tanyakan Produk: ${parts[2]}`;
      }
    }
    return msg;
  };

  const renderNotificationsDropdown = (isDesktop: boolean) => (
    <>
      <div className={`fixed inset-0 z-40 ${isDesktop ? 'md:block hidden bg-transparent' : ''}`} onClick={() => isDesktop ? setIsNotifDesktopOpen(false) : setIsNotifOpen(false)} />
      <div className={`fixed top-[72px] left-4 right-4 sm:absolute sm:top-full ${isDesktop ? 'sm:right-0 sm:mt-4' : 'sm:right-[-60px] sm:mt-3'} sm:left-auto sm:w-[380px] bg-surface border border-border rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[400px]`}>
        <div className="p-3 border-b border-border bg-base flex justify-between items-center">
          <h3 className="font-semibold text-sm">Notifikasi</h3>
        </div>
        <div className="overflow-y-auto flex-1 p-2 space-y-1">
          {totalNotifs === 0 && (
            <div className="p-4 text-center text-text-secondary text-sm">Belum ada notifikasi baru</div>
          )}
          {notifications.newOrders.map((order: any) => (
            <div 
              key={order.id} 
              onClick={() => { 
                handleMarkNotifsRead(order.id, undefined);
                setActiveTab('pesanan_masuk'); 
                if (isDesktop) setIsNotifDesktopOpen(false); else setIsNotifOpen(false); 
              }} 
              className="p-3 bg-brand-primary/5 hover:bg-brand-primary/10 rounded-lg cursor-pointer transition-colors border border-brand-primary/20"
            >
              <div className="flex gap-3">
                <div className="mt-1 text-brand-primary"><Package className="w-4 h-4" /></div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">Pesanan Baru dari {order.buyerName}</p>
                  <p className="text-xs text-text-secondary mt-0.5">{order.productName} · {order.qty} porsi</p>
                  {order.totalPrice && (
                    <p className="text-xs font-semibold text-status-success mt-1">Rp {(order.totalPrice / 2).toLocaleString('id-ID')} (DP 50%)</p>
                  )}
                </div>
              </div>
            </div>
          ))}
          {notifications.unreadChats.map((chat: any) => (
            <div 
              key={chat.id} 
              onClick={() => { 
                handleMarkNotifsRead(undefined, chat.id);
                handleOpenChat(chat.orderId, chat.senderName, chat.productName); 
                if (isDesktop) setIsNotifDesktopOpen(false); else setIsNotifOpen(false); 
              }} 
              className="p-3 bg-blue-500/5 hover:bg-blue-500/10 rounded-lg cursor-pointer transition-colors border border-blue-500/20"
            >
              <div className="flex gap-3">
                <div className="mt-1 text-blue-500"><MessageCircle className="w-4 h-4" /></div>
                <div>
                  <p className="text-sm font-semibold">{chat.senderName} mengirim pesan</p>
                  <p className="text-xs text-text-secondary line-clamp-1">"{formatMessageSnippet(chat.text)}"</p>
                  <p className="text-[10px] text-text-secondary/60 mt-1">{chat.productName}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-base flex flex-col md:flex-row">
      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-surface border-r border-border transform ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 flex flex-col h-screen`}>
        <div className="p-6 border-b border-border">
          <Link href="/" className="flex items-center gap-2">
            <ShoppingBag className="w-8 h-8 text-brand-primary" />
            <span className="text-h2 text-brand-primary font-bold">pesanku</span>
          </Link>
          <button 
            className="md:hidden text-text-secondary absolute top-4 right-4"
            onClick={() => setIsMobileSidebarOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
          <div className="mt-4 p-3 bg-brand-primary/10 rounded-lg">
            <p className="text-caption text-text-secondary">Toko Aktif</p>
            <p className="text-body-base font-semibold text-brand-primary truncate">{profile?.storeName || 'Toko Saya'}</p>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button 
            onClick={() => handleTabChange('produk')}
            className={`w-full flex items-center gap-3 p-3 rounded-lg font-medium transition-all text-left hover-btn ${
              activeTab === 'produk' 
                ? 'bg-brand-primary/10 text-brand-primary font-semibold' 
                : 'text-text-secondary hover:bg-border/40 dark:hover:bg-slate-800/80 hover:text-text-primary'
            }`}
          >
            <Package className="w-5 h-5" />
            Produk Preorder
          </button>
          <button 
            onClick={() => handleTabChange('pesanan_masuk')}
            className={`w-full flex items-center justify-between p-3 rounded-lg font-medium transition-all text-left hover-btn ${
              activeTab === 'pesanan_masuk' 
                ? 'bg-brand-primary/10 text-brand-primary font-semibold' 
                : 'text-text-secondary hover:bg-border/40 dark:hover:bg-slate-800/80 hover:text-text-primary'
            }`}
          >
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5" />
              Pesanan Masuk
            </div>
            {notifications.newOrders.length > 0 && (
              <span className="flex w-5 h-5 items-center justify-center rounded-full bg-brand-primary text-[10px] font-bold text-white">
                {notifications.newOrders.length}
              </span>
            )}
          </button>
          <button 
            onClick={() => handleTabChange('chat_pembeli')}
            className={`w-full flex items-center justify-between p-3 rounded-lg font-medium transition-all text-left hover-btn ${
              activeTab === 'chat_pembeli' 
                ? 'bg-blue-500/10 text-blue-500 font-semibold' 
                : 'text-text-secondary hover:bg-border/40 dark:hover:bg-slate-800/80 hover:text-text-primary'
            }`}
          >
            <div className="flex items-center gap-3">
              <MessageCircle className="w-5 h-5" />
              Chat Pembeli
            </div>
            {notifications.unreadChats.length > 0 && (
              <span className="flex w-5 h-5 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">
                {notifications.unreadChats.length}
              </span>
            )}
          </button>
          <button
            onClick={() => handleTabChange('promosi')}
            className={`w-full flex items-center gap-3 p-3 rounded-lg font-medium transition-all text-left hover-btn ${
              activeTab === 'promosi'
                ? 'bg-brand-primary/10 text-brand-primary font-semibold'
                : 'text-text-secondary hover:bg-border/40 dark:hover:bg-slate-800/80 hover:text-text-primary'
            }`}
          >
            <Megaphone className="w-5 h-5" />
            Promosi Produk
          </button>
          <button 
            onClick={() => handleTabChange('keuangan')}
            className={`w-full flex items-center gap-3 p-3 rounded-lg font-medium transition-all text-left hover-btn ${
              activeTab === 'keuangan' 
                ? 'bg-status-success/10 text-status-success font-semibold' 
                : 'text-text-secondary hover:bg-border/40 dark:hover:bg-slate-800/80 hover:text-text-primary'
            }`}
          >
            <DollarSign className="w-5 h-5" />
            Keuangan & Saldo
          </button>
          <button 
            onClick={() => handleTabChange('pengaturan')}
            className={`w-full flex items-center gap-3 p-3 rounded-lg font-medium transition-all text-left hover-btn ${
              activeTab === 'pengaturan' 
                ? 'bg-brand-secondary/20 text-brand-secondary-dark dark:text-brand-secondary font-semibold' 
                : 'text-text-secondary hover:bg-border/40 dark:hover:bg-slate-800/80 hover:text-text-primary'
            }`}
          >
            <Settings className="w-5 h-5" />
            Pengaturan Toko
          </button>
        </nav>
        
        <div className="p-4 border-t border-border flex flex-col gap-2">

          <button 
            onClick={toggleDarkMode}
            className="flex items-center justify-between p-3 text-text-secondary hover:text-text-primary hover:bg-border/40 dark:hover:bg-slate-800/80 hover-btn rounded-lg font-medium transition-colors w-full cursor-pointer"
            aria-label="Toggle Dark Mode"
          >
            <span className="flex items-center gap-3 text-sm">
              {isDarkMode ? <Moon className="w-5 h-5 text-brand-secondary" /> : <Sun className="w-5 h-5 text-brand-secondary" />}
              <span>{isDarkMode ? 'Mode Gelap' : 'Mode Terang'}</span>
            </span>
            <span className="text-xs bg-border/60 px-2 py-0.5 rounded-md font-semibold text-text-secondary">
              {isDarkMode ? 'Dark' : 'Light'}
            </span>
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 p-3 text-status-error w-full hover:bg-status-error/10 hover-btn rounded-lg font-medium transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen md:h-screen overflow-y-auto">
        {/* Topbar Mobile */}
        <header className="md:hidden bg-surface/80 backdrop-blur-md border-b border-border p-4 flex items-center justify-between sticky top-0 z-50 transition-all">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-1.5 rounded-lg hover:bg-border/60 text-text-primary"
              aria-label="Buka menu penjual"
            >
              <Menu className="w-5 h-5" />
            </button>
            <ShoppingBag className="w-6 h-6 text-brand-primary" />
            <span className="text-h3 text-brand-primary font-bold">pesanku</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button 
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="p-2 rounded-full hover:bg-border/60 dark:hover:bg-slate-800 transition-colors relative flex items-center justify-center w-9 h-9 border border-border hover-btn cursor-pointer shadow-sm"
                title="Notifikasi"
              >
                <motion.div initial={{ rotate: 0 }} whileHover={{ rotate: 15 }} className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-secondary"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
                </motion.div>
                {totalNotifs > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-status-error px-1 text-[9px] font-bold text-white shadow-sm animate-pulse-slow">
                    {totalNotifs > 99 ? '99+' : totalNotifs}
                  </span>
                )}
              </button>
              {isNotifOpen && renderNotificationsDropdown(false)}
            </div>
            <button
              onClick={() => handleTabChange('pengaturan')}
              className="p-2 rounded-full hover:bg-border/60 dark:hover:bg-slate-800 transition-colors flex items-center justify-center w-9 h-9 border border-border hover-btn cursor-pointer"
              aria-label="Buka Pengaturan Toko"
              title="Pengaturan Toko"
            >
              <Settings className="w-4 h-4 text-brand-secondary" />
            </button>

            <button 
              onClick={toggleDarkMode}
              className="p-2 rounded-full hover:bg-border/60 dark:hover:bg-slate-800 transition-colors relative overflow-hidden flex items-center justify-center w-9 h-9 border border-border hover-btn cursor-pointer"
              aria-label="Toggle Dark Mode"
            >
              <AnimatePresence mode="wait" initial={false}>
                {isDarkMode ? (
                  <motion.div
                    key="moon"
                    initial={{ y: -20, opacity: 0, rotate: -90 }}
                    animate={{ y: 0, opacity: 1, rotate: 0 }}
                    exit={{ y: 20, opacity: 0, rotate: 90 }}
                    transition={{ duration: 0.2 }}
                    className="absolute"
                  >
                    <Moon className="w-4 h-4 text-brand-secondary" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="sun"
                    initial={{ y: 20, opacity: 0, rotate: 90 }}
                    animate={{ y: 0, opacity: 1, rotate: 0 }}
                    exit={{ y: -20, opacity: 0, rotate: -90 }}
                    transition={{ duration: 0.2 }}
                    className="absolute"
                  >
                    <Sun className="w-4 h-4 text-brand-secondary" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </header>

        {/* Topbar Desktop */}
        <header className="hidden md:flex items-center justify-end px-10 pt-6 pb-2 sticky top-0 z-40 bg-base/80 backdrop-blur-sm -mb-8">
           <div className="relative">
             <button 
               className="flex items-center justify-center p-2 rounded-xl border border-border bg-surface text-text-secondary hover:text-brand-primary hover:border-brand-primary/30 hover:bg-brand-primary/5 transition-all relative cursor-pointer shadow-sm"
               title="Notifikasi"
               onClick={() => setIsNotifDesktopOpen(!isNotifDesktopOpen)}
             >
               <Bell className="w-5 h-5" />
               {totalNotifs > 0 && (
                 <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-status-error px-1 text-[9px] font-bold text-white shadow-sm animate-pulse-slow ring-2 ring-surface">
                   {totalNotifs > 99 ? '99+' : totalNotifs}
                 </span>
               )}
             </button>
             {isNotifDesktopOpen && renderNotificationsDropdown(true)}
           </div>
        </header>

        <div className="p-6 md:p-10 pb-28 md:pb-10 flex-1 relative">
          {/* Loading Overlay */}
          {isTransitioning && (
            <div className="absolute inset-0 bg-base/60 backdrop-blur-sm z-50 flex items-center justify-center rounded-xl transition-all duration-300">
              <div className="bg-surface p-4 rounded-full shadow-lg flex items-center justify-center border border-border">
                <div className="w-8 h-8 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin"></div>
              </div>
            </div>
          )}

          <div className={`transition-opacity duration-300 ${isTransitioning ? 'opacity-40' : 'opacity-100'}`}>
            {activeTab === 'pesanan_masuk' && (
              <div className="flex flex-col gap-6">
                <div>
                  <h1 className="text-h1 mb-1 flex items-center gap-2"><Package className="w-8 h-8 text-brand-primary" /> Pesanan Masuk</h1>
                  <p className="text-body-base text-text-secondary">Daftar semua pesanan dari pelanggan Anda.</p>
                </div>
                
                <div className="card overflow-hidden border-border border">
                   <div className="p-5 border-b border-border bg-surface/50 flex justify-between items-center">
                    <h2 className="text-h3">Semua Pesanan</h2>
                  </div>
                  {sellerOrders.length === 0 ? (
                    <div className="p-10 text-center text-text-secondary">
                      Belum ada pesanan masuk.
                    </div>
                  ) : (
                    <div className="overflow-x-auto w-full">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-border text-body-small text-text-secondary bg-surface/50 whitespace-nowrap">
                            <th className="p-3 font-medium">Pesanan</th>
                            <th className="p-3 font-medium">Pembeli</th>
                            <th className="p-3 font-medium text-right text-status-warning">Ditahan</th>
                            <th className="p-3 font-medium text-right text-status-error">Biaya Admin</th>
                            <th className="p-3 font-medium text-right text-status-error">Biaya Aplikasi</th>
                            <th className="p-3 font-medium text-right text-status-error">Biaya Jasa</th>
                            <th className="p-3 font-medium text-right">Net Saldo</th>
                            <th className="p-3 font-medium text-center">Invoice</th>
                            <th className="p-3 font-medium text-center">Dokumen & Bukti</th>
                            <th className="p-3 font-medium text-right">Aksi Status</th>
                          </tr>
                        </thead>
                        <tbody className="text-body-base text-text-primary">
                          {sellerOrders.map(order => (
                            <tr key={order.id} className="border-b border-border hover:bg-surface/80 dark:hover:bg-slate-800/80 transition-colors">
                              <td className="p-3 min-w-[200px]">
                                <div className="font-mono text-[10px] text-text-secondary mb-1">
                                  {order.id} &bull; {new Date(order.createdAt || Date.now()).toLocaleDateString('id-ID', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: WIB_TIMEZONE })} WIB
                                </div>
                                <p className="font-bold text-text-primary text-sm line-clamp-1">{order.productName}</p>
                                {order.selectedVariant && (
                                  <p className="text-[10px] font-semibold text-brand-primary">
                                    Varian: {order.selectedVariant}
                                  </p>
                                )}
                                <p className="text-[11px] text-text-secondary">{order.qty} porsi</p>
                                {order.notes && (
                                  <p className="text-[10px] text-brand-secondary-dark dark:text-brand-secondary mt-0.5 italic max-w-[180px] truncate">Catatan: "{order.notes}"</p>
                                )}
                              </td>
                              <td className="p-3 min-w-[140px]">
                                <p className="text-xs font-semibold text-text-primary truncate max-w-[140px]">{order.buyerName}</p>
                                {order.buyerPhone && <p className="text-[10px] text-text-secondary">{order.buyerPhone}</p>}
                              </td>
                              <td className="p-4 text-right">
                                <span className="text-sm font-semibold text-status-warning/90 whitespace-nowrap">
                                  {order.status !== 'completed' && (order.adminSplitAmount ?? 0) > 0 ? `-Rp ${(order.adminSplitAmount ?? 0).toLocaleString('id-ID')}` : '-'}
                                </span>
                              </td>
                              <td className="p-4 text-right">
                                <span className="text-sm font-semibold text-status-error/90 whitespace-nowrap">
                                  {order.status !== 'completed' && feeAdmin > 0 ? `-Rp ${feeAdmin.toLocaleString('id-ID')}` : '-'}
                                </span>
                              </td>
                              <td className="p-4 text-right">
                                <span className="text-sm font-semibold text-status-error/90 whitespace-nowrap">
                                  {feeAplikasi > 0 ? `-Rp ${feeAplikasi.toLocaleString('id-ID')}` : '-'}
                                </span>
                              </td>
                              <td className="p-4 text-right">
                                <span className="text-sm font-semibold text-status-error/90 whitespace-nowrap">
                                  {feeJasa > 0 ? `-Rp ${feeJasa.toLocaleString('id-ID')}` : '-'}
                                </span>
                              </td>
                              <td className="p-4 text-right">
                                <div className="flex flex-col items-end">
                                  <span className="font-bold text-brand-primary">Rp {Math.max(0, order.totalPrice - (order.status === 'completed' ? 0 : (order.adminSplitAmount ?? 0)) - (order.status === 'completed' ? 0 : feeAdmin) - feeAplikasi - feeJasa).toLocaleString('id-ID')}</span>
                                </div>
                              </td>
                              <td className="p-3 text-center align-middle">
                                <Link href={`/invoice/${order.id}`} target="_blank" className="inline-flex items-center justify-center w-8 h-8 bg-surface border border-border hover:border-brand-primary/50 text-text-secondary hover:text-brand-primary rounded-lg transition-all shadow-sm" title="Unduh Invoice">
                                  <FileText className="w-4 h-4" />
                                </Link>
                              </td>
                              <td className="p-3 align-top min-w-[130px]">
                                <div className="flex flex-col gap-1.5 w-full">
                                  {order.proofUrl ? (
                                    <button onClick={() => Swal.fire({ title: 'Bukti Pembayaran', imageUrl: order.proofUrl as string, imageWidth: 400 })} className="text-[10px] w-full py-1 rounded bg-brand-primary/10 text-brand-primary font-semibold border-brand-primary/20 border transition-colors hover:bg-brand-primary hover:text-white">Bayar: Lihat</button>
                                  ) : (
                                    <span className="text-[10px] w-full text-center py-1 rounded bg-surface-secondary text-text-secondary border border-transparent">Bayar: -</span>
                                  )}

                                  {order.dispatchReceiptUrl ? (
                                    <button onClick={() => Swal.fire({ title: 'Resi Pengiriman', imageUrl: order.dispatchReceiptUrl as string, imageWidth: 400 })} className="text-[10px] w-full py-1 rounded bg-brand-secondary/10 text-brand-secondary font-semibold border-brand-secondary/20 border transition-colors hover:bg-brand-secondary hover:text-white">Bukti Kirim: Lihat</button>
                                  ) : (
                                    <button onClick={() => handleUploadDispatchReceipt(order.id, order.status || 'verified')} className="text-[10px] w-full py-1 rounded border border-dashed border-text-secondary/50 text-text-secondary hover:text-brand-secondary hover:border-brand-secondary transition-colors">Bukti Kirim: Upload</button>
                                  )}

                                  {order.deliveryProofUrl ? (
                                    <button onClick={() => Swal.fire({ title: 'Bukti Tiba', imageUrl: order.deliveryProofUrl as string, imageWidth: 400 })} className="text-[10px] w-full py-1 rounded bg-status-success/10 text-status-success font-semibold border-status-success/20 border transition-colors hover:bg-status-success hover:text-white">Bukti Tiba: Lihat</button>
                                  ) : (
                                    <button onClick={() => handleUploadDeliveryProof(order.id)} className="text-[10px] w-full py-1 rounded border border-dashed border-text-secondary/50 text-text-secondary hover:text-status-success hover:border-status-success transition-colors">Bukti Tiba: Upload</button>
                                  )}
                                </div>
                              </td>
                              <td className="p-4 text-right">
                                <div className="flex flex-col items-end gap-2">

                                  <select
                                    disabled={order.status === 'completed'}
                                    className={`text-xs font-semibold rounded-lg border px-2 py-1.5 outline-none cursor-pointer text-center w-[160px] ${
                                      order.status === 'completed' ? 'bg-status-success/10 text-status-success border-status-success/20 cursor-not-allowed opacity-80' : 
                                      order.status === 'processing' ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/20' : 
                                      order.status === 'preorder_running' ? 'bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-300' :
                                      order.status === 'verified' ? 'bg-brand-secondary/10 text-brand-secondary border-brand-secondary/20' : 
                                      order.status === 'waiting_verification' ? 'bg-status-warning/10 text-status-warning border-status-warning/20' : 
                                      order.status === 'cancelled' || order.status === 'failed' ? 'bg-status-error/10 text-status-error border-status-error/20' : 
                                      'bg-border/60 text-text-secondary border-border'
                                    }`}
                                    defaultValue={order.status ?? 'waiting_verification'}
                                    onChange={async (e) => {
                                      const newStatus = e.target.value;
                                      const statusSelect = e.currentTarget;
                                      const previousStatus = order.status ?? 'waiting_verification';
                                      try {
                                        Swal.fire({
                                          title: 'Loading...',
                                          allowOutsideClick: false,
                                          didOpen: () => Swal.showLoading()
                                        });
                                        const res = await fetch('/api/orders/update-status', {
                                          method: 'PUT',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ orderId: order.id, status: newStatus })
                                        });
                                        const data = await res.json();
                                        if (!res.ok) throw new Error(data.error || 'Gagal memperbarui status');
                                        setSellerOrders(current => current.map(item => item.id === order.id
                                          ? { ...item, status: newStatus }
                                          : item));
                                        router.refresh();
                                        Swal.fire({
                                          icon: 'success', title: 'Berhasil', text: 'Status pesanan diperbarui!', timer: 1500, showConfirmButton: false
                                        });
                                      } catch (error: unknown) {
                                        statusSelect.value = previousStatus;
                                        const errMsg = error instanceof Error ? error.message : 'Gagal memperbarui status';
                                        Swal.fire('Error', errMsg, 'error');
                                      }
                                    }}
                                  >
                                    <option value="waiting_verification" className="text-text-primary bg-base">Menunggu Konfirmasi</option>
                                    <option value="verified" className="text-text-primary bg-base">
                                      {!order.proofUrl ? 'Menunggu Pembayaran' : 'Pesanan Dibayar (Verifikasi)'}
                                    </option>
                                    <option value="preorder_running" className="text-text-primary bg-base">Preorder Berjalan</option>
                                    <option value="processing" className="text-text-primary bg-base">Barang Sedang Dikirim</option>
                                    {order.status === 'completed' && <option value="completed" className="text-status-success bg-base">Selesai</option>}
                                    <option value="failed" className="text-status-error bg-base">Gagal</option>
                                    <option value="cancelled" className="text-status-error bg-base">Dibatalkan</option>
                                  </select>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
            {activeTab === 'chat_pembeli' && (
              <div className="flex flex-col gap-6">
                <div>
                  <h1 className="text-h1 mb-1 flex items-center gap-2"><MessageCircle className="w-8 h-8 text-brand-primary" /> Chat Pembeli</h1>
                  <p className="text-body-base text-text-secondary">Kelola daftar percakapan dengan pembeli Anda.</p>
                </div>
                
                <div className="card overflow-hidden border-border border">
                   <div className="p-5 border-b border-border bg-surface/50 flex justify-between items-center">
                    <h2 className="text-h3">Daftar Chat</h2>
                  </div>
                  {notifications.chatThreads.length === 0 ? (
                    <div className="p-10 text-center text-text-secondary">
                      Belum ada obrolan dengan pembeli.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-border text-body-small text-text-secondary bg-surface/50">
                            <th className="p-4 font-medium">Pembeli</th>
                            <th className="p-4 font-medium">Pesan Terakhir</th>
                            <th className="p-4 font-medium">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="text-body-base text-text-primary">
                          {notifications.chatThreads.map(thread => (
                            <tr key={thread.orderId} className="border-b border-border hover:bg-surface/80 dark:hover:bg-slate-800/80 transition-colors">
                              <td className="p-4">
                                <div className="font-semibold flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                                    <User className="w-4 h-4" />
                                  </div>
                                  <div>
                                    {thread.buyerName}
                                    {thread.unreadCount > 0 && <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-brand-primary text-[10px] font-bold text-white px-1.5">{thread.unreadCount}</span>}
                                  </div>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="text-sm line-clamp-1 text-text-secondary w-64">{formatMessageSnippet(thread.latestMessage)}</div>
                                <div className="text-[10px] text-text-secondary/60 mt-1">{thread.latestMessageAt ? formatShortDateTimeWIB(thread.latestMessageAt) : ''}</div>
                              </td>
                              <td className="p-4">
                                <button
                                  onClick={() => handleOpenChat(thread.orderId, thread.buyerName || '', thread.productName)}
                                  className="text-xs font-semibold text-brand-primary hover:bg-brand-primary/10 transition-colors flex items-center gap-1.5 border border-brand-primary/30 px-3 py-1.5 rounded-lg"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                  Buka Chat
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
            {activeTab === 'produk' && (
              <>
              <SellerPreorderCalendar
                key={`${selectedProductIdFilter || 'all'}-${sellerOrders.map((order) => `${order.id}:${order.deliveryDate || ''}:${order.fulfillmentStatus || ''}`).join('|')}`}
                orders={sellerOrders}
                products={localProducts.map((product) => ({ id: product.id, name: product.name }))}
                productIdFilter={selectedProductIdFilter}
                onOrderStatusChange={(orderId, status, cancelReason) => {
                  setSellerOrders(current => current.map(order => order.id === orderId ? { ...order, status, cancelReason } : order));
                }}
              />

              {/* Product List */}
              <div className="card overflow-hidden">
                <div className="p-5 border-b border-border bg-surface/50 flex justify-between items-center">
                  <h2 className="text-h3">Daftar Produk</h2>
                  <Link href="/seller/product/new" className="btn-primary flex items-center gap-2 shadow-lg shadow-brand-primary/20 hover:shadow-brand-primary/40 relative py-2">
                    <Plus className="w-4 h-4" />
                    Tambah Produk
                  </Link>
                </div>
                
                <div className="overflow-x-auto">
                  {localProducts.length === 0 ? (
                    <div className="p-10 text-center text-text-secondary">
                      Belum ada produk. Silakan tambah produk preorder pertama Anda!
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border text-body-small text-text-secondary">
                          <th className="p-4 font-medium">Info Produk</th>
                          <th className="p-4 font-medium">Harga</th>
                          <th className="p-4 font-medium">Jumlah Pesanan</th>
                          <th className="p-4 font-medium text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="text-body-base text-text-primary">
                        {localProducts.map(product => {
                          const current = product.currentQty || 0;

                          return (
                            <tr key={product.id} className="border-b border-border hover:bg-surface/80 dark:hover:bg-slate-800/80 transition-colors">
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 relative bg-border/50 rounded-md overflow-hidden shrink-0">
                                    {product.imageUrl && (
                                      <Image src={product.imageUrl} alt={product.name} fill className="object-cover" sizes="48px" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-text-primary line-clamp-1">{product.name}</p>
                                    {product.variants && product.variants.length > 0 && (
                                      <div className="mt-1.5 flex max-w-sm flex-wrap gap-1">
                                        {product.variants.map((variant) => (
                                          <span key={variant.name} className="rounded-full border border-brand-primary/25 bg-brand-primary/10 px-2 py-0.5 text-[10px] font-semibold text-brand-primary">
                                            {variant.name}{variant.price !== null && variant.price !== undefined ? ` · Rp ${variant.price.toLocaleString('id-ID')}` : ''}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 font-medium">Rp {product.price.toLocaleString('id-ID')}</td>
                              <td className="p-4 font-medium">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-brand-primary text-base">{current}</span>
                                  <span className="text-caption text-text-secondary">Pcs</span>
                                </div>
                              </td>
                              <td className="p-4 text-right">
                                <div className="flex justify-end gap-3 items-center">
                                  <button 
                                    onClick={() => {
                                      setSelectedProductIdFilter(product.id);
                                      // Scroll to calendar
                                      const calendarEl = document.getElementById('preorder-calendar-title');
                                      if (calendarEl) {
                                        calendarEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                      }
                                    }}
                                    className="text-brand-secondary hover:text-brand-primary font-medium text-sm transition-colors cursor-pointer mr-1 bg-transparent border-none outline-none"
                                  >
                                    Lihat Jadwal
                                  </button>
                                  <button 
                                    onClick={() => {
                                      const variantRows = (product.variants || []).map((variant) => `
                                        <div class="swal-variant-row grid grid-cols-[minmax(0,1fr)_minmax(120px,0.55fr)_36px] gap-2">
                                          <input type="text" maxlength="40" aria-label="Nama varian" placeholder="Nama varian" class="swal-variant-name input-field w-full text-text-primary bg-base border border-border rounded-md px-3 py-2" value="${escapeHtml(variant.name)}">
                                          <input type="number" min="0" step="1" aria-label="Harga varian opsional" placeholder="Harga opsional" class="swal-variant-price input-field w-full text-text-primary bg-base border border-border rounded-md px-3 py-2" value="${variant.price ?? ''}">
                                          <button type="button" class="swal-remove-variant rounded-md border border-red-200 text-red-500 hover:bg-red-50" aria-label="Hapus varian">×</button>
                                        </div>
                                      `).join('');
                                      Swal.fire({
                                        title: 'Edit Produk',
                                        html: `
                                          <div class="flex flex-col gap-4 text-left mt-4">
                                            <div>
                                              <label class="text-caption text-text-secondary mb-1 block">Foto Produk Baru (Opsional)</label>
                                              
                                              <div id="swal-image-preview-container" class="mb-3 ${product.imageUrl ? 'block' : 'hidden'}">
                                                <div class="relative w-full h-32 rounded-lg border border-border overflow-hidden bg-base">
                                                  <img id="swal-image-preview" src="${product.imageUrl || ''}" class="w-full h-full object-contain" />
                                                </div>
                                              </div>

                                              <input id="swal-edit-image" type="file" accept="image/*" class="input-field w-full text-text-primary bg-base border border-border rounded-md px-3 py-2 focus:border-brand-primary focus:outline-none">
                                              <p class="text-[10px] text-text-secondary mt-1">Kosongkan jika tidak ingin mengubah foto</p>
                                            </div>
                                            <div>
                                              <label class="text-caption text-text-secondary mb-1 block">Nama Produk</label>
                                              <input id="swal-edit-name" class="input-field w-full text-text-primary bg-base border border-border rounded-md px-3 py-2 focus:border-brand-primary focus:outline-none" value="${product.name}">
                                            </div>
                                            <div>
                                              <label class="text-caption text-text-secondary mb-1 block">Kategori Produk</label>
                                              <select id="swal-edit-category" class="input-field w-full text-text-primary bg-base border border-border rounded-md px-3 py-2 focus:border-brand-primary focus:outline-none appearance-none bg-no-repeat bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%24%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:1.5em_1.5em] bg-[right_0.5rem_center] pr-10">
                                                <option value="">Pilih Kategori</option>
                                                <option value="Makanan Berat" ${product.batchCategory === 'Makanan Berat' ? 'selected' : ''}>Makanan Berat</option>
                                                <option value="Minuman Segar" ${product.batchCategory === 'Minuman Segar' ? 'selected' : ''}>Minuman Segar</option>
                                                <option value="Jajanan & Cemilan" ${product.batchCategory === 'Jajanan & Cemilan' ? 'selected' : ''}>Jajanan & Cemilan</option>
                                                <option value="Kue & Roti" ${product.batchCategory === 'Kue & Roti' ? 'selected' : ''}>Kue & Roti</option>
                                                <option value="Cepat Saji" ${product.batchCategory === 'Cepat Saji' ? 'selected' : ''}>Cepat Saji</option>
                                              </select>
                                            </div>
                                            <div>
                                              <label class="text-caption text-text-secondary mb-1 block">Harga (Rp)</label>
                                              <input id="swal-edit-price" type="number" class="input-field w-full text-text-primary bg-base border border-border rounded-md px-3 py-2 focus:border-brand-primary focus:outline-none" value="${product.price}">
                                            </div>
                                            <div>
                                              <label class="text-caption text-text-secondary mb-1 block">Minimal Order</label>
                                              <input id="swal-edit-minorder" type="hidden" value="1">
                                            </div>
                                            <div>
                                              <label class="text-caption text-text-secondary mb-1 block">Waktu Proses Pemesanan</label>
                                              <input id="swal-edit-processingtime" type="text" placeholder="Contoh: 2 Hari" class="input-field w-full text-text-primary bg-base border border-border rounded-md px-3 py-2 focus:border-brand-primary focus:outline-none" value="${product.processingTime || ''}">
                                            </div>
                                            <div>
                                              <label class="text-caption text-text-secondary mb-1 block">Varian Produk (Opsional)</label>
                                              <div id="swal-variant-rows" class="flex flex-col gap-2">${variantRows}</div>
                                              <button id="swal-add-variant" type="button" class="mt-2 w-full rounded-md border border-brand-primary px-3 py-2 text-sm font-semibold text-brand-primary hover:bg-brand-primary/10">+ Tambah Varian</button>
                                              <p class="text-[10px] text-text-secondary mt-1">Harga varian boleh dikosongkan untuk memakai harga dasar produk.</p>
                                            </div>
                                          </div>
                                        `,
                                        showCancelButton: true,
                                        confirmButtonText: 'Simpan Perubahan',
                                        cancelButtonText: 'Batal',
                                        confirmButtonColor: '#ff5c35',
                                        cancelButtonColor: '#94a3b8',
                                        width: '450px',
                                        customClass: {
                                          popup: 'bg-surface text-text-primary rounded-xl border border-border shadow-2xl',
                                          title: 'text-text-primary text-h3',
                                        },
                                        didOpen: () => {
                                          const imageInput = document.getElementById('swal-edit-image') as HTMLInputElement;
                                          const previewContainer = document.getElementById('swal-image-preview-container');
                                          const previewImage = document.getElementById('swal-image-preview') as HTMLImageElement;
                                          const variantContainer = document.getElementById('swal-variant-rows');
                                          const addVariantButton = document.getElementById('swal-add-variant');
                                          
                                          if (imageInput && previewContainer && previewImage) {
                                            imageInput.addEventListener('change', function() {
                                              const file = this.files?.[0];
                                              if (file) {
                                                const reader = new FileReader();
                                                reader.onload = function(e) {
                                                  previewImage.src = e.target?.result as string;
                                                  previewContainer.classList.remove('hidden');
                                                  previewContainer.classList.add('block');
                                                };
                                                reader.readAsDataURL(file);
                                              }
                                            });
                                          }

                                          addVariantButton?.addEventListener('click', () => {
                                            if (!variantContainer || variantContainer.querySelectorAll('.swal-variant-row').length >= 10) return;
                                            variantContainer.insertAdjacentHTML('beforeend', `
                                              <div class="swal-variant-row grid grid-cols-[minmax(0,1fr)_minmax(120px,0.55fr)_36px] gap-2">
                                                <input type="text" maxlength="40" aria-label="Nama varian" placeholder="Nama varian" class="swal-variant-name input-field w-full text-text-primary bg-base border border-border rounded-md px-3 py-2">
                                                <input type="number" min="0" step="1" aria-label="Harga varian opsional" placeholder="Harga opsional" class="swal-variant-price input-field w-full text-text-primary bg-base border border-border rounded-md px-3 py-2">
                                                <button type="button" class="swal-remove-variant rounded-md border border-red-200 text-red-500 hover:bg-red-50" aria-label="Hapus varian">×</button>
                                              </div>
                                            `);
                                          });

                                          variantContainer?.addEventListener('click', (event) => {
                                            const target = event.target as HTMLElement;
                                            target.closest('.swal-remove-variant')?.closest('.swal-variant-row')?.remove();
                                          });
                                        },
                                        preConfirm: async () => {
                                          const name = (document.getElementById('swal-edit-name') as HTMLInputElement).value;
                                          const batchCategory = (document.getElementById('swal-edit-category') as HTMLSelectElement).value;
                                          const price = (document.getElementById('swal-edit-price') as HTMLInputElement).value;
                                          const minOrder = (document.getElementById('swal-edit-minorder') as HTMLInputElement).value;
                                          const processingTime = (document.getElementById('swal-edit-processingtime') as HTMLInputElement).value;
                                          const variantsInput = Array.from(document.querySelectorAll('.swal-variant-row')).map((row) => ({
                                            name: (row.querySelector('.swal-variant-name') as HTMLInputElement).value,
                                            price: (row.querySelector('.swal-variant-price') as HTMLInputElement).value,
                                          }));
                                          const imageInput = document.getElementById('swal-edit-image') as HTMLInputElement;
                                          
                                          if (!name || !price) {
                                            Swal.showValidationMessage('Semua kolom teks penting wajib diisi!');
                                            return false;
                                          }

                                          const variantResult = validateProductVariants(variantsInput);
                                          if (!variantResult.success) {
                                            Swal.showValidationMessage(variantResult.error);
                                            return false;
                                          }
                                          
                                          let imageUrl = '';
                                          if (imageInput.files && imageInput.files[0]) {
                                            const file = imageInput.files[0];
                                            if (file.size > 2 * 1024 * 1024) {
                                              Swal.showValidationMessage('Ukuran gambar maksimal 2MB!');
                                              return false;
                                            }
                                            // Convert to base64
                                            const reader = new FileReader();
                                            imageUrl = await new Promise((resolve) => {
                                              reader.onload = (e) => resolve(e.target?.result as string);
                                              reader.readAsDataURL(file);
                                            });
                                          }

                                          return { 
                                            name, 
                                            price: parseInt(price), 
                                            min: product.preorderMinQty || 1, 
                                            imageUrl,
                                            minOrderQty: parseInt(minOrder),
                                            processingTime,
                                            batchCategory,
                                            variants: variantResult.variants
                                          };
                                        }
                                      }).then(async (result) => {
                                        if (result.isConfirmed) {
                                          Swal.fire({
                                            title: 'Menyimpan...',
                                            allowOutsideClick: false,
                                            customClass: {
                                              popup: 'bg-surface text-text-primary rounded-xl border border-border shadow-2xl',
                                              title: 'text-text-primary'
                                            },
                                            didOpen: () => Swal.showLoading()
                                          });
                                          
                                          try {
                                            const res = await fetch('/api/products', {
                                              method: 'PUT',
                                              headers: { 'Content-Type': 'application/json' },
                                              body: JSON.stringify({
                                                id: product.id,
                                                name: result.value.name,
                                                price: result.value.price,
                                                minQty: result.value.min,
                                                imageUrl: result.value.imageUrl,
                                                minOrderQty: result.value.minOrderQty,
                                                processingTime: result.value.processingTime,
                                                batchCategory: result.value.batchCategory,
                                                variants: result.value.variants
                                              })
                                            });

                                            if (!res.ok) throw new Error('Gagal memperbarui produk');

                                            Swal.fire({
                                              icon: 'success',
                                              title: 'Berhasil',
                                              text: 'Produk berhasil diperbarui!',
                                              timer: 1500,
                                              showConfirmButton: false,
                                              customClass: {
                                                popup: 'bg-surface text-text-primary rounded-xl border border-border shadow-2xl',
                                                title: 'text-text-primary'
                                              }
                                            }).then(() => {
                                              window.location.reload();
                                            });
                                          } catch (error) {
                                            Swal.fire('Gagal', 'Terjadi kesalahan saat menyimpan', 'error');
                                          }
                                        }
                                      });
                                    }}
                                    className="text-brand-primary font-medium hover:underline text-sm"
                                  >
                                    Edit
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteProduct(product.id, product.name)}
                                    className="text-status-error font-medium hover:underline text-sm"
                                  >
                                    Hapus
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'promosi' && (
            <SellerPromotionCenter
              offers={promotionOffers}
              initialRequests={promotionRequests}
              products={localProducts.map((product) => ({ id: product.id, name: product.name }))}
            />
          )}

          {activeTab === 'keuangan' && (
            <div className="space-y-6">
              <h1 className="text-h1 mb-1">Keuangan & Saldo</h1>
              <p className="text-body-base text-text-secondary mb-8">Pantau penghasilan dan transaksi pesanan Anda di sini.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
                <div className="card p-6 border-status-success border-2 shadow-sm rounded-xl">
                  <h3 className="text-[11px] sm:text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wider">Total Saldo Bersih</h3>
                  <p className="text-2xl sm:text-3xl font-bold text-status-success">
                    Rp {sellerOrders.filter(o => o.status === 'completed').reduce((acc, curr) => acc + Math.max(0, curr.totalPrice - feeAplikasi - feeJasa), 0).toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="card p-6 border-border border rounded-xl bg-surface/30">
                  <h3 className="text-[11px] sm:text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wider">Ditahan Admin (Dalam Proses)</h3>
                  <p className="text-2xl sm:text-3xl font-bold text-brand-primary">
                    Rp {sellerOrders.filter(o => ['verified', 'preorder_running', 'processing'].includes(o.status || '')).reduce((acc, curr) => acc + Math.max(0, curr.totalPrice - (curr.adminSplitAmount ?? 0) - feeAdmin - feeAplikasi - feeJasa), 0).toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="card p-6 border-border border rounded-xl">
                  <h3 className="text-[11px] sm:text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wider">Menunggu Pembayaran</h3>
                  <p className="text-2xl sm:text-3xl font-bold text-status-warning">
                    Rp {sellerOrders.filter(o => o.status === 'waiting_verification').reduce((acc, curr) => acc + Math.max(0, curr.totalPrice - (curr.adminSplitAmount ?? 0) - feeAdmin - feeAplikasi - feeJasa), 0).toLocaleString('id-ID')}
                  </p>
                </div>
              </div>

              <div className="card overflow-hidden">
                <div className="p-5 border-b border-border bg-surface/50 flex justify-between items-center">
                  <h2 className="text-h3">Daftar Transaksi Pesanan</h2>
                </div>
                
                <div className="overflow-x-auto w-full">
                  {sellerOrders.length === 0 ? (
                    <div className="p-10 text-center text-text-secondary flex flex-col items-center">
                      <Info className="w-12 h-12 text-brand-secondary/50 mb-4" />
                      <p>Belum ada transaksi. Terus promosikan pre-order Anda!</p>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-border text-xs text-text-secondary bg-surface/30 whitespace-nowrap">
                          <th className="p-3 font-medium">Pesanan</th>
                          <th className="p-3 font-medium text-right text-status-warning">Ditahan</th>
                          <th className="p-3 font-medium text-right text-status-error">Biaya Admin</th>
                          <th className="p-3 font-medium text-right text-status-error">Biaya Aplikasi</th>
                          <th className="p-3 font-medium text-right text-status-error">Biaya Jasa</th>
                          <th className="p-3 font-medium text-right">Total Transaksi</th>
                          <th className="p-3 font-medium text-right">Net Masuk Saldo</th>
                        </tr>
                      </thead>
                      <tbody className="text-body-base text-text-primary">
                        {sellerOrders.map(order => (
                          <tr key={order.id} className="border-b border-border hover:bg-surface/80 dark:hover:bg-slate-800/80 transition-colors">
                            <td className="p-3 min-w-[200px]">
                              <div className="font-mono text-[10px] text-text-secondary mb-1">
                                {order.id} &bull; {new Date(order.createdAt || Date.now()).toLocaleDateString('id-ID', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: WIB_TIMEZONE })} WIB
                              </div>
                              <p className="font-bold text-text-primary text-sm line-clamp-1">{order.productName}</p>
                              <p className="text-[11px] text-text-secondary mt-1">Oleh: {order.buyerName}</p>
                            </td>
                            <td className="p-4 text-right">
                              <span className="text-sm font-semibold text-status-warning/90 whitespace-nowrap">
                                {order.status !== 'completed' && (order.adminSplitAmount ?? 0) > 0 ? `-Rp ${(order.adminSplitAmount ?? 0).toLocaleString('id-ID')}` : '-'}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <span className="text-sm font-semibold text-status-error/90 whitespace-nowrap">
                                {order.status !== 'completed' && feeAdmin > 0 ? `-Rp ${feeAdmin.toLocaleString('id-ID')}` : '-'}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <span className="text-sm font-semibold text-status-error/90 whitespace-nowrap">
                                {feeAplikasi > 0 ? `-Rp ${feeAplikasi.toLocaleString('id-ID')}` : '-'}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <span className="text-sm font-semibold text-status-error/90 whitespace-nowrap">
                                {feeJasa > 0 ? `-Rp ${feeJasa.toLocaleString('id-ID')}` : '-'}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <span className="font-semibold text-text-primary">Rp {order.totalPrice.toLocaleString('id-ID')}</span>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex flex-col items-end">
                                <span className="font-bold text-status-success">Rp {Math.max(0, order.totalPrice - (order.status === 'completed' ? 0 : (order.adminSplitAmount ?? 0)) - (order.status === 'completed' ? 0 : feeAdmin) - feeAplikasi - feeJasa).toLocaleString('id-ID')}</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pengaturan' && (
            <div className="space-y-6 max-w-2xl">
              <h1 className="text-h1 mb-1">Pengaturan Toko</h1>
              <p className="text-body-base text-text-secondary mb-8">Kelola informasi UMKM dan detail pencairan dana Anda.</p>
              
              <form onSubmit={handleSaveProfile} className="card p-6 space-y-6">
                {saveMessage && (
                  <div className={`p-4 rounded-lg text-sm font-medium ${saveMessage.includes('berhasil') ? 'bg-status-success/10 text-status-success' : 'bg-status-error/10 text-status-error'}`}>
                    {saveMessage}
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-body-small font-medium text-text-secondary mb-1">Foto Profil Toko</label>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 relative bg-gray-200 rounded-full overflow-hidden shrink-0 border border-border">
                        {formData.logoUrl ? (
                          <Image src={formData.logoUrl} alt="Logo Toko" fill className="object-cover" sizes="80px" />
                        ) : (
                          <Store className="w-8 h-8 text-text-secondary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                        )}
                      </div>
                      <div>
                        <input 
                          type="file" 
                          accept="image/*"
                          id="store-logo"
                          className="hidden"
                          ref={fileInputRef}
                          onChange={handleImageChange}
                        />
                        <label 
                          htmlFor="store-logo"
                          className="btn-outline px-4 py-2 flex items-center gap-2 cursor-pointer text-sm"
                        >
                          <Upload className="w-4 h-4" /> Ubah Foto
                        </label>
                        <p className="text-caption text-text-secondary mt-2">Format: JPG/PNG. Maks 2MB.</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-body-small font-medium text-text-secondary mb-1">Nama Toko *</label>
                    <input 
                      type="text" 
                      required
                      value={formData.storeName}
                      onChange={(e) => setFormData({...formData, storeName: e.target.value})}
                      className="input-field w-full"
                      placeholder="Masukkan nama UMKM Anda"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-body-small font-medium text-text-secondary mb-1">Email *</label>
                    <input 
                      type="email" 
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="input-field w-full"
                      placeholder="Masukkan alamat email Anda"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-body-small font-medium text-text-secondary mb-1">Password Lama</label>
                    <div className="relative">
                      <input 
                        type={showOldPassword ? "text" : "password"} 
                        value={formData.oldPassword}
                        onChange={(e) => setFormData({...formData, oldPassword: e.target.value})}
                        className="input-field w-full pr-10"
                        placeholder="Masukkan password lama untuk mengubahnya"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowOldPassword(!showOldPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary focus:outline-none"
                      >
                        {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-body-small font-medium text-text-secondary mb-1">Password Baru</label>
                    <div className="relative">
                      <input 
                        type={showNewPassword ? "text" : "password"} 
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        className="input-field w-full pr-10 bg-brand-primary/5 focus:bg-brand-primary/10 border-brand-primary/20 focus:border-brand-primary/50 transition-colors"
                        placeholder="Kosongkan jika tidak ingin mengubah password"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-primary/70 hover:text-brand-primary focus:outline-none"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-body-small font-medium text-text-secondary mb-1">Alamat Toko</label>
                    <textarea 
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      className="input-field w-full min-h-[100px] py-3"
                      placeholder="Masukkan alamat lengkap toko"
                    ></textarea>
                  </div>

                  <div>
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <label htmlFor="store-description" className="block text-body-small font-medium text-text-secondary">
                        Deskripsi Toko
                      </label>
                      <span className="text-caption text-text-secondary">
                        {formData.description.length}/500
                      </span>
                    </div>
                    <textarea
                      id="store-description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      maxLength={500}
                      rows={4}
                      className="input-field w-full resize-y py-3"
                      placeholder="Ceritakan tentang toko dan produk unggulan Anda"
                    />
                    <p className="text-caption text-text-secondary mt-1">
                      Deskripsi ini akan ditampilkan pada halaman toko yang dilihat pembeli.
                    </p>
                  </div>

                  <div>
                    <label className="block text-body-small font-medium text-text-secondary mb-1">Kategori Produk</label>
                    <select 
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="input-field w-full"
                    >
                      <option value="">Pilih Kategori</option>
                      <option value="Makanan Berat">Makanan Berat</option>
                      <option value="Jajanan / Snack">Jajanan / Snack</option>
                      <option value="Minuman">Minuman</option>
                      <option value="Bahan Mentah">Bahan Mentah</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-body-small font-medium text-text-secondary mb-1">Informasi Rekening Bank</label>
                    <input 
                      type="text" 
                      value={formData.bankAccount}
                      onChange={(e) => setFormData({...formData, bankAccount: e.target.value})}
                      className="input-field w-full"
                      placeholder="Contoh: BCA - 1234567890 a.n Budi"
                    />
                    <p className="text-caption text-text-secondary mt-1">Rekening ini digunakan untuk pencairan dana (payout) hasil penjualan Anda.</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-border flex justify-end">
                  <button type="submit" disabled={isSaving} className="btn-primary min-w-[150px]">
                    {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </form>

              {/* Mobile Logout Button (Visible only on mobile since desktop has it in sidebar) */}
              <div className="md:hidden mt-8 border-t border-border pt-8">
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 p-4 rounded-xl font-medium text-status-error bg-status-error/10 hover:bg-status-error hover:text-white transition-all cursor-pointer"
                >
                  <LogOut className="w-5 h-5" />
                  Keluar dari Akun
                </button>
              </div>
            </div>
          )}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-border px-4 py-2 flex justify-between items-end pb-8 shadow-[0_-4px_15px_rgba(0,0,0,0.05)] text-[10px] font-medium rounded-t-2xl">
        <Link href="/" className="flex flex-col items-center gap-1.5 w-[20%] text-text-secondary hover:text-brand-primary pb-2">
          <Store className="w-6 h-6 stroke-[1.5]" />
          <span>Beranda</span>
        </Link>
        
        <button 
          onClick={() => handleTabChange('produk')} 
          className={`flex flex-col items-center gap-1.5 w-[20%] transition-colors pb-2 ${activeTab === 'produk' ? 'text-brand-primary font-semibold' : 'text-text-secondary hover:text-brand-primary'}`}
        >
          <Package className={`w-6 h-6 stroke-[1.5] ${activeTab === 'produk' ? 'fill-brand-primary/10 stroke-brand-primary' : ''}`} />
          <span>Produk</span>
        </button>
        
        <div className="w-[20%] flex flex-col justify-end items-center relative pb-2 h-full">
          <div className="absolute bottom-6 flex justify-center w-full">
            <Link 
              href="/seller/product/new" 
              className="w-14 h-14 rounded-full bg-brand-primary text-white flex items-center justify-center shadow-lg hover:bg-brand-primary-hover transition-all transform hover:scale-105"
            >
              <Plus className="w-7 h-7 stroke-2" />
            </Link>
          </div>
          <span className="text-text-secondary mt-1">Tambah</span>
        </div>
        
        <button 
          onClick={() => handleTabChange('keuangan')} 
          className={`flex flex-col items-center gap-1.5 w-[20%] transition-colors pb-2 ${activeTab === 'keuangan' ? 'text-brand-primary font-semibold' : 'text-text-secondary hover:text-brand-primary'}`}
        >
          <DollarSign className={`w-6 h-6 stroke-[1.5] ${activeTab === 'keuangan' ? 'fill-brand-primary/10 stroke-brand-primary' : ''}`} />
          <span>Transaksi</span>
        </button>
        
        <button
          type="button"
          onClick={() => handleTabChange('promosi')}
          className={`flex flex-col items-center gap-1.5 w-[20%] transition-colors pb-2 ${activeTab === 'promosi' ? 'text-brand-primary font-semibold' : 'text-text-secondary hover:text-brand-primary'}`}
        >
          <Megaphone className={`w-6 h-6 stroke-[1.5] ${activeTab === 'promosi' ? 'fill-brand-primary/10 stroke-brand-primary' : ''}`} />
          <span>Promosi</span>
        </button>
      </nav>
    </div>
  );
}
