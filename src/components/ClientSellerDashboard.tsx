"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ShoppingBag, Plus, Package, DollarSign, Settings, LogOut, Info, Menu, X, Upload, Store, Sun, Moon, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import Swal from 'sweetalert2';

type Product = {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  preorderMinQty: number | null;
  currentQty: number | null;
  status: string | null;
  deadlineDate: Date | null;
};

type ClientSellerDashboardProps = {
  profile: any;
  myProducts: Product[];
  activeCount: number;
  waitingCount: number;
  completedCount: number;
  userName: string;
  sellerOrders?: any[];
};

export default function ClientSellerDashboard({
  profile,
  myProducts,
  activeCount,
  waitingCount,
  completedCount,
  userName,
  sellerOrders = []
}: ClientSellerDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'produk' | 'keuangan' | 'pengaturan'>('produk');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
    } else {
      document.documentElement.classList.remove('dark');
      setIsDarkMode(false);
    }
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

  const [formData, setFormData] = useState({
    storeName: profile?.storeName || '',
    address: profile?.address || '',
    category: profile?.category || '',
    bankAccount: profile?.bankAccount || '',
    logoUrl: profile?.logoUrl || ''
  });
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

  const handleTabChange = (tab: 'produk' | 'keuangan' | 'pengaturan') => {
    if (tab === activeTab) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveTab(tab);
      setIsTransitioning(false);
      setIsMobileSidebarOpen(false); // Close mobile sidebar on tab change
    }, 400); // Simulate lazy loading delay
  };

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
      } catch (error: any) {
        Swal.fire('Error', error.message, 'error');
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
        } catch (error: any) {
          Swal.fire('Gagal!', error.message || 'Terjadi kesalahan.', 'error');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenChat = (orderId: string, buyerName: string, productName: string) => {
    const chatKey = `chat_${orderId}`;
    let chatHistory = JSON.parse(localStorage.getItem(chatKey) || '[]');
    
    let updated = false;
    chatHistory = chatHistory.map((c: any) => {
      if (c.sender === 'buyer' && !c.isRead) {
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
        { sender: 'buyer', text: `Permisi, apakah pesanan <b>${productName}</b> saya sudah diproses?`, time: '10:04 WIB', isRead: true }
      ];
      localStorage.setItem(chatKey, JSON.stringify(chatHistory));
    }

    const renderMsgs = () => chatHistory.map((c: any) => {
      const isMe = c.sender === 'seller';
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
      title: `Chat: ${buyerName}`,
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
          
          const newMsgObj = { sender: 'seller', text: msg, time: time, isRead: false };
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
        <header className="md:hidden bg-surface border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-brand-primary" />
            <span className="text-h3 text-brand-primary font-bold">pesanku</span>
          </div>
          <div className="flex items-center gap-2">
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
            {activeTab === 'produk' && (
            <>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                  <h1 className="text-h1 mb-1">Produk Preorder</h1>
                  <p className="text-body-base text-text-secondary">Kelola semua produk makanan & minuman preorder Anda di sini.</p>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={toggleDarkMode}
                    className="p-2 rounded-full hover:bg-border/60 dark:hover:bg-slate-800 transition-colors relative overflow-hidden flex items-center justify-center w-10 h-10 border border-border hover-btn cursor-pointer shadow-sm"
                    aria-label="Toggle Dark Mode"
                    title={isDarkMode ? "Ganti ke Light Mode" : "Ganti ke Dark Mode"}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {isDarkMode ? (
                        <motion.div
                          key="moon"
                          initial={{ y: -30, opacity: 0, rotate: -90 }}
                          animate={{ y: 0, opacity: 1, rotate: 0 }}
                          exit={{ y: 30, opacity: 0, rotate: 90 }}
                          transition={{ duration: 0.3 }}
                          className="absolute"
                        >
                          <Moon className="w-5 h-5 text-brand-secondary" />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="sun"
                          initial={{ y: 30, opacity: 0, rotate: 90 }}
                          animate={{ y: 0, opacity: 1, rotate: 0 }}
                          exit={{ y: -30, opacity: 0, rotate: -90 }}
                          transition={{ duration: 0.3 }}
                          className="absolute"
                        >
                          <Sun className="w-5 h-5 text-brand-secondary" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>
                  <Link href="/seller/product/new" className="btn-primary flex items-center gap-2 whitespace-nowrap">
                    <Plus className="w-5 h-5" />
                    Tambah Produk
                  </Link>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="card p-6">
                  <h3 className="text-body-small text-text-secondary mb-2">Total Produk Aktif</h3>
                  <p className="text-display-1 font-bold">{activeCount}</p>
                </div>
                <div className="card p-6 border-brand-primary border-2 shadow-sm">
                  <h3 className="text-body-small text-text-secondary mb-2">Preorder Menunggu Kuota</h3>
                  <p className="text-display-1 font-bold text-brand-primary">{waitingCount}</p>
                </div>
                <div className="card p-6">
                  <h3 className="text-body-small text-text-secondary mb-2">Preorder Selesai / Dikirim</h3>
                  <p className="text-display-1 font-bold text-status-success">{completedCount}</p>
                </div>
              </div>

              {/* Product List */}
              <div className="card overflow-hidden">
                <div className="p-5 border-b border-border bg-surface/50 flex justify-between items-center">
                  <h2 className="text-h3">Daftar Produk</h2>
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
                          <th className="p-4 font-medium">Progress Kuota</th>
                          <th className="p-4 font-medium">Status & Deadline</th>
                          <th className="p-4 font-medium text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="text-body-base">
                        {localProducts.map(product => {
                          const current = product.currentQty || 0;
                          const min = product.preorderMinQty || 1;
                          const pct = Math.min((current / min) * 100, 100);
                          const isFull = current >= min;
                          
                          let deadlineText = "-";
                          if (product.deadlineDate) {
                            deadlineText = new Date(product.deadlineDate).toLocaleDateString('id-ID');
                          }

                          return (
                            <tr key={product.id} className="border-b border-border hover:bg-surface/80 dark:hover:bg-slate-800/80 transition-colors">
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 relative bg-gray-200 rounded-md overflow-hidden shrink-0">
                                    {product.imageUrl && (
                                      <Image src={product.imageUrl} alt={product.name} fill className="object-cover" sizes="48px" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-text-primary line-clamp-1">{product.name}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 font-medium">Rp {product.price.toLocaleString('id-ID')}</td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">{current} / {min}</span>
                                  <div className="w-16 bg-border h-1.5 rounded-full overflow-hidden">
                                    <div className={`${isFull ? 'bg-brand-accent' : 'bg-brand-secondary'} h-full rounded-full`} style={{ width: `${pct}%` }}></div>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4">
                                <span className={`inline-block px-2 py-1 rounded text-caption font-semibold mb-1 ${isFull ? 'bg-brand-accent/20 text-brand-accent' : 'bg-brand-secondary/20 text-brand-secondary'}`}>
                                  {isFull ? 'Kuota Tercapai' : 'Menunggu Kuota'}
                                </span>
                                <p className="text-caption text-text-secondary">s/d {deadlineText}</p>
                              </td>
                              <td className="p-4 text-right">
                                <div className="flex justify-end gap-3 items-center">
                                  <button 
                                    onClick={() => {
                                      Swal.fire({
                                        title: 'Edit Produk',
                                        html: `
                                          <div class="flex flex-col gap-4 text-left mt-4">
                                            <div>
                                              <label class="text-caption text-text-secondary mb-1 block">Nama Produk</label>
                                              <input id="swal-edit-name" class="input-field w-full text-text-primary bg-base border border-border rounded-md px-3 py-2 focus:border-brand-primary focus:outline-none" value="${product.name}">
                                            </div>
                                            <div>
                                              <label class="text-caption text-text-secondary mb-1 block">Harga (Rp)</label>
                                              <input id="swal-edit-price" type="number" class="input-field w-full text-text-primary bg-base border border-border rounded-md px-3 py-2 focus:border-brand-primary focus:outline-none" value="${product.price}">
                                            </div>
                                            <div>
                                              <label class="text-caption text-text-secondary mb-1 block">Minimal Kuota Preorder</label>
                                              <input id="swal-edit-min" type="number" class="input-field w-full text-text-primary bg-base border border-border rounded-md px-3 py-2 focus:border-brand-primary focus:outline-none" value="${product.preorderMinQty || 1}">
                                            </div>
                                          </div>
                                        `,
                                        showCancelButton: true,
                                        confirmButtonText: 'Simpan Perubahan',
                                        cancelButtonText: 'Batal',
                                        confirmButtonColor: '#ff5c35',
                                        cancelButtonColor: '#94a3b8',
                                        customClass: {
                                          popup: 'dark:bg-slate-900 dark:text-white rounded-xl border border-border shadow-2xl',
                                          title: 'dark:text-white text-h3',
                                        },
                                        preConfirm: () => {
                                          const name = (document.getElementById('swal-edit-name') as HTMLInputElement).value;
                                          const price = (document.getElementById('swal-edit-price') as HTMLInputElement).value;
                                          const min = (document.getElementById('swal-edit-min') as HTMLInputElement).value;
                                          
                                          if (!name || !price || !min) {
                                            Swal.showValidationMessage('Semua kolom wajib diisi!');
                                            return false;
                                          }
                                          return { name, price: parseInt(price), min: parseInt(min) };
                                        }
                                      }).then((result) => {
                                        if (result.isConfirmed) {
                                          Swal.fire({
                                            title: 'Menyimpan...',
                                            allowOutsideClick: false,
                                            customClass: {
                                              popup: 'dark:bg-slate-900 dark:text-white rounded-xl border border-border shadow-2xl',
                                              title: 'dark:text-white'
                                            },
                                            didOpen: () => Swal.showLoading()
                                          });
                                          
                                          // Simulate API update
                                          setTimeout(() => {
                                            Swal.fire({
                                              icon: 'success',
                                              title: 'Berhasil',
                                              text: 'Produk berhasil diperbarui!',
                                              timer: 1500,
                                              showConfirmButton: false,
                                              customClass: {
                                                popup: 'dark:bg-slate-900 dark:text-white rounded-xl border border-border shadow-2xl',
                                                title: 'dark:text-white'
                                              }
                                            }).then(() => {
                                              // In real app we update the DB here
                                              window.location.reload();
                                            });
                                          }, 800);
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

          {activeTab === 'keuangan' && (
            <div className="space-y-6">
              <h1 className="text-h1 mb-1">Keuangan & Saldo</h1>
              <p className="text-body-base text-text-secondary mb-8">Pantau penghasilan dan transaksi pesanan Anda di sini.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="card p-6 border-status-success border-2 shadow-sm">
                  <h3 className="text-body-small text-text-secondary mb-2">Total Saldo Bersih</h3>
                  <p className="text-display-1 font-bold text-status-success">
                    Rp {sellerOrders.filter(o => o.status === 'completed' || o.status === 'verified').reduce((acc, curr) => acc + curr.totalPrice, 0).toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="card p-6">
                  <h3 className="text-body-small text-text-secondary mb-2">Menunggu Pembayaran / Verifikasi</h3>
                  <p className="text-display-1 font-bold text-status-warning">
                    Rp {sellerOrders.filter(o => o.status === 'waiting_verification').reduce((acc, curr) => acc + curr.totalPrice, 0).toLocaleString('id-ID')}
                  </p>
                </div>
              </div>

              <div className="card overflow-hidden">
                <div className="p-5 border-b border-border bg-surface/50 flex justify-between items-center">
                  <h2 className="text-h3">Daftar Transaksi Pesanan</h2>
                </div>
                
                <div className="overflow-x-auto">
                  {sellerOrders.length === 0 ? (
                    <div className="p-10 text-center text-text-secondary flex flex-col items-center">
                      <Info className="w-12 h-12 text-brand-secondary/50 mb-4" />
                      <p>Belum ada transaksi. Terus promosikan pre-order Anda!</p>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border text-body-small text-text-secondary bg-surface/30">
                          <th className="p-4 font-medium">Order ID</th>
                          <th className="p-4 font-medium">Produk & Pembeli</th>
                          <th className="p-4 font-medium">Total Bayar</th>
                          <th className="p-4 font-medium">Bukti Bayar</th>
                          <th className="p-4 font-medium">Bukti Delivery</th>
                          <th className="p-4 font-medium text-right">Aksi Status</th>
                        </tr>
                      </thead>
                      <tbody className="text-body-base">
                        {sellerOrders.map(order => (
                          <tr key={order.id} className="border-b border-border hover:bg-surface/80 dark:hover:bg-slate-800/80 transition-colors">
                            <td className="p-4 font-mono font-medium text-sm text-text-secondary">{order.id}</td>
                            <td className="p-4">
                              <p className="font-semibold text-text-primary line-clamp-1">{order.productName}</p>
                              <p className="text-xs text-text-secondary mt-1">Pembeli: {order.buyerName}</p>
                            </td>
                            <td className="p-4 font-semibold text-brand-primary">Rp {order.totalPrice.toLocaleString('id-ID')}</td>
                            <td className="p-4">
                              {order.proofUrl ? (
                                <button 
                                  onClick={() => {
                                    Swal.fire({
                                      title: `Bukti Pembayaran`,
                                      imageUrl: order.proofUrl,
                                      imageWidth: 400,
                                      imageAlt: 'Bukti Pembayaran',
                                      text: `Total: Rp ${order.totalPrice.toLocaleString('id-ID')}`,
                                      confirmButtonText: 'Tutup',
                                      confirmButtonColor: '#ff5c35',
                                      customClass: {
                                        popup: 'dark:bg-slate-900 dark:text-white',
                                        title: 'dark:text-white'
                                      }
                                    });
                                  }}
                                  className="text-brand-secondary-dark dark:text-brand-secondary font-medium underline hover:text-brand-primary transition-colors text-sm"
                                >
                                  Lihat Bukti
                                </button>
                              ) : (
                                <span className="text-text-secondary text-sm italic">Belum ada</span>
                              )}
                            </td>
                            <td className="p-4">
                              {order.deliveryProofUrl ? (
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
                                  className="text-brand-secondary-dark dark:text-brand-secondary font-medium underline hover:text-brand-primary transition-colors text-sm"
                                >
                                  Lihat Bukti
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleUploadDeliveryProof(order.id)}
                                  className="btn-outline border-brand-secondary/40 text-brand-secondary hover:bg-brand-secondary/10 hover:border-brand-secondary py-1 px-2.5 text-xs font-semibold rounded-xl transition-all"
                                >
                                  Upload Bukti
                                </button>
                              )}
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => handleOpenChat(order.id, order.buyerName || 'Pembeli', order.productName)}
                                  className="btn-outline border-brand-primary/40 text-brand-primary hover:bg-brand-primary/10 hover:border-brand-primary p-1.5 rounded-full transition-all"
                                  title="Chat dengan Pembeli"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                </button>
                                <select
                                className={`text-xs font-semibold rounded-full border px-3 py-1.5 outline-none cursor-pointer appearance-none text-center ${
                                  order.status === 'completed' ? 'bg-status-success/10 text-status-success border-status-success/20' : 
                                  order.status === 'verified' ? 'bg-brand-secondary/10 text-brand-secondary border-brand-secondary/20' : 
                                  order.status === 'waiting_verification' ? 'bg-status-warning/10 text-status-warning border-status-warning/20' : 
                                  order.status === 'cancelled' ? 'bg-status-error/10 text-status-error border-status-error/20' : 
                                  'bg-border/60 text-text-secondary border-border'
                                }`}
                                defaultValue={order.status}
                                onChange={async (e) => {
                                  const newStatus = e.target.value;
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
                                    
                                    if (!res.ok) {
                                      throw new Error(data.error || 'Gagal memperbarui status');
                                    }
                                    
                                    Swal.fire({
                                      icon: 'success',
                                      title: 'Berhasil',
                                      text: 'Status pesanan diperbarui!',
                                      timer: 1500,
                                      showConfirmButton: false
                                    }).then(() => {
                                      window.location.reload();
                                    });
                                  } catch (error: any) {
                                    Swal.fire('Error', error.message || 'Gagal memperbarui status', 'error');
                                  }
                                }}
                              >
                                <option value="waiting_verification" className="text-text-primary bg-base">Pending</option>
                                <option value="verified" className="text-text-primary bg-base">Diproses (Verifikasi)</option>
                                <option value="completed" className="text-text-primary bg-base">Selesai</option>
                                <option value="cancelled" className="text-status-error bg-base">Batalkan</option>
                              </select>
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
                    <label className="block text-body-small font-medium text-text-secondary mb-1">Alamat Toko</label>
                    <textarea 
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      className="input-field w-full min-h-[100px] py-3"
                      placeholder="Masukkan alamat lengkap toko"
                    ></textarea>
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
          onClick={() => handleTabChange('pengaturan')} 
          className={`flex flex-col items-center gap-1.5 w-[20%] transition-colors pb-2 ${activeTab === 'pengaturan' ? 'text-brand-primary font-semibold' : 'text-text-secondary hover:text-brand-primary'}`}
        >
          {profile?.logoUrl ? (
            <div className={`w-6 h-6 rounded-full overflow-hidden border-[1.5px] ${activeTab === 'pengaturan' ? 'border-brand-primary ring-2 ring-brand-primary/20' : 'border-border'}`}>
              <Image src={profile.logoUrl} alt="Profil" width={24} height={24} className="object-cover w-full h-full" />
            </div>
          ) : (
            <div className="relative">
              <Settings className={`w-6 h-6 stroke-[1.5] ${activeTab === 'pengaturan' ? 'fill-brand-primary/10 stroke-brand-primary' : ''}`} />
              {activeTab === 'pengaturan' && (
                <div className="absolute inset-0 rounded-full ring-2 ring-brand-primary/20 scale-110" />
              )}
            </div>
          )}
          <span>Profil</span>
        </button>
      </nav>
    </div>
  );
}
