"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, Search, ShoppingBag, Menu, X, Heart, ChevronUp, Sun, Moon, LogOut, User, FileText, Home, Store, LayoutDashboard, Sparkles, MessageCircle } from "lucide-react";
import { motion, Variants, AnimatePresence } from "framer-motion";
import { DotLottieReact } from "@/lib/dotlottie";
import Swal from "sweetalert2";
import { ProductItem, AuthUser } from "@/types";
import ProductRating from "@/components/ProductRating";

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

type PopularSellerItem = {
  sellerId: string;
  storeName: string;
  sellerAvatar?: string | null;
  averageRating?: number;
  totalCount?: number;
};

export default function ClientHome({
  initialProducts,
  initialPopularSellers,
  user,
  categoryFilter,
}: {
  initialProducts: ProductItem[];
  initialPopularSellers?: PopularSellerItem[];
  user?: AuthUser | null;
  categoryFilter?: string;
}) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [greeting, setGreeting] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isPriceFilterOpen, setIsPriceFilterOpen] = useState(false);
  const [priceSortOrder, setPriceSortOrder] = useState<'asc' | 'desc' | null>(null);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [localCategoryFilter, setLocalCategoryFilter] = useState<string | null>(null);

  const [activeStep, setActiveStep] = useState<number>(-1);
  const [flowInView, setFlowInView] = useState(false);

  useEffect(() => {
    if (!flowInView) {
      setActiveStep(-1);
      return;
    }
    let current = 0;
    setActiveStep(current);
    const interval = setInterval(() => {
      current++;
      if (current > 3) current = 0;
      setActiveStep(current);
    }, 2500);
    return () => clearInterval(interval);
  }, [flowInView]);

  useEffect(() => {
    setTimeout(() => {
      // Check initial mode
      if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        setIsDarkMode(true);
        document.documentElement.classList.add('dark');
      } else {
        setIsDarkMode(false);
        document.documentElement.classList.remove('dark');
      }
    }, 0);
  }, []);

  const [orderCount, setOrderCount] = useState(0);

  useEffect(() => {
    if (user && user.role === 'pembeli') {
      fetch('/api/orders')
        .then(res => res.json())
        .then(data => {
          if (typeof data.count === 'number') {
            setOrderCount(data.count);
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

  const scrollToCatalog = () => {
    const catalogSection = document.getElementById('katalog');
    if (catalogSection) {
      catalogSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    window.scrollTo({ top: window.innerHeight * 0.8, behavior: 'smooth' });
  };


  useEffect(() => {
    setTimeout(() => {
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
    }, 0);
  }, [user?.name]);

  // Removed local isLoading in favor of GlobalLoader

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
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
  
  const escapeQuotes = (str: string) => str ? str.replace(/"/g, '&quot;').replace(/'/g, '&#39;') : '';

  const handleInternalPresalesChat = (storeName: string, productId: string, productName: string, sellerAvatarUrl?: string | null) => {
    Swal.fire({
      title: `
        <div class="flex items-center gap-3 ml-2">
          ${sellerAvatarUrl ? `<img src="${sellerAvatarUrl}" alt="${storeName}" class="w-9 h-9 rounded-full object-cover shrink-0 border border-border bg-brand-primary/10 shadow-sm">` : `<div class="w-9 h-9 rounded-full shrink-0 border border-border bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold overflow-hidden text-sm shadow-sm">${storeName.charAt(0)}</div>`}
          <span>Chat: ${storeName}</span>
        </div>
      `,
      html: `
        <div class="flex flex-col h-[300px] bg-base border border-border rounded-xl p-4 overflow-y-auto mb-4 text-left" id="chat-box">
          <div class="text-xs text-text-secondary text-center mb-4">Hari ini</div>
          <div id="chat-messages" class="flex flex-col gap-3">
             <div class="flex justify-start mt-3 gap-2">
               ${sellerAvatarUrl ? `<img src="${sellerAvatarUrl}" alt="${storeName}" class="w-8 h-8 rounded-full object-cover shrink-0 self-end mb-1 border border-border bg-brand-primary/10">` : `<div class="w-8 h-8 rounded-full shrink-0 self-end mb-1 border border-border bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold overflow-hidden text-xs">${storeName.charAt(0)}</div>`}
               <div class="bg-surface border border-border rounded-xl rounded-bl-none px-4 py-2 max-w-[80%] text-sm text-text-primary text-left relative shadow-sm">
                 <div class="font-bold text-xs mb-1 text-brand-primary" style="opacity: 0.8">${storeName}</div>
                 Halo kak! Apakah ada yang bisa kami bantu seputar produk <b>${escapeQuotes(productName)}</b>?
                 <div class="text-[10px] text-text-secondary mt-1 text-right w-full block">Sekarang</div>
               </div>
             </div>
          </div>
        </div>
        <div class="flex gap-2">
          <input type="text" id="wa-chat-input" class="input-field flex-1 text-sm bg-base border-border rounded-xl px-3 outline-none focus:border-brand-primary" placeholder="Ketik pesan Anda..." value="Halo, saya tertarik dengan produk ${escapeQuotes(productName)}">
          <button id="send-chat-internal" class="btn-primary py-2 px-4 rounded-xl flex items-center justify-center transition-transform active:scale-95">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-send"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </div>
      `,
      showConfirmButton: false,
      showCloseButton: true,
      customClass: {
        popup: 'bg-surface text-text-primary rounded-2xl w-[90%] max-w-md border border-border shadow-2xl',
        title: 'text-lg font-bold border-b border-border pb-3 mb-0 text-left w-full text-text-primary',
        htmlContainer: 'mt-4 relative',
        closeButton: 'focus:outline-none'
      },
      didOpen: () => {
        const input = document.getElementById('wa-chat-input') as HTMLInputElement;
        const sendBtn = document.getElementById('send-chat-internal');
        
        const openInternalChat = async () => {
          if (!input.value.trim()) return;
          const message = input.value.trim();
          
          Swal.fire({
            title: 'Mengirim Pesan...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
          });

          try {
            const res = await fetch('/api/chat/presales', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ productId, text: message })
            });
            const data = await res.json();
            
            if (!res.ok) {
              Swal.fire('Akses Ditolak!', data.error || 'Terjadi kesalahan jaringan.', 'error');
              return;
            }

            Swal.fire({
              icon: 'success',
              title: 'Terkirim',
              text: 'Pesan diteruskan ke penjual, sekarang masuk ke Kotak Keluar Anda.',
              showConfirmButton: false,
              timer: 1500
            }).then(() => {
              window.location.href = '/buyer/orders'; // Buyer clicks button => goes to their orders tab
            });
          } catch (e) {
            Swal.fire('Error', 'Gagal menghubungi server.', 'error');
          }
        };

        sendBtn?.addEventListener('click', openInternalChat);
        input?.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') openInternalChat();
        });
      }
    });
  };

  const popularSellers = useMemo(() => {
    const popularSellersMap = new Map();
    initialProducts.forEach(product => {
      if (product.sellerId && product.storeName) {
        if (!popularSellersMap.has(product.sellerId)) {
          popularSellersMap.set(product.sellerId, {
            sellerId: product.sellerId,
            storeName: product.storeName,
            sellerAvatar: product.sellerAvatar || product.sellerLogoUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop',
            totalRating: 0,
            totalCount: 0
          });
        }
        const seller = popularSellersMap.get(product.sellerId);
        if (product.averageRating && product.ratingCount) {
          seller.totalRating += product.averageRating * product.ratingCount;
          seller.totalCount += product.ratingCount;
        }
      }
    });
    
    const sellersFromProducts = Array.from(popularSellersMap.values()).map(seller => ({
      ...seller,
      averageRating: seller.totalCount > 0 ? seller.totalRating / seller.totalCount : 0
    })).sort((a, b) => b.averageRating - a.averageRating).slice(0, 10);

    if (sellersFromProducts.length > 0) return sellersFromProducts;

    return (initialPopularSellers || []).map((seller) => ({
      ...seller,
      sellerAvatar: seller.sellerAvatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop',
      averageRating: seller.averageRating || 0,
      totalCount: seller.totalCount || 0,
    })).slice(0, 10);
  }, [initialProducts, initialPopularSellers]);

  const filteredProducts = useMemo(() => {
    return initialProducts.filter(product => {
      if (categoryFilter) {
        if (product.batchCategory !== categoryFilter) return false;
      }

      const productName = product.name || '';
      const sellerName = product.sellerName || '';
      const query = searchQuery || '';
      
      return productName.toLowerCase().includes(query.toLowerCase()) || 
             sellerName.toLowerCase().includes(query.toLowerCase());
    });
  }, [initialProducts, categoryFilter, searchQuery]);

  const displayProducts = useMemo(() => {
    return [...filteredProducts].filter((product) => {
      if (!localCategoryFilter) return true;
      const searchStr = ((product.name || '') + " " + (product.description || "") + " " + (product.batchCategory || "")).toLowerCase();
      
      if (localCategoryFilter === 'Makanan Manis') {
        return searchStr.includes('manis') || searchStr.includes('cokelat') || searchStr.includes('kue') || searchStr.includes('roti') || searchStr.includes('pisang') || searchStr.includes('pancake');
      }
      if (localCategoryFilter === 'Makanan Pedas') {
        return searchStr.includes('pedas') || searchStr.includes('sambal') || searchStr.includes('geprek') || searchStr.includes('mercon') || searchStr.includes('rica');
      }
      if (localCategoryFilter === 'Makanan Gurih') {
        return searchStr.includes('gurih') || searchStr.includes('asin') || searchStr.includes('goreng') || searchStr.includes('risol') || searchStr.includes('ayam');
      }
      return true;
    }).sort((a, b) => {
      if (priceSortOrder === 'asc') return a.price - b.price;
      if (priceSortOrder === 'desc') return b.price - a.price;
      return 0;
    });
  }, [filteredProducts, localCategoryFilter, priceSortOrder]);

  return (
    <>
      <div className={`sticky top-0 z-50 transition-all duration-300 ${isScrolled ? 'pt-4 px-4 sm:px-6' : 'pt-0 px-0'}`}>
        <header className={`mx-auto w-full transition-all duration-300 ${
          isScrolled
            ? 'bg-white/85 dark:bg-surface/85 backdrop-blur-md border border-border/50 shadow-lg rounded-2xl max-w-7xl'
            : 'bg-brand-primary'
        }`}>
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 hover:scale-105 transition-transform">
            <motion.div
              className="flex items-center gap-2"
              animate={{ y: [0, -3, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm transition-colors duration-300 ${isScrolled ? 'bg-brand-primary' : 'bg-white'}`}>
                <ShoppingBag className={`w-5 h-5 transition-colors duration-300 ${isScrolled ? 'text-white' : 'text-brand-primary'}`} />
              </div>
              <span className={`text-h2 font-bold tracking-tight transition-colors duration-300 ${isScrolled ? 'text-brand-primary' : 'text-white'}`}>pesanku</span>
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
                className={`input-field pl-10 pr-10 rounded-full focus:bg-surface transition-all duration-300 border-transparent focus:border-brand-primary/50 focus:ring-4 focus:ring-brand-primary/10 ${isScrolled ? 'bg-base' : 'bg-white/95'}`}
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
                            router.push(product.sellerId ? `/store/${encodeURIComponent((product.sellerName || 'toko').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))}-${product.sellerId}` : `/product/${encodeURIComponent((product.name || 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))}-${product.id}`);
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
              className={`p-2 rounded-full transition-colors relative overflow-hidden flex items-center justify-center w-10 h-10 border ${isScrolled ? 'border-border hover:bg-gray-100 dark:hover:bg-border' : 'border-white/40 bg-white/10 hover:bg-white/20'}`}
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
                    <Moon className={`w-5 h-5 ${isScrolled ? 'text-brand-secondary' : 'text-white'}`} />
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
                    <Sun className={`w-5 h-5 ${isScrolled ? 'text-brand-secondary' : 'text-white'}`} />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>

            {greeting && (
              <Link href="/profile" className={`text-body-small font-semibold mr-2 hidden lg:inline-block hover:underline transition-all ${isScrolled ? 'text-brand-primary' : 'text-white'}`} title="Buka Profil">
                {greeting}
              </Link>
            )}
            <Link href="/seller" className={`text-body-small font-medium transition-colors ${isScrolled ? 'text-text-secondary hover:text-brand-primary' : 'text-white/85 hover:text-white'}`}>
              Mulai Berjualan
            </Link>
            
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/profile"
                  className={`flex items-center justify-center p-2 rounded-xl transition-all mr-1 border ${isScrolled ? 'border-transparent text-text-secondary hover:text-brand-primary hover:bg-brand-primary/5' : 'border-white/30 text-white hover:bg-white/15'}`}
                  title="Profil Akun"
                >
                  <User className="w-5 h-5" />
                </Link>
                <Link 
                  href={user.role === 'admin' ? '/admin' : user.role === 'penjual' ? '/seller' : '/buyer/orders'} 
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-all duration-200 shadow-lg active:scale-95 hover:-translate-y-0.5 relative ${isScrolled ? 'bg-brand-primary text-white shadow-brand-primary/20 hover:bg-brand-primary-hover hover:shadow-brand-primary/40' : 'bg-white text-brand-primary shadow-black/10 hover:bg-white/90 hover:shadow-black/20'}`}
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
                  className={`border flex items-center gap-1.5 py-2 px-3 text-sm font-semibold rounded-xl transition-all ${isScrolled ? 'border-status-error/40 text-status-error hover:bg-status-error/10 hover:border-status-error' : 'border-white/50 text-white hover:bg-white/15 hover:border-white'}`}
                  title="Keluar / Logout"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden lg:inline">Keluar</span>
                </button>
              </div>
            ) : (
              <>
                <Link href="/login" className={`px-4 py-2 rounded-lg font-medium transition-all border ${isScrolled ? 'border-border bg-surface text-text-primary hover:bg-brand-primary/5' : 'border-white/50 text-white hover:bg-white/15'}`}>
                  Masuk
                </Link>
                <Link href="/register" className={`px-4 py-2 rounded-lg font-medium transition-all shadow-lg ${isScrolled ? 'bg-brand-primary text-white shadow-brand-primary/20 hover:bg-brand-primary-hover hover:shadow-brand-primary/40' : 'bg-white text-brand-primary shadow-black/10 hover:bg-white/90'}`}>
                  Daftar
                </Link>
              </>
            )}
          </div>
          
          <div className="md:hidden flex items-center gap-1 relative right-2">
            {user && (user.role === 'admin' || user.role === 'penjual') && (
              <Link
                href={user.role === 'admin' ? '/admin' : '/seller'}
                className={`p-2 rounded-full transition-colors relative flex items-center justify-center w-10 h-10 group ${isScrolled ? 'hover:bg-brand-primary/10' : 'hover:bg-white/15'}`}
                aria-label="Dashboard"
                title="Buka Dashboard"
              >
                <LayoutDashboard className={`w-5 h-5 transition-colors ${isScrolled ? 'text-text-primary group-hover:text-brand-primary' : 'text-white'}`} />
              </Link>
            )}
            
            {/* Mobile Search Toggle */}
            <button 
              onClick={() => {
                setIsMobileSearchOpen(!isMobileSearchOpen);
                if (!isMobileSearchOpen) setTimeout(() => document.querySelector<HTMLInputElement>('#mobile-search')?.focus(), 100);
              }}
              className={`p-2 rounded-full transition-colors relative flex items-center justify-center w-10 h-10 ${isScrolled ? 'hover:bg-brand-primary/10' : 'hover:bg-white/15'}`}
              aria-label="Toggle Search"
            >
              <Search className={`w-5 h-5 ${isScrolled ? (isMobileSearchOpen ? 'text-brand-primary' : 'text-text-primary') : 'text-white'}`} />
            </button>
            
            {/* Mobile Theme Toggle */}
            <button 
              onClick={toggleDarkMode}
              className={`p-2 rounded-full transition-colors relative overflow-hidden flex items-center justify-center w-10 h-10 ${isScrolled ? 'hover:bg-brand-primary/10' : 'hover:bg-white/15'}`}
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
                  <Moon className={`w-5 h-5 ${isScrolled ? 'text-brand-primary' : 'text-white'}`} />
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
                  <Sun className={`w-5 h-5 ${isScrolled ? 'text-brand-primary' : 'text-white'}`} />
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
                                router.push(product.sellerId ? `/store/${encodeURIComponent((product.sellerName || 'toko').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))}-${product.sellerId}` : `/product/${encodeURIComponent((product.name || 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))}-${product.id}`);
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
                              router.push(product.sellerId ? `/store/${encodeURIComponent((product.sellerName || 'toko').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))}-${product.sellerId}` : `/product/${encodeURIComponent((product.name || 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))}-${product.id}`);
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
      </div>

      <main className="flex-1 bg-white dark:bg-base">
        {/* Hero Section */}
        {!categoryFilter && (
        <section className="relative flex min-h-[500px] items-start overflow-hidden bg-brand-primary px-6 py-6 sm:px-8 sm:py-8 md:min-h-[550px] md:py-10 lg:min-h-[620px] lg:px-12 lg:py-12 xl:items-center xl:py-28">
          
          <div className="container mx-auto relative z-10">
            <div className="grid grid-cols-1 items-center gap-6 sm:gap-8 lg:gap-10 xl:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)] xl:gap-16">
              
              {/* Text Content */}
              <motion.div 
                initial={false}
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
                className="order-2 max-w-3xl text-left xl:order-1"
              >
                <h1 className="text-display-1 mb-6 leading-[1.1] tracking-tight text-white">
                  Pesan Makanan UMKM Favoritmu, <span className="text-amber-200 relative inline-block">
                    Kapan Saja
                    <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 100 20" preserveAspectRatio="none">
                      <path d="M0 10 Q 50 20 100 10" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-white/60" />
                    </svg>
                  </span>
                </h1>
                <p className="text-body-large mb-10 max-w-xl leading-relaxed text-white/85">
                  Sistem preorder makanan dan minuman dari UMKM lokal dengan minimum order yang jelas. Rasakan hidangan segar langsung dari tangan ahlinya.
                </p>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-start gap-4">
                  <Link href="#katalog" className="w-full rounded-lg bg-white px-8 py-3.5 text-center text-lg font-semibold text-brand-primary shadow-xl shadow-black/15 transition-all hover:scale-105 hover:bg-white/90 sm:w-auto">
                    Mulai Belanja
                  </Link>
                  <Link href="/seller" className="w-full cursor-pointer rounded-lg border border-white/60 px-8 py-3.5 text-center text-lg font-medium text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-white hover:bg-white/15 hover:shadow-md active:scale-95 sm:w-auto">
                    Daftar Jadi Penjual
                  </Link>
                </div>
              </motion.div>

              <motion.div
                initial={false}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
                className="order-1 aspect-video w-full max-w-sm justify-self-center overflow-hidden bg-transparent sm:max-w-lg md:max-w-xl xl:order-2 xl:max-w-2xl xl:justify-self-end xl:self-center"
                role="img"
                aria-label="Animasi gerobak makanan"
              >
                <DotLottieReact
                  src="/animations/foodcart.lottie"
                  autoplay
                  loop
                  backgroundColor="transparent"
                  className="h-full w-full scale-[1.04] brightness-[1.025] dark:opacity-95"
                />
              </motion.div>

            </div>
          </div>
        </section>
        )}

        {/* Katalog Section */}
        <section id="katalog" className={`scroll-mt-24 px-4 container mx-auto ${categoryFilter ? 'py-16' : 'pb-16 pt-8'}`}>

          {/* UMKM Terpopuler Section */}
          {!categoryFilter && popularSellers.length > 0 && (
          <div className="mb-16">
            <motion.div 
              initial={false}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="mb-6 flex justify-between items-end"
            >
              <div>
                <h2 className="text-h2 mb-2 tracking-tight">UMKM Terpopuler</h2>
                <p className="text-body-base text-text-secondary">Pilihan toko favorit dengan kualitas terbaik.</p>
              </div>
            </motion.div>

            <div className="flex justify-center overflow-x-auto gap-4 sm:gap-6 pb-4 snap-x snap-mandatory scrollbar-hide w-full" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {popularSellers.map((seller, idx) => (
                <motion.div
                  key={seller.sellerId}
                  initial={false}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => router.push(`/store/${encodeURIComponent((seller.storeName || 'toko').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))}-${seller.sellerId}`)}
                  className="snap-start flex-none w-40 sm:w-48 bg-white rounded-2xl border border-border p-4 shadow-sm group cursor-pointer flex flex-col items-center gap-3 hover:-translate-y-1 hover:shadow-lg hover:border-brand-primary/30 transition-all duration-300"
                >
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden shadow-sm border-2 border-orange-100 ring-4 ring-orange-100/60 group-hover:shadow-md transition-all duration-300 relative bg-white">
                    <img 
                      src={seller.sellerAvatar} 
                      alt={seller.storeName} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                  <div className="w-full text-center flex flex-col items-center flex-1 justify-center gap-1">
                    <h3 className="font-bold text-sm sm:text-base line-clamp-2 w-full" style={{ color: '#0f172a' }}>
                      {seller.storeName}
                    </h3>
                    {seller.averageRating > 0 ? (
                      <div className="flex items-center justify-center scale-90">
                        <ProductRating averageRating={seller.averageRating} ratingCount={seller.totalCount} className="[&>span]:text-slate-700" />
                      </div>
                    ) : (
                      <span className="text-[10px]" style={{ color: '#64748b' }}>Belum ada rating</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          )}

          {/* Categories Section */}
          {!categoryFilter && (
          <div className="mb-16">
            <motion.div 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4"
            >
              <div>
                <h2 className="text-h2 mb-2 tracking-tight">Kategori Pilihan</h2>
                <p className="text-body-base text-text-secondary">Eksplorasi ragam menu sesuai selera Anda.</p>
              </div>
              
            </motion.div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
              {[
                { name: 'Makanan Berat', image: '/categories/makanan-berat.png', keyword: 'nasi' },
                { name: 'Minuman Segar', image: '/categories/minuman.png', keyword: 'minum' },
                { name: 'Jajanan & Cemilan', image: '/categories/cemilan.png', keyword: 'cemilan' },
                { name: 'Kue & Roti', image: '/categories/kue.png', keyword: 'kue' },
                { name: 'Cepat Saji', image: '/categories/cepat-saji.png', keyword: 'ayam' },
              ].map((category, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => {
                    router.push('/kategori/' + encodeURIComponent(category.name));
                  }}
                  className="group cursor-pointer flex flex-col items-center gap-3"
                >
                  <div className="w-full aspect-square rounded-2xl overflow-hidden shadow-sm border border-border bg-surface relative transition-transform duration-300 group-hover:-translate-y-2 group-hover:shadow-xl group-hover:shadow-brand-primary/20">
                    <img 
                      src={category.image} 
                      alt={category.name} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                  <span className="font-bold text-sm sm:text-base text-center" style={{ color: 'var(--color-text-primary)' }}>{category.name}</span>
                </motion.div>
              ))}
            </div>
          </div>
          )}

          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-10 pt-20 lg:pt-0"
          >
            <div>
              <h2 className="text-h2 mb-2 tracking-tight">{categoryFilter ? `Kategori: ${categoryFilter}` : 'Rekomendasi Untuk Kamu'}</h2>
              <p className="text-body-base text-text-secondary">
                {searchQuery ? `Hasil pencarian untuk "${searchQuery}"` : (categoryFilter ? `Produk pilihan di kategori ${categoryFilter}.` : "Temukan pilihan produk UMKM yang mungkin kamu sukai.")}
              </p>
            </div>
            
            {/* Action Buttons Container */}
            <div className="flex items-center gap-3 relative z-40">
              
              {/* Category Filter Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => { setIsCategoryDropdownOpen(!isCategoryDropdownOpen); setIsPriceFilterOpen(false); }}
                  className="flex items-center gap-2 bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white px-5 py-2.5 rounded-full font-semibold transition-all duration-300 shadow-sm hover:shadow-md active:scale-95 group"
                >
                  {localCategoryFilter ? localCategoryFilter : 'Kategori Makanan'}
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ml-1 transition-transform duration-300 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isCategoryDropdownOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-3 w-48 bg-surface border border-border rounded-xl shadow-xl overflow-hidden"
                  >
                    <div className="p-2 flex flex-col gap-1">
                      {['Semua Makanan', 'Makanan Manis', 'Makanan Pedas', 'Makanan Gurih'].map(cat => (
                        <button 
                          key={cat}
                          onClick={() => { setLocalCategoryFilter(cat === 'Semua Makanan' ? null : (localCategoryFilter === cat ? null : cat)); setIsCategoryDropdownOpen(false); }}
                          className={`flex items-center px-3 py-2.5 w-full text-left rounded-lg transition-colors text-sm font-medium ${
                            (cat === 'Semua Makanan' && !localCategoryFilter) || localCategoryFilter === cat
                              ? 'bg-brand-primary text-white' 
                              : 'hover:bg-brand-primary/10 hover:text-brand-primary text-text-primary'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Price Filter Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => { setIsPriceFilterOpen(!isPriceFilterOpen); setIsCategoryDropdownOpen(false); }}
                  className="flex items-center gap-2 bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white px-5 py-2.5 rounded-full font-semibold transition-all duration-300 shadow-sm hover:shadow-md active:scale-95 group"
                >
                Urutkan Harga
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ml-1 transition-transform duration-300 ${isPriceFilterOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {isPriceFilterOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-3 w-64 bg-surface border border-border rounded-xl shadow-xl overflow-hidden"
                >
                  <div className="p-2 flex flex-col gap-1">
                    <button 
                      onClick={() => { setPriceSortOrder('asc'); setIsPriceFilterOpen(false); }}
                      className={`flex items-center px-3 py-2.5 w-full text-left rounded-lg transition-colors text-sm font-medium ${priceSortOrder === 'asc' ? 'bg-brand-primary text-white' : 'hover:bg-brand-primary/10 hover:text-brand-primary text-text-primary'}`}
                    >
                      Harga Normal ke Tertinggi
                    </button>
                    <button 
                      onClick={() => { setPriceSortOrder('desc'); setIsPriceFilterOpen(false); }}
                      className={`flex items-center px-3 py-2.5 w-full text-left rounded-lg transition-colors text-sm font-medium ${priceSortOrder === 'desc' ? 'bg-brand-primary text-white' : 'hover:bg-brand-primary/10 hover:text-brand-primary text-text-primary'}`}
                    >
                      Harga Tertinggi ke Normal
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
            
            </div>
          </motion.div>

          {displayProducts.length === 0 ? (
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
              {displayProducts.map((product) => {
                const productImageUrl = product.imageUrl ?? "/street-food-festival.jpg";
                
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
                    <Link href={product.sellerId ? `/store/${encodeURIComponent((product.sellerName || 'toko').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))}-${product.sellerId}` : `/product/${encodeURIComponent((product.name || 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))}-${product.id}`} className="card block group cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                      <div className="relative aspect-[4/3] overflow-hidden bg-surface dark:bg-border rounded-t-2xl">
                        <Image 
                          src={productImageUrl} 
                          alt={product.name}
                          fill
                          className="object-contain group-hover:scale-110 transition-transform duration-500 ease-out"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                        {product.isPromoted && (
                          <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold text-white shadow-lg ring-2 ring-white/70" style={{ backgroundImage: 'linear-gradient(to right, #f97316, var(--color-brand-primary))' }}>
                            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                            {product.promotionLabel || 'Paling Populer'}
                          </span>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                      
                      <div className="p-5">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="relative w-10 h-10 rounded-full overflow-hidden border border-border shrink-0 bg-surface dark:bg-border">
                            {product.sellerAvatar && (
                              <Image 
                                src={product.sellerAvatar} 
                                alt={product.sellerName ?? "Penjual"}
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
                        <ProductRating
                          averageRating={product.averageRating}
                          ratingCount={product.ratingCount}
                          className="mb-2"
                        />
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
                            {product.processingTime && (
                              <div className="flex justify-between text-caption font-medium">
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

                          <div className="mt-4 w-full">
                            {(() => {
                              return (
                                <div className="flex flex-col gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      router.push(product.sellerId ? `/store/${encodeURIComponent((product.sellerName || 'toko').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))}-${product.sellerId}` : `/product/${encodeURIComponent((product.name || 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))}-${product.id}`);
                                    }}
                                    className="w-full py-2.5 text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm font-semibold btn-primary hover:bg-brand-primary-hover"
                                  >
                                    <Store className="w-4 h-4" />
                                    Lihat Toko &amp; Katalog
                                  </button>
                                  
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleInternalPresalesChat(product.sellerName || 'Toko', product.id, product.name, product.sellerLogoUrl || product.sellerAvatar);
                                    }}
                                    className="w-full py-2.5 text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm font-semibold border-2 border-brand-primary text-brand-primary hover:bg-brand-primary/10"
                                  >
                                    <MessageCircle className="w-4 h-4" />
                                    Chat Penjual
                                  </button>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </section>

        {/* About Platform Section */}
        <section className="px-4 container mx-auto pb-16">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-brand-primary rounded-[2rem] border border-brand-primary/10 overflow-hidden flex flex-col md:flex-row items-center gap-8 p-8 md:p-12 relative shadow-sm"
          >
            <div className="flex-1 flex flex-col justify-center">
              <h2 className="text-h2 mb-6 text-black leading-tight">
                Kenapa harus pilih <span className="relative inline-block">
                  <strong className="text-white">Pesanku?</strong>
                  <svg className="absolute -bottom-2 left-0 w-full text-black/70" viewBox="0 0 100 20" preserveAspectRatio="none">
                    <path d="M0 10 Q 50 20 100 10" fill="transparent" stroke="currentColor" strokeWidth="4" />
                  </svg>
                </span>
              </h2>
              <ul className="space-y-4 text-white/90 text-body-base max-w-xl">
                <li className="flex items-start gap-3">
                  <span className="font-bold text-white text-lg leading-none mt-0.5">•</span>
                  <span><strong>Kualitas Terkurasi:</strong> Hidangan langsung dari tangan ahlinya untuk setiap acara Anda.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-bold text-white text-lg leading-none mt-0.5">•</span>
                  <span><strong>Preorder Mudah & Transparan:</strong> Jadwal produksi dan batas minimum pemesanan yang jelas tanpa bingung.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-bold text-white text-lg leading-none mt-0.5">•</span>
                  <span><strong>Komunikasi Langsung:</strong> Fitur chat langsung dengan pembuat makanan untuk kustomisasi pesanan.</span>
                </li>
              </ul>
            </div>
            
            {/* Chef Image */}
            <div className="flex-1 w-full flex justify-center md:justify-end">
              <div className="w-full max-w-[320px] aspect-[4/5] relative group flex items-center justify-center">
                <img 
                  src="/chef-transparent.png" 
                  alt="Chef Pesanku" 
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-700" 
                />
              </div>
            </div>
          </motion.div>
        </section>

        {/* Alur Pemesanan Section */}
        <section className="px-4 container mx-auto pb-24">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-h2 mb-4 text-text-primary">Bagaimana Cara <span className="text-brand-primary">Pesan?</span></h2>
            <p className="text-body-base text-text-secondary max-w-2xl mx-auto">4 langkah mudah untuk menikmati hidangan segar langsung dari UMKM pilihan Anda.</p>
          </motion.div>
          
          <motion.div 
            onViewportEnter={() => setFlowInView(true)}
            className="grid grid-cols-1 md:grid-cols-4 gap-8 relative max-w-5xl mx-auto"
          >
            {/* Connecting Line for Desktop */}
            <div className="hidden md:block absolute top-[2.5rem] left-0 w-full h-1 bg-border -translate-y-1/2 z-0 rounded-full overflow-hidden">
              <motion.div 
                animate={{ width: activeStep >= 0 ? `${(activeStep * 25) + 12.5}%` : "0%" }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
                className="h-full bg-brand-primary rounded-full opacity-60"
              />
            </div>

            {/* Steps */}
            {[
              {
                icon: Search,
                title: "1. Pilih Produk",
                desc: "Temukan hidangan favorit dari katalog UMKM.",
                delay: 0.2
              },
              {
                icon: MessageCircle,
                title: "2. Diskusi & Pesan",
                desc: "Chat penjual untuk kustomisasi preorder.",
                delay: 0.4
              },
              {
                icon: Store,
                title: "3. Proses Produksi",
                desc: "Penjual menyiapkan pesanan segar.",
                delay: 0.6
              },
              {
                icon: ShoppingBag,
                title: "4. Pesanan Tiba",
                desc: "Terima hidangan tepat waktu.",
                delay: 0.8
              }
            ].map((step, idx) => {
              const isActive = activeStep === idx;
              return (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: step.delay }}
                  className="relative z-10 flex flex-col items-center text-center group"
                >
                  <motion.div 
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    animate={{ 
                      y: [0, -10, 0],
                      scale: isActive ? 1.1 : 1
                    }}
                    transition={{ 
                      y: { repeat: Infinity, duration: 3, delay: idx * 0.2, ease: "easeInOut" },
                      scale: { duration: 0.3 }
                    }}
                    className={`w-20 h-20 border-2 rounded-2xl flex items-center justify-center mb-6 shadow-lg transition-all duration-300 relative overflow-hidden cursor-pointer ${
                      isActive 
                        ? 'bg-brand-primary border-brand-primary text-white shadow-brand-primary/40 rotate-3' 
                        : 'bg-surface border-brand-primary/20 shadow-brand-primary/10 group-hover:bg-brand-primary group-hover:text-white group-hover:border-brand-primary group-hover:rotate-3'
                    }`}
                  >
                    <div className={`absolute inset-0 transition-opacity ${isActive ? 'bg-black/10' : 'bg-brand-primary/5 group-hover:opacity-0'}`} />
                    <step.icon className={`w-8 h-8 transition-colors duration-300 relative z-10 ${isActive ? 'text-white' : 'text-brand-primary group-hover:text-white'}`} />
                  </motion.div>
                  <h3 className={`text-lg font-bold mb-3 transition-colors cursor-default ${isActive ? 'text-brand-primary' : 'text-text-primary group-hover:text-brand-primary'}`}>{step.title}</h3>
                  <p className="text-sm text-text-secondary leading-relaxed max-w-[200px] cursor-default">{step.desc}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </section>
      </main>

      {/* Static Back to Top Button */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        viewport={{ once: false, margin: "0px 0px -50px 0px" }}
        className="flex justify-end -mb-4 relative z-10 pt-4 px-4 sm:px-6 container mx-auto w-full"
      >
        <motion.button
          onClick={scrollToTop}
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="py-3 px-6 bg-brand-primary text-white rounded-full hover:bg-brand-primary/90 shadow-xl transition-all flex items-center gap-2 font-medium transform hover:-translate-y-1 hover:shadow-brand-primary/30"
        >
          <span>Yuk Kembali ke Atas</span>
          <ChevronUp className="w-5 h-5" />
        </motion.button>
      </motion.div>

      <footer className="bg-brand-primary py-12 pb-28 md:pb-12 mt-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex justify-center items-center gap-2 mb-6">
            <motion.div
              className="flex items-center gap-2"
              animate={{ y: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            >
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <ShoppingBag className="w-5 h-5 text-brand-primary" />
              </div>
              <span className="text-h2 text-white font-bold tracking-tight relative inline-block">
                pesanku
                <svg className="absolute -bottom-1.5 left-0 w-full text-black/70" viewBox="0 0 100 20" preserveAspectRatio="none">
                  <path d="M0 10 Q 50 20 100 10" fill="transparent" stroke="currentColor" strokeWidth="4" />
                </svg>
              </span>
            </motion.div>
          </div>
          <p className="text-body-base text-white/90 mb-8 max-w-md mx-auto">
            Platform preorder makanan dan minuman dari UMKM lokal terpercaya. Pesan langsung dari ahlinya.
          </p>
          <p className="text-caption text-white/70">
            &copy; {new Date().getFullYear()} Pesanku. All rights reserved.
          </p>
        </div>
      </footer>



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
              onClick={scrollToCatalog}
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
