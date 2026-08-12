"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, Search, ShoppingBag, Menu, X, Heart, ChevronUp, Sun, Moon, LogOut, User, FileText, Home, Store, LayoutDashboard, Sparkles } from "lucide-react";
import { motion, Variants, AnimatePresence } from "framer-motion";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
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

export default function ClientHome({ initialProducts, user }: { initialProducts: ProductItem[], user?: AuthUser | null }) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [greeting, setGreeting] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);

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
      if (window.scrollY > 500) {
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
                            router.push(product.sellerId ? `/store/${product.sellerId}` : `/product/${product.id}`);
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
                                router.push(product.sellerId ? `/store/${product.sellerId}` : `/product/${product.id}`);
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
                              router.push(product.sellerId ? `/store/${product.sellerId}` : `/product/${product.id}`);
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
        <section className="relative flex min-h-[500px] items-start overflow-hidden bg-base px-6 py-6 sm:px-8 sm:py-8 md:min-h-[550px] md:py-10 lg:min-h-[620px] lg:px-12 lg:py-12 xl:items-center xl:py-28">
          
          <div className="container mx-auto relative z-10">
            <div className="grid grid-cols-1 items-center gap-6 sm:gap-8 lg:gap-10 xl:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)] xl:gap-16">
              
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
                className="order-2 max-w-3xl text-left xl:order-1"
              >
                <h1 className="text-display-1 mb-6 leading-[1.1] tracking-tight text-text-primary">
                  Pesan Makanan UMKM Favoritmu, <span className="text-brand-primary relative inline-block">
                    Kapan Saja
                    <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 100 20" preserveAspectRatio="none">
                      <path d="M0 10 Q 50 20 100 10" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-yellow-400/50" />
                    </svg>
                  </span>
                </h1>
                <p className="text-body-large mb-10 max-w-xl leading-relaxed text-text-secondary">
                  Sistem preorder makanan dan minuman dari UMKM lokal dengan minimum order yang jelas. Rasakan hidangan segar langsung dari tangan ahlinya.
                </p>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-start gap-4">
                  <Link href="#katalog" className="btn-primary w-full px-8 py-3.5 text-center text-lg text-white shadow-xl shadow-brand-primary/25 transition-all hover:scale-105 sm:w-auto">
                    Mulai Belanja
                  </Link>
                  <Link href="/seller" className="w-full cursor-pointer rounded-lg border border-border px-8 py-3.5 text-center text-lg font-medium text-text-primary shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-text-primary hover:bg-brand-primary/5 hover:shadow-md active:scale-95 sm:w-auto">
                    Daftar Jadi Penjual
                  </Link>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
                className="order-1 aspect-video w-full max-w-sm justify-self-center overflow-hidden rounded-[2rem] bg-transparent dark:bg-white/5 sm:max-w-lg md:max-w-xl xl:order-2 xl:max-w-2xl xl:justify-self-end xl:self-center"
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

        {/* Katalog Section */}
        <section id="katalog" className="scroll-mt-24 py-16 px-4 container mx-auto">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="flex justify-between items-end mb-10"
          >
            <div>
              <h2 className="text-h2 mb-2 tracking-tight">Rekomendasi Untuk Kamu</h2>
              <p className="text-body-base text-text-secondary">
                {searchQuery ? `Hasil pencarian untuk "${searchQuery}"` : "Temukan pilihan produk UMKM yang mungkin kamu sukai."}
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
                    <Link href={product.sellerId ? `/store/${product.sellerId}` : `/product/${product.id}`} className="card block group cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
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
                            <div className="flex justify-between text-caption mb-1.5 font-medium">
                              <span className="text-text-secondary">Minimal Order:</span>
                              <span className="text-text-primary">{product.minOrderQty} Porsi</span>
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

                          <div className="mt-4 w-full">
                            {(() => {
                              return (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    router.push(product.sellerId ? `/store/${product.sellerId}` : `/product/${product.id}`);
                                  }}
                                  className="w-full py-2.5 text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm font-semibold btn-primary hover:bg-brand-primary-hover"
                                >
                                  <Store className="w-4 h-4" />
                                  Lihat Toko &amp; Katalog
                                </button>
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
          className="fixed md:bottom-24 bottom-28 md:right-6 right-4 py-2 px-4 md:py-3 md:px-5 bg-brand-primary text-white rounded-full shadow-xl hover:bg-brand-primary/90 hover:shadow-brand-primary/30 hover:shadow-2xl transition-all z-40 flex items-center gap-1 md:gap-2 justify-center font-medium"
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
