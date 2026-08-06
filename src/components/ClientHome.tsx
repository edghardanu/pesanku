"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Clock, Search, ShoppingBag, Menu, X, Heart, ChevronUp, Sun, Moon, LogOut } from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState("");

  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
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

  useEffect(() => {
    // Hide loading screen after 1.5s
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

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
      <AnimatePresence>
        {isLoading && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="fixed inset-0 z-[100] bg-base flex flex-col items-center justify-center"
          >
            <motion.div
              animate={{ 
                scale: [0.9, 1.1, 1],
              }}
              transition={{ 
                duration: 1.2,
                ease: "easeInOut",
                repeat: Infinity,
                repeatType: "reverse"
              }}
              className="flex flex-col items-center gap-4"
            >
              <div className="w-24 h-24 bg-brand-primary/10 rounded-full flex items-center justify-center relative">
                <motion.div 
                  className="absolute inset-0 border-4 border-brand-primary/20 rounded-full"
                  animate={{ scale: [1, 1.5], opacity: [1, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                />
                <ShoppingBag className="w-12 h-12 text-brand-primary" />
              </div>
              <span className="text-display-2 text-brand-primary font-bold tracking-tight">pesanku</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                  className="btn-primary shadow-lg shadow-brand-primary/20 hover:shadow-brand-primary/40"
                >
                  {user.role === 'admin' || user.role === 'penjual' ? 'Dashboard' : 'Lihat Pesanan Saya'}
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
          
          <button 
            className="md:hidden text-text-primary p-2 z-50 relative"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

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
                    className="btn-primary w-full text-center"
                  >
                    {user.role === 'admin' || user.role === 'penjual' ? 'Dashboard Saya' : 'Lihat Pesanan Saya'}
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
        <section className="relative overflow-hidden bg-brand-primary/5 py-12 lg:py-24 px-4">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/5 to-transparent pointer-events-none" />
          
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
                <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 bg-brand-secondary/20 text-brand-secondary-dark dark:text-brand-secondary rounded-full text-sm font-semibold tracking-wide">
                  100% Dukung UMKM Lokal Nusantara
                  <motion.svg 
                    animate={{ 
                      skewY: [-3, 3, -3],
                      rotate: [-2, 2, -2],
                      y: [0, -1, 0]
                    }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                    viewBox="0 0 3 2" 
                    className="w-4 h-3 rounded-[2px] overflow-hidden border border-brand-secondary/40 shadow-sm shrink-0 origin-left"
                  >
                    <rect width="3" height="1" y="0" fill="#ef4444" />
                    <rect width="3" height="1" y="1" fill="#ffffff" />
                  </motion.svg>
                </div>
                <h1 className="text-display-1 text-text-primary mb-6 tracking-tight leading-[1.1]">
                  Pesan Makanan UMKM Favoritmu, <span className="text-brand-primary relative inline-block">
                    Kapan Saja
                    <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 100 20" preserveAspectRatio="none">
                      <path d="M0 10 Q 50 20 100 10" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-brand-accent/50" />
                    </svg>
                  </span>
                </h1>
                <p className="text-body-large text-text-secondary mb-10 leading-relaxed max-w-xl">
                  Sistem preorder makanan dan minuman dari UMKM lokal dengan minimum order yang jelas. Rasakan hidangan segar langsung dari tangan ahlinya.
                </p>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-start gap-4">
                  <Link href="#katalog" className="btn-primary text-lg px-8 py-3.5 shadow-xl shadow-brand-primary/20 hover:scale-105 transition-all w-full sm:w-auto text-center">
                    Mulai Belanja
                  </Link>
                  <Link href="/seller" className="btn-outline text-lg px-8 py-3.5 hover:bg-brand-primary/5 w-full sm:w-auto text-center">
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
                          className="object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="absolute top-3 left-3">
                          <span className={`px-3 py-1.5 rounded-full text-caption font-bold flex items-center gap-1 backdrop-blur-sm shadow-sm ${
                            isFull 
                              ? 'bg-brand-accent/90 text-white' 
                              : 'bg-brand-secondary/90 text-slate-900 border border-brand-secondary/20'
                          }`}>
                            {isFull ? "Kuota Tercapai" : "Terbuka"}
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

                        <h3 className="text-h3 mb-2 line-clamp-2 leading-tight group-hover:text-brand-primary transition-colors">{product.name}</h3>
                        
                        {product.description && (
                          <p className="text-body-small text-text-secondary line-clamp-2 mb-3 leading-relaxed">
                            {product.description}
                          </p>
                        )}
                        <p className="text-h2 text-brand-primary mb-5 font-bold tracking-tight">
                          Rp {product.price.toLocaleString('id-ID')}
                        </p>

                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between text-caption mb-2 font-medium">
                              <span className="text-text-secondary">Terkumpul: <span className="text-text-primary">{product.currentQty} / {product.minQty}</span></span>
                              <span className={isFull ? 'text-brand-accent font-bold' : 'text-brand-secondary-dark font-bold'}>
                                {Math.round(progressPercentage)}%
                              </span>
                            </div>
                            <div className="w-full bg-border h-2.5 rounded-full overflow-hidden shadow-inner">
                              <div 
                                className={`h-full rounded-full transition-all duration-1000 ease-out ${isFull ? 'bg-brand-accent' : 'bg-brand-secondary'}`}
                                style={{ width: `${progressPercentage}%` }}
                              />
                            </div>
                          </div>
                          
                          {product.deadlineDate && (
                            <div className="flex items-center gap-2 text-caption text-text-secondary pt-3 border-t border-border/60">
                              <Clock className="w-4 h-4 text-text-secondary" />
                              <span className="font-medium">Ditutup: {deadlineText}</span>
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

      <footer className="bg-surface border-t border-border py-12 mt-12">
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
          className="fixed bottom-6 right-6 py-3 px-5 bg-brand-primary text-white rounded-full shadow-xl hover:bg-brand-primary/90 hover:shadow-brand-primary/30 hover:shadow-2xl transition-all z-50 flex items-center gap-2 justify-center font-medium"
          aria-label="Kembali ke atas"
        >
          <span className="text-sm">Yuk Kembali ke Atas</span>
          <ChevronUp className="w-5 h-5" />
        </motion.button>
      )}
    </>
  );
}
