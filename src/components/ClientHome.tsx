"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, Search, ShoppingBag, Menu, X, Heart, ChevronUp, Sun, Moon, LogOut, User, FileText, Home, ShoppingCart, LayoutDashboard } from "lucide-react";
import { motion, Variants, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: [0, -8, 0],
    transition: {
      opacity: { duration: 0.5 },
      y: { repeat: Infinity, duration: 4, ease: "easeInOut", delay: Math.random() * 2 }
    }
  }
};

export default function ClientHome({ initialProducts, totalSold, user }: { initialProducts: any[], totalSold: number, user?: any }) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [greeting, setGreeting] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check initial mode
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const [orderCount, setOrderCount] = useState(0);
  const [hasActiveOrder, setHasActiveOrder] = useState(false);

  useEffect(() => {
    if (user && user.role === 'pembeli') {
      fetch('/api/orders')
        .then(res => res.json())
        .then(data => {
          if (typeof data.count === 'number') {
            setOrderCount(data.count);
          }
          if (typeof data.hasActiveOrder === 'boolean') {
            setHasActiveOrder(data.hasActiveOrder);
          }
        })
        .catch(console.error);
    }
  }, [user]);

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

  const handleCheckout = async (e: React.MouseEvent, product: any) => {
    e.preventDefault();
    e.stopPropagation();

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
          window.location.href = '/login';
        }
      });
      return;
    }

    if (user.role === 'penjual' || user.role === 'admin') {
      Swal.fire('Akses Ditolak', 'Hanya akun pembeli yang dapat melakukan pemesanan.', 'warning');
      return;
    }
    
    const globalMinQty = product.preorderMinQty || product.minQty || 10;
    const currentQty = product.currentQty || 0;
    const buyerMinQty = product.minOrderQty || 1;

    const isFull = currentQty >= globalMinQty;

    const confirmResult = await Swal.fire({
      title: 'Checkout Cepat',
      html: `
        <div class="text-left font-sans mt-2 max-h-[70vh] overflow-y-auto px-1 pb-4">
          
          <!-- Image -->
          <div class="w-full h-48 rounded-2xl bg-base dark:bg-border overflow-hidden relative mb-4">
            ${product.imageUrl ? `<img src="${product.imageUrl}" class="w-full h-full object-contain" />` : `<div class="w-full h-full flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-text-secondary/50"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg></div>`}
            ${product.status === 'active' ? `<div class="absolute top-3 left-3 bg-brand-primary text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Preorder Terbuka</div>` : ''}
          </div>

          <!-- Product Details -->
          <div class="bg-base p-4 rounded-xl border border-border mb-4">
            <div class="flex justify-between items-start mb-1">
              <h2 class="text-lg font-bold text-text-primary">${product.name}</h2>
              ${product.batchCategory ? `<span class="bg-brand-secondary/20 text-brand-secondary-dark dark:text-brand-secondary px-2 py-1 rounded text-[10px] font-bold border border-brand-secondary/30">${product.batchCategory}</span>` : ''}
            </div>
            <p class="text-xl font-bold text-brand-primary mb-4">Rp ${product.price.toLocaleString('id-ID')}</p>
            <div>
              <p class="text-sm font-semibold text-text-primary mb-1">Deskripsi Makanan</p>
              <p class="text-sm text-text-secondary whitespace-pre-wrap">${product.description || 'Tidak ada deskripsi.'}</p>
            </div>
          </div>

          <!-- Seller Info -->
          <div class="flex items-center gap-3 mb-6 bg-base p-4 rounded-xl border border-border">
            <div class="w-10 h-10 bg-brand-primary/10 rounded-full flex items-center justify-center text-brand-primary shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/><path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"/><path d="M12 3v6"/></svg>
            </div>
            <div>
              <h3 class="font-bold text-text-primary text-sm line-clamp-1">${product.sellerName || 'Toko UMKM'}</h3>
              <span class="px-2 py-0.5 bg-status-success/10 text-status-success text-[10px] rounded-full font-medium inline-block mt-1">UMKM Terverifikasi</span>
            </div>
          </div>

          <h3 class="font-bold text-lg mb-4">Atur Pesanan</h3>
          <div class="bg-base p-4 rounded-xl border border-border mb-6">
            <div class="flex flex-col gap-2 text-sm font-medium">
              <div class="flex justify-between">
                <span class="text-text-secondary">Minimal Order</span>
                <span class="text-text-primary font-bold">${buyerMinQty} Porsi</span>
              </div>
              <div class="flex justify-between">
                <span class="text-text-secondary">Stok Tersedia</span>
                <span class="text-text-primary font-bold">${Math.max(0, (product.stock || 0) - (product.currentQty || 0))} Porsi</span>
              </div>
              ${product.processingTime ? `
              <div class="flex justify-between pt-2 border-t border-border mt-1">
                <span class="text-text-secondary">Waktu Proses</span>
                <span class="text-brand-primary font-bold">${product.processingTime}</span>
              </div>
              ` : ''}
            </div>
          </div>

          <!-- Qty -->
          <label class="text-sm font-semibold text-text-primary block mb-2">Jumlah Porsi</label>
          <div class="flex items-center border border-border rounded-lg bg-base w-max mb-1 overflow-hidden">
            <button type="button" id="swal-btn-minus" class="px-4 py-2 hover:bg-border/50 border-r border-border font-bold transition-colors w-12 flex justify-center items-center">-</button>
            <input id="swal-input-qty" type="number" readonly value="${buyerMinQty}" class="w-16 text-center bg-transparent font-bold outline-none m-0 p-0" />
            <button type="button" id="swal-btn-plus" class="px-4 py-2 hover:bg-border/50 border-l border-border font-bold transition-colors w-12 flex justify-center items-center">+</button>
          </div>
          <p class="text-xs text-text-secondary mb-5 font-medium">Minimal: ${buyerMinQty} Porsi</p>

          <!-- Notes -->
          <label class="text-sm font-semibold text-text-primary block mb-2">Catatan Tambahan <span class="text-text-secondary font-normal">(Opsional)</span></label>
          <textarea id="swal-input-notes" placeholder="Contoh: Jangan terlalu pedas ya kak..." class="w-full text-sm bg-base border border-border rounded-xl px-4 py-3 outline-none focus:border-brand-primary placeholder:text-text-secondary/50 min-h-[80px] resize-y mb-2"></textarea>

          <!-- Total -->
          <div class="flex justify-between items-center mt-6 border-t border-border pt-4">
            <span class="text-text-secondary font-medium">Total Harga</span>
            <span id="swal-total-price" class="text-xl font-bold text-brand-primary tracking-tight">Rp ${(buyerMinQty * product.price).toLocaleString('id-ID')}</span>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Pesan Sekarang',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#ff5c35',
      cancelButtonColor: '#94a3b8',
      customClass: {
        popup: 'bg-surface text-text-primary rounded-3xl w-full max-w-md border border-border',
        title: 'text-left text-xl font-bold border-b border-border pb-4 w-full m-0 p-0 text-text-primary',
        htmlContainer: 'm-0 p-0 overflow-hidden text-text-primary',
        actions: 'w-full grid border-t border-border mt-0 pt-4 px-4 pb-4',
        confirmButton: 'w-full py-3.5 text-lg rounded-xl shadow-lg order-1',
        cancelButton: 'w-full bg-transparent hover:underline text-text-secondary shadow-none order-2 mt-2'
      },
      didOpen: () => {
        const btnMinus = document.getElementById('swal-btn-minus');
        const btnPlus = document.getElementById('swal-btn-plus');
        const inputQty = document.getElementById('swal-input-qty') as HTMLInputElement;
        const totalPriceEl = document.getElementById('swal-total-price');
        const progressTextEl = document.getElementById('swal-progress-text');
        const progressBarEl = document.getElementById('swal-progress-bar');

        if (btnMinus && btnPlus && inputQty && totalPriceEl) {
          const updateDisplay = (newQty: number) => {
            inputQty.value = newQty.toString();
            totalPriceEl.innerHTML = `Rp ${(newQty * product.price).toLocaleString('id-ID')}`;
            
              // We no longer have progress bar to update
          };

          btnMinus.onclick = () => {
            let current = parseInt(inputQty.value);
            if (current > buyerMinQty) {
              updateDisplay(current - 1);
            }
          };

          btnPlus.onclick = () => {
            let current = parseInt(inputQty.value);
            let availableStock = Math.max(0, (product.stock || 0) - (product.currentQty || 0));
            if (current < availableStock) {
              updateDisplay(current + 1);
            } else {
              Swal.showValidationMessage(`Stok tidak mencukupi (Tersisa ${availableStock} porsi)`);
              setTimeout(() => Swal.resetValidationMessage(), 2000);
            }
          };
        }
      },
      preConfirm: () => {
        const inputQty = document.getElementById('swal-input-qty') as HTMLInputElement;
        const inputNotes = document.getElementById('swal-input-notes') as HTMLTextAreaElement;
        
        return {
          qty: inputQty ? parseInt(inputQty.value) : buyerMinQty,
          notes: inputNotes ? inputNotes.value : ''
        };
      }
    });

    if (!confirmResult.isConfirmed || !confirmResult.value) return;

    const finalQty = confirmResult.value.qty;
    const finalNotes = confirmResult.value.notes;
    const finalTotalPrice = finalQty * product.price;

    Swal.close();
    router.push(`/process-order?productId=${product.id}&qty=${finalQty}&notes=${encodeURIComponent(finalNotes)}`);
  };

  useEffect(() => {
    const now = new Date();
    const utcHours = now.getUTCHours();
    const wibHours = (utcHours + 7) % 24;
    
    let text = "Selamat malam";
    if (wibHours >= 5 && wibHours < 11) {
      text = "Selamat pagi";
    } else if (wibHours >= 11 && wibHours < 15) {
      text = "Selamat siang";
    } else if (wibHours >= 15 && wibHours < 18) {
      text = "Selamat sore";
    }
    
    setGreeting(`${text}, ${user?.name || 'Pengunjung'}`);
  }, [user?.name]);

  // Removed local isLoading in favor of GlobalLoader

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  const filteredProducts = initialProducts.filter(product => {
    const productName = product.name || '';
    const sellerName = product.sellerName || '';
    const query = searchQuery || '';
    
    return productName.toLowerCase().includes(query.toLowerCase()) || 
           sellerName.toLowerCase().includes(query.toLowerCase());
  });

  return (
    <>
      <header className="bg-surface/80 backdrop-blur-md border-b border-border sticky top-0 z-50 transition-all">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:scale-105 transition-transform">
            <motion.div
              className="flex items-center gap-2"
              animate={{ y: [0, -3, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            >
              <ShoppingBag className="w-8 h-8 text-brand-primary" />
              <span className="text-h2 text-brand-primary font-bold tracking-tight">pesanku</span>
            </motion.div>
          </Link>
          
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full group">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                placeholder="Cari makanan atau minuman..." 
                className="input-field pl-10 pr-10 rounded-full bg-base focus:bg-surface transition-all duration-300 border-transparent focus:border-brand-primary/50 focus:ring-4 focus:ring-brand-primary/10"
              />
              <Search className="w-5 h-5 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-brand-primary transition-colors" />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary p-1 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              
              {/* Desktop Search Dropdown */}
              {searchQuery && isSearchFocused && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-xl shadow-lg overflow-hidden z-50">
                  <div className="max-h-60 overflow-y-auto">
                    {filteredProducts.length > 0 ? (
                      filteredProducts.slice(0, 5).map(product => (
                        <button
                          key={product.id}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setSearchQuery(product.name);
                            setIsSearchFocused(false);
                            router.push(`/product/${product.id}`);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-brand-primary/5 border-b border-border last:border-b-0 flex items-center gap-3 transition-colors"
                        >
                          {product.imageUrl ? (
                            <div className="w-10 h-10 rounded-lg bg-base overflow-hidden shrink-0">
                              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-base flex items-center justify-center shrink-0">
                              <ShoppingBag className="w-5 h-5 text-text-secondary" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-text-primary truncate">{product.name}</p>
                            <p className="text-xs text-text-secondary truncate">Rp {product.price?.toLocaleString('id-ID')} • {(product.sellerName || 'Toko').toUpperCase()}</p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-4 text-center text-sm text-text-secondary">
                        Pencarian tidak ditemukan
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <button 
              onClick={toggleDarkMode}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-border transition-colors relative overflow-hidden flex items-center justify-center w-10 h-10 border border-border"
              aria-label="Toggle Dark Mode"
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

            {greeting && (
              <span className="text-body-small font-semibold text-brand-primary mr-2 hidden lg:inline-block">
                {greeting}
              </span>
            )}
            <Link href="/seller" className="text-body-small font-medium text-text-secondary hover:text-brand-primary transition-colors">
              Mulai Berjualan
            </Link>
            
            {user ? (
              <div className="flex items-center gap-2">
                <Link 
                  href={user.role === 'admin' ? '/admin' : user.role === 'penjual' ? '/seller' : '/buyer/orders'} 
                  className="btn-primary flex items-center gap-2 shadow-lg shadow-brand-primary/20 hover:shadow-brand-primary/40 relative"
                >
                  {user.role === 'admin' || user.role === 'penjual' ? 'Dashboard' : 'Lihat Pesanan Saya'}
                  {user.role === 'pembeli' && orderCount > 0 && (
                    <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center absolute -top-2 -right-2 border-2 border-white shadow-sm">
                      {orderCount}
                    </span>
                  )}
                </Link>
                <button 
                  onClick={handleLogout}
                  className="btn-outline border-status-error/40 text-status-error hover:bg-status-error/10 hover:border-status-error flex items-center gap-1.5 py-2 px-3 text-sm font-semibold rounded-xl transition-all"
                  title="Keluar / Logout"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden lg:inline">Keluar</span>
                </button>
              </div>
            ) : (
              <>
                <Link href="/login" className="btn-outline hover:bg-brand-primary/5">
                  Masuk
                </Link>
                <Link href="/register" className="btn-primary shadow-lg shadow-brand-primary/20 hover:shadow-brand-primary/40">
                  Daftar
                </Link>
              </>
            )}
          </div>
          
          <div className="md:hidden flex items-center gap-1 relative right-2">
            {user && (user.role === 'admin' || user.role === 'penjual') && (
              <Link
                href={user.role === 'admin' ? '/admin' : '/seller'}
                className="p-2 rounded-full hover:bg-brand-primary/10 transition-colors relative flex items-center justify-center w-10 h-10 group"
                aria-label="Dashboard"
                title="Buka Dashboard"
              >
                <LayoutDashboard className="w-5 h-5 text-text-primary group-hover:text-brand-primary transition-colors" />
              </Link>
            )}
            
            {/* Mobile Search Toggle */}
            <button 
              onClick={() => {
                setIsMobileSearchOpen(!isMobileSearchOpen);
                if (!isMobileSearchOpen) setTimeout(() => document.querySelector<HTMLInputElement>('#mobile-search')?.focus(), 100);
              }}
              className="p-2 rounded-full hover:bg-brand-primary/10 transition-colors relative flex items-center justify-center w-10 h-10"
              aria-label="Toggle Search"
            >
              <Search className={`w-5 h-5 ${isMobileSearchOpen ? 'text-brand-primary' : 'text-text-primary'}`} />
            </button>
            
            {/* Mobile Theme Toggle */}
            <button 
              onClick={toggleDarkMode}
              className="p-2 rounded-full hover:bg-brand-primary/10 transition-colors relative overflow-hidden flex items-center justify-center w-10 h-10"
              aria-label="Toggle Dark Mode"
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
                  <Moon className="w-5 h-5 text-brand-primary" />
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
                  <Sun className="w-5 h-5 text-brand-primary" />
                </motion.div>
              )}
            </AnimatePresence>
            </button>
          </div>
        </div>

        {/* Mobile Search Input Dropdown */}
        <AnimatePresence>
          {isMobileSearchOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden bg-surface border-b border-border shadow-sm absolute w-full left-0 top-[64px] z-40"
            >
              <div className="p-4">
                <div className="relative w-full">
                  <input 
                    id="mobile-search"
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                    placeholder="Cari makanan atau minuman..." 
                    className="input-field pl-10 pr-10 rounded-xl w-full border-brand-primary/20 focus:border-brand-primary"
                  />
                  <Search className="w-5 h-5 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}

                  {/* Mobile Search Dropdown */}
                  {searchQuery && isSearchFocused && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-xl shadow-lg overflow-hidden z-50">
                      <div className="max-h-60 overflow-y-auto">
                        {filteredProducts.length > 0 ? (
                          filteredProducts.slice(0, 5).map(product => (
                            <button
                              key={product.id}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setSearchQuery(product.name);
                                setIsSearchFocused(false);
                                setIsMobileSearchOpen(false);
                                router.push(`/product/${product.id}`);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-brand-primary/5 border-b border-border last:border-b-0 flex items-center gap-3 transition-colors"
                            >
                              {product.imageUrl ? (
                                <div className="w-10 h-10 rounded-lg bg-base overflow-hidden shrink-0">
                                  <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                </div>
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-base flex items-center justify-center shrink-0">
                                  <ShoppingBag className="w-5 h-5 text-text-secondary" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-text-primary truncate">{product.name}</p>
                                <p className="text-xs text-text-secondary truncate">Rp {product.price?.toLocaleString('id-ID')} • {(product.sellerName || 'Toko').toUpperCase()}</p>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-4 text-center text-sm text-text-secondary">
                            Pencarian tidak ditemukan
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-16 left-0 right-0 bg-surface border-b border-border shadow-lg md:hidden z-40 p-4"
          >
            <div className="flex flex-col gap-4">
              <div className="relative w-full mb-4">
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                  placeholder="Cari makanan atau minuman..." 
                  className="input-field pl-10 pr-10 rounded-full w-full"
                />
                <Search className="w-5 h-5 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                {/* Mobile Menu Search Dropdown */}
                {searchQuery && isSearchFocused && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-xl shadow-lg overflow-hidden z-50">
                    <div className="max-h-60 overflow-y-auto">
                      {filteredProducts.length > 0 ? (
                        filteredProducts.slice(0, 5).map(product => (
                          <button
                            key={product.id}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setSearchQuery(product.name);
                              setIsSearchFocused(false);
                              setIsMobileMenuOpen(false);
                              router.push(`/product/${product.id}`);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-brand-primary/5 border-b border-border last:border-b-0 flex items-center gap-3 transition-colors"
                          >
                            {product.imageUrl ? (
                              <div className="w-10 h-10 rounded-lg bg-base overflow-hidden shrink-0">
                                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-base flex items-center justify-center shrink-0">
                                <ShoppingBag className="w-5 h-5 text-text-secondary" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-text-primary truncate">{product.name}</p>
                              <p className="text-xs text-text-secondary truncate">Rp {product.price?.toLocaleString('id-ID')} • {(product.sellerName || 'Toko').toUpperCase()}</p>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-4 text-center text-sm text-text-secondary">
                          Pencarian tidak ditemukan
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-center mb-2">
                <button 
                  onClick={toggleDarkMode}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-border transition-colors relative overflow-hidden flex items-center justify-center w-10 h-10 border border-border"
                  aria-label="Toggle Dark Mode"
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
              </div>
              {greeting && (
                <div className="text-center font-semibold text-brand-primary pb-2 border-b border-border">
                  {greeting}
                </div>
              )}
              <Link href="/seller" onClick={() => setIsMobileMenuOpen(false)} className="block py-2 text-center font-medium text-text-secondary hover:text-brand-primary">
                Mulai Berjualan
              </Link>
              
              {user ? (
                <div className="flex flex-col gap-2 w-full">
                  <Link 
                    href={user.role === 'admin' ? '/admin' : user.role === 'penjual' ? '/seller' : '/buyer/orders'} 
                    onClick={() => setIsMobileMenuOpen(false)} 
                    className="btn-primary w-full text-center flex items-center justify-center gap-2 relative"
                  >
                    {user.role === 'admin' || user.role === 'penjual' ? 'Dashboard Saya' : 'Lihat Pesanan Saya'}
                    {user.role === 'pembeli' && orderCount > 0 && (
                      <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-sm">
                        {orderCount}
                      </span>
                    )}
                  </Link>
                  <button 
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="btn-outline border-status-error/40 text-status-error hover:bg-status-error/10 w-full flex items-center justify-center gap-2 py-2.5 font-semibold rounded-xl transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Keluar</span>
                  </button>
                </div>
              ) : (
                <>
                  <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="btn-outline w-full text-center">
                    Masuk
                  </Link>
                  <Link href="/register" onClick={() => setIsMobileMenuOpen(false)} className="btn-primary w-full text-center">
                    Daftar
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-16 md:py-20 lg:py-28 px-6 sm:px-8 lg:px-12 min-h-[500px] md:min-h-[550px] lg:min-h-[620px] flex items-center">
          {/* Background Banner */}
          <div className="absolute inset-0 z-0">
            <Image 
              src="/street-food-festival.jpg"
              alt="Background Banner"
              fill
              quality={100}
              sizes="100vw"
              className="object-cover object-center opacity-100 scale-100"
              priority
            />
            {/* Dark overlay for rich contrast and text readability */}
            <div className="absolute inset-0 bg-slate-950/45 dark:bg-slate-950/65 pointer-events-none" />
          </div>
          
          <div className="container mx-auto relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              
              {/* Text Content */}
              <motion.div 
                initial={{ opacity: 0, x: -30 }}
                animate={{ 
                  opacity: 1, 
                  x: 0,
                  y: [0, -10, 0]
                }}
                transition={{ 
                  opacity: { duration: 0.6, ease: "easeOut" },
                  x: { duration: 0.6, ease: "easeOut" },
                  y: { repeat: Infinity, duration: 4, ease: "easeInOut", delay: 0.5 }
                }}
                className="text-left"
              >
                <div className="inline-flex items-center gap-2 mb-6 px-3.5 py-1.5 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-full text-sm font-semibold tracking-wide">
                  100% Dukung UMKM Lokal Indonesia
                  <motion.svg 
                    animate={{ 
                      skewY: [-3, 3, -3],
                      rotate: [-2, 2, -2],
                      y: [0, -1, 0]
                    }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                    viewBox="0 0 3 2" 
                    className="w-4 h-3 rounded-[2px] overflow-hidden border border-white/40 shadow-sm shrink-0 origin-left"
                  >
                    <rect width="3" height="1" y="0" fill="#ef4444" />
                    <rect width="3" height="1" y="1" fill="#ffffff" />
                  </motion.svg>
                </div>
                <h1 className="text-display-1 text-white mb-6 tracking-tight leading-[1.1]">
                  Pesan Makanan UMKM Favoritmu, <span className="text-brand-primary relative inline-block">
                    Kapan Saja
                    <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 100 20" preserveAspectRatio="none">
                      <path d="M0 10 Q 50 20 100 10" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-yellow-400/50" />
                    </svg>
                  </span>
                </h1>
                <p className="text-body-large text-slate-200 mb-10 leading-relaxed max-w-xl">
                  Sistem preorder makanan dan minuman dari UMKM lokal dengan minimum order yang jelas. Rasakan hidangan segar langsung dari tangan ahlinya.
                </p>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-start gap-4">
                  <Link href="#katalog" className="btn-primary text-lg px-8 py-3.5 shadow-xl shadow-brand-primary/25 hover:scale-105 transition-all w-full sm:w-auto text-center">
                    Mulai Belanja
                  </Link>
                  <Link href="/seller" className="text-lg px-8 py-3.5 border border-white/40 hover:border-white text-white hover:bg-white/10 rounded-lg font-medium transition-all duration-200 shadow-sm active:scale-95 hover:shadow-md hover:-translate-y-0.5 cursor-pointer w-full sm:w-auto text-center">
                    Daftar Jadi Penjual
                  </Link>
                </div>
              </motion.div>

              {/* Image Banner */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1, y: [0, -15, 0] }}
                transition={{ 
                  opacity: { duration: 0.8, ease: "easeOut", delay: 0.2 },
                  scale: { duration: 0.8, ease: "easeOut", delay: 0.2 },
                  y: { repeat: Infinity, duration: 4, ease: "easeInOut", delay: 1 }
                }}
                className="relative mb-8 lg:mb-0 lg:mt-0 order-first lg:order-last"
              >
                <div className="relative aspect-[4/3] w-full max-w-lg mx-auto">
                  <div className="absolute inset-0 bg-brand-primary/20 rounded-3xl -rotate-6 scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-brand-secondary/30 rounded-3xl rotate-3 scale-105 transition-transform duration-500" />
                  <div className="relative h-full w-full rounded-3xl overflow-hidden shadow-2xl border-4 border-surface dark:border-border">
                    <Image 
                      src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop" 
                      alt="Berbagai hidangan kuliner nusantara yang lezat"
                      fill
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className="object-cover"
                      priority
                    />
                  </div>
                  
                  {/* Floating Badge */}
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ 
                      y: [0, 8, 0], 
                      opacity: 1 
                    }}
                    transition={{ 
                      opacity: { delay: 0.8, duration: 0.5 },
                      y: { repeat: Infinity, duration: 3, ease: "easeInOut", delay: 1.2 }
                    }}
                    className="absolute -bottom-6 -left-6 bg-surface border border-border p-4 rounded-2xl shadow-xl flex items-center gap-4 z-20"
                  >
                    <div className="w-12 h-12 bg-status-success/20 text-status-success rounded-full flex items-center justify-center">
                      <motion.div
                        animate={{ y: [-3, 3, -3], scale: [1, 1.1, 1] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                      >
                        <ShoppingBag className="w-6 h-6" />
                      </motion.div>
                    </div>
                    <div>
                      <p className="text-body-small text-text-secondary">Produk Terjual</p>
                      <p className="text-h3 font-bold text-text-primary">{totalSold > 0 ? `${totalSold.toLocaleString('id-ID')} Porsi` : 'Belum ada'}</p>
                    </div>
                  </motion.div>
                </div>
              </motion.div>

            </div>
          </div>
        </section>

        {/* Katalog Section */}
        <section id="katalog" className="py-16 px-4 container mx-auto">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="flex justify-between items-end mb-10"
          >
            <div>
              <h2 className="text-h2 mb-2 tracking-tight">Sedang Buka Preorder</h2>
              <p className="text-body-base text-text-secondary">
                {searchQuery ? `Hasil pencarian untuk "${searchQuery}"` : "Dukung UMKM dengan memesan produk yang sedang membuka preorder."}
              </p>
            </div>
          </motion.div>

          {filteredProducts.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: [0, -8, 0] }}
              transition={{ 
                opacity: { duration: 0.5 },
                y: { repeat: Infinity, duration: 4, ease: "easeInOut" }
              }}
              className="text-center py-20 bg-base rounded-2xl border border-border"
            >
              <motion.div
                animate={{ rotate: [-10, 10, -10] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                className="inline-block"
              >
                <Search className="w-16 h-16 text-text-secondary/50 mx-auto mb-4" />
              </motion.div>
              <h3 className="text-h3 text-text-primary mb-2">Tidak ditemukan</h3>
              <p className="text-text-secondary">Coba gunakan kata kunci lain untuk pencarian Anda.</p>
            </motion.div>
          ) : (
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {filteredProducts.map((product) => {
                const progressPercentage = Math.min((product.currentQty / product.minQty) * 100, 100);
                const isFull = product.currentQty >= product.minQty;
                
                // Format deadline
                let deadlineText = "Tidak ada batas waktu";
                if (product.deadlineDate) {
                  deadlineText = new Date(product.deadlineDate).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  });
                }

                return (
                  <motion.div variants={itemVariants} key={product.id}>
                    <Link href={`/product/${product.id}`} className="card block group cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                      <div className="relative aspect-[4/3] overflow-hidden bg-surface dark:bg-border rounded-t-2xl">
                        <Image 
                          src={product.imageUrl} 
                          alt={product.name}
                          fill
                          className="object-contain group-hover:scale-110 transition-transform duration-500 ease-out"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="absolute top-3 left-3">
                          <span className="px-3 py-1.5 rounded-full text-caption font-bold flex items-center gap-1 backdrop-blur-sm shadow-sm bg-brand-secondary/90 text-slate-900 border border-brand-secondary/20">
                            Terbuka
                          </span>
                        </div>
                      </div>
                      
                      <div className="p-5">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="relative w-10 h-10 rounded-full overflow-hidden border border-border shrink-0 bg-surface dark:bg-border">
                            {product.sellerAvatar && (
                              <Image 
                                src={product.sellerAvatar} 
                                alt={product.sellerName}
                                fill
                                sizes="40px"
                                className="object-cover"
                              />
                            )}
                          </div>
                          <div>
                            <p className="text-body-small font-semibold text-text-primary leading-tight line-clamp-1">{product.sellerName}</p>
                            <p className="text-caption text-text-secondary mt-0.5 leading-snug">{product.sellerAddress}</p>
                          </div>
                        </div>

                        <h3 className="text-h3 mb-1 line-clamp-2 leading-tight group-hover:text-brand-primary transition-colors">{product.name}</h3>
                        {product.batchCategory && (
                          <div className="mb-2">
                            <span className="bg-brand-secondary/20 text-brand-secondary-dark dark:text-brand-secondary px-2 py-0.5 rounded text-[10px] font-bold border border-brand-secondary/30">
                              {product.batchCategory}
                            </span>
                          </div>
                        )}
                        
                        {product.description && (
                          <p className="text-body-small text-text-secondary line-clamp-2 mb-3 leading-relaxed">
                            {product.description}
                          </p>
                        )}
                        <p className="text-h2 text-brand-primary mb-5 font-bold tracking-tight">
                          Rp {product.price.toLocaleString('id-ID')}
                        </p>

                        <div className="space-y-4">
                          <div className="bg-surface/50 p-3 rounded-lg border border-border">
                            <div className="flex justify-between text-caption mb-1.5 font-medium">
                              <span className="text-text-secondary">Minimal Order:</span>
                              <span className="text-text-primary">{product.minOrderQty} Porsi</span>
                            </div>
                            <div className="flex justify-between text-caption mb-1.5 font-medium">
                              <span className="text-text-secondary">Tersedia:</span>
                              <span className="text-text-primary">{Math.max(0, (product.stock || 0) - (product.currentQty || 0))} Porsi</span>
                            </div>
                            {product.processingTime && (
                              <div className="flex justify-between text-caption font-medium pt-1.5 border-t border-border/50">
                                <span className="text-text-secondary">Waktu Proses:</span>
                                <span className="text-brand-primary">{product.processingTime}</span>
                              </div>
                            )}
                          </div>
                          
                          {product.deadlineDate && (
                            <div className="flex items-center gap-2 text-caption text-text-secondary pt-3 border-t border-border/60">
                              <Clock className="w-4 h-4 text-text-secondary" />
                              <span className="font-medium">Ditutup: {deadlineText}</span>
                            </div>
                          )}

                          {user && user.role === 'pembeli' && (
                            <div className="mt-4 w-full">
                              <button 
                                onClick={(e) => handleCheckout(e, product)}
                                disabled={hasActiveOrder}
                                className={`w-full py-2.5 text-sm rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm ${hasActiveOrder ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed' : 'btn-primary hover:bg-brand-primary-hover'}`}
                              >
                                <ShoppingCart className="w-4 h-4" />
                                {hasActiveOrder ? 'Selesaikan dulu pesanan anda' : 'Checkout Sekarang'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </section>
      </main>

      <footer className="bg-surface border-t border-border py-12 pb-28 md:pb-12 mt-12">
        <div className="container mx-auto px-4 text-center">
          <div className="flex justify-center items-center gap-2 mb-6">
            <motion.div
              className="flex items-center gap-2"
              animate={{ y: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            >
              <ShoppingBag className="w-8 h-8 text-brand-primary" />
              <span className="text-h2 text-brand-primary font-bold tracking-tight">pesanku</span>
            </motion.div>
          </div>
          <p className="text-body-base text-text-secondary mb-8 max-w-md mx-auto">
            Platform preorder makanan dan minuman dari UMKM lokal terpercaya. Pesan langsung dari ahlinya.
          </p>
          <p className="text-caption text-text-secondary/70">
            &copy; {new Date().getFullYear()} Pesanku. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Back to Top Button */}
      {showBackToTop && (
        <motion.button
          initial={{ opacity: 0, scale: 0.5, y: 0 }}
          animate={{ 
            opacity: 1, 
            scale: 1,
            y: [0, -8, 0]
          }}
          transition={{
            opacity: { duration: 0.3 },
            scale: { duration: 0.3 },
            y: { repeat: Infinity, duration: 2, ease: "easeInOut" }
          }}
          onClick={scrollToTop}
          className="fixed md:bottom-6 bottom-28 md:right-6 right-4 py-2 px-4 md:py-3 md:px-5 bg-brand-primary text-white rounded-full shadow-xl hover:bg-brand-primary/90 hover:shadow-brand-primary/30 hover:shadow-2xl transition-all z-40 flex items-center gap-1 md:gap-2 justify-center font-medium"
          aria-label="Kembali ke atas"
        >
          <span className="text-xs md:text-sm">Yuk Kembali ke Atas</span>
          <ChevronUp className="w-4 h-4 md:w-5 md:h-5" />
        </motion.button>
      )}

      {/* Mobile Bottom Navigation Bar (Landing Page) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-border px-2 py-2 flex justify-between items-end pb-8 shadow-[0_-4px_15px_rgba(0,0,0,0.05)] text-[10px] font-medium rounded-t-2xl">
        <div className="flex w-[40%] justify-around">
          <button 
            onClick={scrollToTop} 
            className="flex flex-col items-center gap-1.5 text-brand-primary font-semibold pb-2 w-1/2"
          >
            <Home className="w-6 h-6 stroke-[1.5] fill-brand-primary/10 stroke-brand-primary" />
            <span>Beranda</span>
          </button>
          
          <button 
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
              setTimeout(() => {
                setIsMobileSearchOpen(true);
                setTimeout(() => document.querySelector<HTMLInputElement>('#mobile-search')?.focus(), 100);
              }, 300);
            }} 
            className="flex flex-col items-center gap-1.5 text-text-secondary hover:text-brand-primary transition-colors pb-2 w-1/2"
          >
            <Search className="w-6 h-6 stroke-[1.5]" />
            <span>Cari</span>
          </button>
        </div>
        
        <div className="w-[20%] flex flex-col justify-end items-center relative pb-2 h-full">
          <div className="absolute bottom-6 flex justify-center w-full">
            <button 
              onClick={() => {
                const productsSection = document.getElementById('produk');
                if (productsSection) {
                  productsSection.scrollIntoView({ behavior: 'smooth' });
                } else {
                  window.scrollTo({ top: window.innerHeight * 0.8, behavior: 'smooth' });
                }
              }}
              className="w-14 h-14 rounded-full bg-brand-primary text-white flex items-center justify-center shadow-lg hover:bg-brand-primary-hover transition-all transform hover:scale-105"
            >
              <ShoppingBag className="w-7 h-7 stroke-[1.5]" />
            </button>
          </div>
          <span className="text-text-secondary mt-1">Belanja</span>
        </div>
        
        <div className="flex w-[40%] justify-around">
          <Link 
            href={user ? (user.role === 'admin' ? '/admin' : user.role === 'penjual' ? '/seller' : '/buyer/orders') : '/buyer/orders'}
            className="flex flex-col items-center gap-1.5 text-text-secondary hover:text-brand-primary transition-colors pb-2 relative w-1/2"
          >
            <div className="relative">
              <FileText className="w-6 h-6 stroke-[1.5]" />
              {user && user.role === 'pembeli' && orderCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-sm">
                  {orderCount}
                </span>
              )}
            </div>
            <span>Pesanan</span>
          </Link>
          
          {user ? (
            <Link 
              href="/profile"
              className="flex flex-col items-center gap-1.5 text-text-secondary hover:text-brand-primary transition-colors pb-2 w-1/2"
            >
              <User className="w-6 h-6 stroke-[1.5]" />
              <span>Akun</span>
            </Link>
          ) : (
            <Link 
              href="/login"
              className="flex flex-col items-center gap-1.5 text-text-secondary hover:text-brand-primary transition-colors pb-2 w-1/2"
            >
              <User className="w-6 h-6 stroke-[1.5]" />
              <span>Masuk</span>
            </Link>
          )}
        </div>
      </nav>
    </>
  );
}
