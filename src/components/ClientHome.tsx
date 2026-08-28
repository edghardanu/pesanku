"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, Search, ShoppingBag, Menu, X, Heart, ChevronUp, Sun, Moon, LogOut, User, FileText, Home, Store, LayoutDashboard, Sparkles, MessageCircle, ScanLine, MapPin, Star, MessageSquare, Calendar } from "lucide-react";
import { motion, Variants, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";
import dynamic from "next/dynamic";
const QRScannerModal = dynamic(() => import("@/components/QRScannerModal"), { ssr: false });
import HelpWidget from "@/components/HelpWidget";
import { ProductItem, AuthUser } from "@/types";
import ProductRating from "@/components/ProductRating";
import PreChatModal from '@/components/PreChatModal';
import { WIB_TIMEZONE } from "@/lib/promotionFormatting";
import makananBeratImage from "../../public/categories/makanan-berat.png";
import minumanImage from "../../public/categories/minuman.png";
import cemilanImage from "../../public/categories/cemilan.png";
import kueImage from "../../public/categories/kue.png";
import cepatSajiImage from "../../public/categories/cepat-saji.png";

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
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isPriceFilterOpen, setIsPriceFilterOpen] = useState(false);
  const [priceSortOrder, setPriceSortOrder] = useState<'asc' | 'desc' | null>(null);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [localCategoryFilter, setLocalCategoryFilter] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const [visibleMobileItems, setVisibleMobileItems] = useState(12);
  const [isDesktop, setIsDesktop] = useState(false);

  // UMKM Terpopuler pagination
  const sellersPerPage = 2;
  const [sellerPage, setSellerPage] = useState(0);
  const [sellerPageDir, setSellerPageDir] = useState<1 | -1>(1);
  const [sellerAutoPlay, setSellerAutoPlay] = useState(true);


  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // Pre-Chat Modal State
  const [isPreChatModalOpen, setIsPreChatModalOpen] = useState(false);
  const [chatTarget, setChatTarget] = useState<any>(null);

  useEffect(() => {
    if (user && user.role === 'pembeli') {
      fetch('/api/orders')
        .then(res => res.json())
        .then(data => {
          if (typeof data.count === 'number') {
            setOrderCount(data.count);
          }
        })
        .catch((_e) => {});
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

  const scrollToAbout = () => {
    const section = document.getElementById('about-platform');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      const footerElement = document.querySelector('footer');
      if (footerElement) {
        footerElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const scrollToCategories = () => {
    const section = document.getElementById('kategori-pilihan');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      scrollToCatalog();
    }
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
      } catch (error) {
        // error suppressed
      }
    }
  };

  const escapeQuotes = (str: string) => str ? str.replace(/"/g, '&quot;').replace(/'/g, '&#39;') : '';

  const handleInternalPresalesChat = (storeName: string, productId: string, productName: string, sellerId: string, sellerAvatarUrl?: string | null, price?: number, imageUrl?: string) => {
    setChatTarget({
      productId,
      productName,
      storeName,
      sellerId,
      sellerAvatarUrl,
      price,
      imageUrl
    });
    setIsPreChatModalOpen(true);
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

  // Reset page to 1 when filters or search change
  useEffect(() => {
    setCurrentPage(1);
    setVisibleMobileItems(12);
  }, [searchQuery, localCategoryFilter, priceSortOrder, categoryFilter]);

  const totalPages = Math.ceil(displayProducts.length / itemsPerPage);

  const currentProducts = useMemo(() => {
    if (!isDesktop) return displayProducts.slice(0, visibleMobileItems);
    const startIndex = (currentPage - 1) * itemsPerPage;
    return displayProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [displayProducts, currentPage, isDesktop, visibleMobileItems]);

  return (
    <>
      <div className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'pt-4 px-4 sm:px-6' : 'pt-0 px-0'}`}>
        <header className={`mx-auto w-full transition-all duration-300 ${isScrolled
          ? 'bg-white/85 dark:bg-surface/85 backdrop-blur-md border border-border/50 shadow-lg rounded-2xl max-w-7xl'
          : 'bg-transparent'
          }`}>
          <div className="container mx-auto px-4 h-16 flex items-center justify-between relative">
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



            <div className="hidden lg:flex items-center gap-3 lg:gap-6 flex-1 justify-center px-4 whitespace-nowrap">
              <Link
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToTop();
                }}
                className={`text-body-small font-medium transition-all hover:text-brand-primary relative group ${isScrolled ? 'text-text-secondary hover:text-brand-primary' : 'text-white/85 hover:text-white'
                  }`}
              >
                Beranda
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-primary transition-all duration-300 group-hover:w-full" />
              </Link>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  scrollToCategories();
                }}
                className={`text-body-small font-medium transition-all hover:text-brand-primary relative group cursor-pointer ${isScrolled ? 'text-text-secondary hover:text-brand-primary' : 'text-white/85 hover:text-white'
                  }`}
              >
                Katalog Makanan / Minuman
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-primary transition-all duration-300 group-hover:w-full" />
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  scrollToAbout();
                }}
                className={`text-body-small font-medium transition-all hover:text-brand-primary relative group cursor-pointer ${isScrolled ? 'text-text-secondary hover:text-brand-primary' : 'text-white/85 hover:text-white'
                  }`}
              >
                Tentang Kami
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-primary transition-all duration-300 group-hover:w-full" />
              </button>
              <Link
                href="/seller"
                className={`text-body-small font-medium transition-all hover:text-brand-primary relative group ${isScrolled ? 'text-text-secondary hover:text-brand-primary' : 'text-white/85 hover:text-white'
                  }`}
              >
                Mulai Berjualan
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-primary transition-all duration-300 group-hover:w-full" />
              </Link>

            </div>



            <div className="hidden md:flex items-center gap-3 ml-auto">
              {/* Search Toggle and Expanding Input */}
              <div className="relative flex items-center">
                <AnimatePresence>
                  {isMobileSearchOpen && (
                    <motion.div
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 240, opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-full top-1/2 -translate-y-1/2 mr-4 overflow-visible z-50 flex"
                    >
                      <div className="relative w-full group">
                        <input
                          id="desktop-search"
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onFocus={() => setIsSearchFocused(true)}
                          onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                          placeholder="Cari menu..."
                          className={`input-field w-full pl-4 pr-10 rounded-full focus:bg-surface transition-all duration-300 border-transparent focus:border-brand-primary/50 focus:ring-4 focus:ring-brand-primary/10 ${isScrolled ? 'bg-base' : 'bg-white/95 text-black'}`}
                        />
                        <button
                          onClick={() => {
                            if (searchQuery) {
                              setSearchQuery("");
                            } else {
                              setIsMobileSearchOpen(false);
                            }
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary p-1 rounded-full hover:bg-gray-100 transition-colors"
                          aria-label="Close search"
                        >
                          <X className="w-4 h-4" />
                        </button>

                        {/* Desktop Search Dropdown */}
                        {searchQuery && isSearchFocused && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-xl shadow-lg overflow-hidden z-[100] w-[240px]">
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
                                      router.push(product.sellerId ? `/store/${encodeURIComponent((product.sellerName || 'toko').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))}-${product.sellerId}?view=katalog` : `/product/${encodeURIComponent((product.name || 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))}-${product.id}`);
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
                                      <p className="text-xs text-text-secondary truncate text-black truncate">Rp {product.price?.toLocaleString('id-ID')} • {(product.sellerName || 'Toko').toUpperCase()}</p>
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
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  onClick={() => {
                    if (!isMobileSearchOpen) {
                      setIsMobileSearchOpen(true);
                      setTimeout(() => document.querySelector<HTMLInputElement>('#desktop-search')?.focus(), 100);
                    }
                  }}
                  className={`p-2 rounded-full transition-colors relative flex items-center justify-center w-10 h-10 border ${isScrolled ? 'border-border hover:bg-gray-100 dark:hover:bg-border text-text-primary' : 'border-white/40 bg-white/10 hover:bg-white/20 text-white'}`}
                  aria-label="Toggle Search"
                >
                  <Search className="w-5 h-5" />
                </button>
              </div>

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
                      <span className="bg-brand-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center absolute -top-2 -right-2 border-2 border-white shadow-sm">
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
                className="md:hidden border-t border-border/50 bg-white/95 dark:bg-surface/95 backdrop-blur-md overflow-hidden"
              >
                <div className="p-4 relative">
                  <div className="relative w-full">
                    <input
                      id="mobile-search"
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => setIsSearchFocused(true)}
                      onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                      placeholder="Cari menu..."
                      className="w-full pl-10 pr-10 py-2.5 bg-base/50 dark:bg-base text-text-primary rounded-full transition-all duration-300 border border-border focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 text-sm outline-none"
                    />
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary p-1 rounded-full hover:bg-gray-100 dark:hover:bg-border/50 transition-colors"
                        aria-label="Clear search"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Dropdown list for matching search results in mobile view */}
                  {searchQuery && isSearchFocused && (
                    <div className="relative mt-3 bg-surface border border-border rounded-xl shadow-lg overflow-hidden z-[100] max-h-60 overflow-y-auto">
                      {filteredProducts.length > 0 ? (
                        filteredProducts.slice(0, 5).map(product => (
                          <button
                            key={product.id}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setSearchQuery(product.name);
                              setIsSearchFocused(false);
                              setIsMobileSearchOpen(false);
                              router.push(product.sellerId ? `/store/${encodeURIComponent((product.sellerName || 'toko').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))}-${product.sellerId}?view=katalog` : `/product/${encodeURIComponent((product.name || 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))}-${product.id}`);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-brand-primary/5 border-b border-border last:border-b-0 flex items-center gap-3 transition-colors text-text-primary"
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
                            <div className="flex-1 min-w-0 text-left">
                              <p className="text-sm font-semibold truncate">{product.name}</p>
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
                  )}
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
                    placeholder="Cari menu..."
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
                                router.push(product.sellerId ? `/store/${encodeURIComponent((product.sellerName || 'toko').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))}-${product.sellerId}?view=katalog` : `/product/${encodeURIComponent((product.name || 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))}-${product.id}`);
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
                        <span className="bg-brand-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-sm">
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
          <section className="relative flex min-h-[560px] items-end overflow-hidden px-6 pt-28 pb-16 sm:min-h-[580px] sm:px-8 sm:pt-32 sm:pb-20 md:min-h-[600px] md:pt-40 md:pb-20 lg:min-h-[640px] lg:px-12 lg:pt-40 lg:pb-24 xl:min-h-[680px] xl:pb-28 xl:pt-0">
            {/* Image Background */}
            <img
              src="/bg-pesanku.jpeg"
              alt="Pesanku Hero Background"
              className="absolute inset-0 w-full h-full object-cover z-0"
              style={{ objectPosition: 'center', filter: 'contrast(1.1) brightness(0.95)' }}
            />
            {/* Background Gradient */}
            <div className="absolute inset-0 z-[1]" style={{ background: 'linear-gradient(120deg, rgba(8,4,2,0.75) 0%, rgba(25,10,5,0.65) 55%, rgba(8,4,2,0.50) 100%)' }} />

            <div className="container mx-auto relative z-[2]">
              <div className="grid grid-cols-1 lg:grid-cols-[45%_55%] items-center gap-4 lg:gap-0">

                {/* Text Content */}
                <motion.div
                  initial={false}
                  animate={{
                    opacity: 1,
                    x: 0,
                  }}
                  transition={{
                    opacity: { duration: 0.6, ease: "easeOut" },
                    x: { duration: 0.6, ease: "easeOut" },
                  }}
                  className="max-w-2xl text-left z-10"
                >
                  <h1
                    className="mb-5 leading-[1.1] tracking-tight text-white font-extrabold"
                    style={{ fontSize: 'clamp(1.85rem, 4.5vw, 3.4rem)', textShadow: '0 2px 24px rgba(0,0,0,0.5)' }}
                  >
                    Pesan Makanan UMKM Favoritmu,{' '}
                    <span className="relative inline-block text-brand-primary">
                      Kapan Saja
                      <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 12" preserveAspectRatio="none">
                        <path d="M0 8 Q 100 0 200 8" fill="transparent" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
                      </svg>
                    </span>
                  </h1>
                  <p
                    className="mb-10 max-w-xl leading-relaxed font-medium"
                    style={{ fontSize: 'clamp(1rem, 2vw, 1.125rem)', color: 'rgba(255,255,255,0.88)', textShadow: '0 1px 8px rgba(0,0,0,0.35)' }}
                  >
                    Sistem preorder makanan dan minuman dari UMKM lokal dengan minimum order yang jelas. Rasakan hidangan segar langsung dari tangan ahlinya.
                  </p>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-start gap-4">
                    <Link
                      href="#katalog"
                      className="w-full rounded-xl bg-brand-primary px-8 py-3.5 text-center text-lg font-bold text-white shadow-xl shadow-brand-primary/40 transition-all hover:scale-105 hover:bg-brand-primary-hover active:scale-95 sm:w-auto"
                      style={{ letterSpacing: '0.01em' }}
                    >
                      🛒 Mulai Belanja
                    </Link>
                    <Link
                      href="/seller"
                      className="w-full cursor-pointer rounded-xl border-2 border-white/50 px-8 py-3.5 text-center text-lg font-semibold text-white backdrop-blur-sm bg-white/10 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-white hover:bg-white/20 hover:shadow-md active:scale-95 sm:w-auto"
                    >
                      Daftar Jadi Penjual
                    </Link>
                  </div>
                </motion.div>

                {/* Image Content */}
                <motion.div
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                  className="flex justify-center lg:justify-end items-center relative mt-10 md:mt-12 lg:mt-0 lg:-mr-12 xl:-mr-20"
                >
                  <Image 
                    src="/animasi-nobg.png" 
                    alt="Animasi Pesanku" 
                    width={1600}
                    height={1600}
                    quality={100}
                    unoptimized={true}
                    priority
                    className="w-full sm:w-[85%] md:w-[75%] lg:w-full xl:w-[115%] max-w-[500px] lg:max-w-none object-contain transition-transform duration-700 ease-out hover:scale-[1.03] lg:origin-right" 
                    style={{ filter: 'drop-shadow(0 25px 35px rgba(0,0,0,0.6))' }} 
                  />
                </motion.div>

              </div>
            </div>
          </section>
        )}

        {/* Katalog Section */}
        <section id="katalog" className={`scroll-mt-24 px-4 container mx-auto ${categoryFilter ? 'py-16' : 'pb-16 pt-8'}`}>

          {/* UMKM Terpopuler Section — Infinite Marquee Slider */}
          {!categoryFilter && popularSellers.length > 0 && (() => {
            // Triple the list for seamless infinite loop
            const loopSellers = [...popularSellers, ...popularSellers, ...popularSellers];

            // Card width + gap in pixels (used for speed calc)
            const cardW = 192; // ~w-48
            const gap = 24;
            const totalWidth = popularSellers.length * (cardW + gap);
            const durationSec = totalWidth / 60; // 60px per second

            return (
              <div className="mb-16">
                {/* Header */}
                <div className="mb-6 flex flex-col md:flex-row justify-center items-center relative gap-4">
                  <div className="text-center w-full">
                    <div className="flex items-center justify-center gap-4 mb-2">
                      <div className="h-1 w-12 sm:w-16 bg-brand-primary/80 rounded-full"></div>
                      <h2 className="text-h2 tracking-tight mb-0">UMKM Terpopuler</h2>
                      <div className="h-1 w-12 sm:w-16 bg-brand-primary/80 rounded-full"></div>
                    </div>
                    <p className="text-body-base text-text-secondary">Pilihan toko favorit dengan kualitas terbaik.</p>
                  </div>

                  {/* Prev / Next manual controls */}
                  <div className="flex items-center gap-2 md:absolute md:right-0">
                    <button
                      onClick={() => { setSellerAutoPlay(false); setTimeout(() => setSellerAutoPlay(true), 8000); setSellerPage(prev => Math.max(prev - 1, 0)); }}
                      disabled={sellerPage === 0}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${sellerPage === 0 ? 'border-gray-200 text-gray-300 bg-gray-50 cursor-not-allowed dark:border-gray-700 dark:bg-gray-800' : 'border-gray-300 text-gray-700 bg-white hover:border-brand-primary hover:text-brand-primary hover:bg-brand-primary/5 dark:bg-surface dark:border-border dark:text-gray-300'}`}
                      aria-label="UMKM Sebelumnya"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                    </button>
                    <button
                      onClick={() => { setSellerAutoPlay(false); setTimeout(() => setSellerAutoPlay(true), 8000); setSellerPage(prev => prev + 1); }}
                      className="w-10 h-10 rounded-xl flex items-center justify-center border transition-all border-gray-300 text-gray-700 bg-white hover:border-brand-primary hover:text-brand-primary hover:bg-brand-primary/5 dark:bg-surface dark:border-border dark:text-gray-300"
                      aria-label="UMKM Selanjutnya"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                    </button>
                  </div>
                </div>

                {/* Infinite Marquee Strip */}
                <div
                  className="overflow-hidden relative"
                  style={{ maskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)' }}
                >
                  <motion.div
                    className="flex gap-6"
                    animate={sellerAutoPlay ? { x: [`0px`, `-${totalWidth}px`] } : {}}
                    transition={sellerAutoPlay ? { repeat: Infinity, duration: durationSec, ease: 'linear' } : {}}
                  >
                    {loopSellers.map((seller, idx) => (
                      <div
                        key={`${seller.sellerId}-${idx}`}
                        onClick={() => router.push(`/store/${encodeURIComponent((seller.storeName || 'toko').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))}-${seller.sellerId}?view=katalog`)}
                        className="flex-none w-40 sm:w-48 bg-white dark:bg-surface rounded-2xl border border-border p-4 shadow-sm group cursor-pointer flex flex-col items-center gap-3 hover:-translate-y-1 hover:shadow-lg hover:border-brand-primary/30 transition-all duration-300 relative overflow-hidden"
                        onMouseEnter={() => setSellerAutoPlay(false)}
                        onMouseLeave={() => setSellerAutoPlay(true)}
                      >
                        {/* Shimmer */}
                        <motion.div
                          className="absolute inset-0 pointer-events-none z-10"
                          animate={{ x: ['-120%', '120%'] }}
                          transition={{ repeat: Infinity, repeatDelay: 2.5, duration: 0.7, ease: 'easeIn', delay: (idx % popularSellers.length) * 0.6 }}
                        >
                          <div className="h-full w-2/5 bg-gradient-to-r from-transparent via-white/50 to-transparent skew-x-[-18deg]" />
                        </motion.div>

                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden shadow-sm border-2 border-brand-primary/20 ring-4 ring-brand-primary/10 group-hover:shadow-md transition-all duration-300 relative bg-white">
                          <img
                            src={seller.sellerAvatar}
                            alt={seller.storeName}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                        </div>
                        <div className="w-full text-center flex flex-col items-center justify-center gap-1">
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
                      </div>
                    ))}
                  </motion.div>
                </div>
              </div>
            );
          })()}

          {/* Categories Section */}
          {!categoryFilter && (
            <div id="kategori-pilihan" className="scroll-mt-24 mb-16">
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="mb-8 flex flex-col md:flex-row justify-center items-center relative gap-4"
              >
                <div className="text-center w-full">
                  <div className="flex items-center justify-center gap-4 mb-2">
                    <div className="h-1 w-12 sm:w-16 bg-brand-primary/80 rounded-full"></div>
                    <h2 className="text-h2 tracking-tight mb-0">Kategori Pilihan</h2>
                    <div className="h-1 w-12 sm:w-16 bg-brand-primary/80 rounded-full"></div>
                  </div>
                  <p className="text-body-base text-text-secondary">Eksplorasi ragam menu sesuai selera Anda.</p>
                </div>

              </motion.div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                {[
                  { name: 'Makanan Berat', image: makananBeratImage, keyword: 'nasi' },
                  { name: 'Minuman Segar', image: minumanImage, keyword: 'minum' },
                  { name: 'Jajanan & Cemilan', image: cemilanImage, keyword: 'cemilan' },
                  { name: 'Kue & Roti', image: kueImage, keyword: 'kue' },
                ].map((category, idx) => (
                  <motion.div
                    key={category.name}
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
                      <Image
                        src={category.image}
                        alt={category.name}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        unoptimized
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
            className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8 pt-4 lg:pt-0 mt-4"
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
                  className={`relative flex items-center justify-between w-36 sm:w-44 bg-white border px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl transition-all duration-300 group hover:border-brand-primary/60 outline-none focus:border-brand-primary ${isCategoryDropdownOpen ? 'border-brand-primary shadow-sm' : 'border-gray-300'}`}
                >
                  <span className={`absolute -top-2 left-3 px-1.5 text-[10px] sm:text-[11px] font-medium bg-white transition-colors duration-300 z-10 ${isCategoryDropdownOpen ? 'text-brand-primary' : 'text-gray-500 group-hover:text-brand-primary/80'}`}>
                    Kategori Makanan
                  </span>
                  <span className="text-[13px] sm:text-sm font-semibold text-gray-800 truncate text-left w-full">
                    {localCategoryFilter || 'Terpopuler'}
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 shrink-0 transition-transform duration-300 ml-1 ${isCategoryDropdownOpen ? 'rotate-180 text-brand-primary' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isCategoryDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute left-0 mt-3 w-48 bg-white dark:bg-surface border border-gray-100 rounded-xl shadow-xl overflow-hidden z-50 ring-1 ring-black/5"
                  >
                    <div className="p-2 flex flex-col gap-1">
                      {['Semua Makanan', 'Makanan Manis', 'Makanan Pedas', 'Makanan Gurih'].map(cat => (
                        <button
                          key={cat}
                          onClick={() => { setLocalCategoryFilter(cat === 'Semua Makanan' ? null : (localCategoryFilter === cat ? null : cat)); setIsCategoryDropdownOpen(false); }}
                          className={`flex items-center px-3 py-2.5 w-full text-left rounded-lg transition-colors text-sm font-medium relative ${((cat === 'Semua Makanan' && !localCategoryFilter) || localCategoryFilter === cat)
                            ? 'bg-brand-primary/5 text-brand-primary'
                            : 'hover:bg-brand-primary/5 hover:text-brand-primary text-gray-700'
                            }`}
                        >
                          {cat}
                          {((cat === 'Semua Makanan' && !localCategoryFilter) || localCategoryFilter === cat) && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/4 bg-brand-primary rounded-r-full" />
                          )}
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
                  className={`relative flex items-center justify-between w-36 sm:w-44 bg-white border px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl transition-all duration-300 group hover:border-brand-primary/60 outline-none focus:border-brand-primary ${isPriceFilterOpen ? 'border-brand-primary shadow-sm' : 'border-gray-300'}`}
                >
                  <span className={`absolute -top-2 left-3 px-1.5 text-[10px] sm:text-[11px] font-medium bg-white transition-colors duration-300 z-10 ${isPriceFilterOpen ? 'text-brand-primary' : 'text-gray-500 group-hover:text-brand-primary/80'}`}>
                    Urutkan Harga
                  </span>
                  <span className="text-[13px] sm:text-sm font-semibold text-gray-800 truncate text-left w-full">
                    {priceSortOrder === 'asc' ? 'Termurah' : (priceSortOrder === 'desc' ? 'Termahal' : 'Relevansi')}
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 shrink-0 transition-transform duration-300 ml-1 ${isPriceFilterOpen ? 'rotate-180 text-brand-primary' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {isPriceFilterOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 sm:left-0 sm:right-auto mt-3 w-48 sm:w-56 bg-white dark:bg-surface border border-gray-100 rounded-xl shadow-xl overflow-hidden z-50 ring-1 ring-black/5"
                  >
                    <div className="p-2 flex flex-col gap-1">
                      <button
                        onClick={() => { setPriceSortOrder('asc'); setIsPriceFilterOpen(false); }}
                        className={`flex items-center px-3 py-2.5 w-full text-left rounded-lg transition-colors text-sm font-medium relative ${priceSortOrder === 'asc' ? 'bg-brand-primary/5 text-brand-primary' : 'hover:bg-brand-primary/5 hover:text-brand-primary text-gray-700'}`}
                      >
                        Dari Termurah
                        {priceSortOrder === 'asc' && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/4 bg-brand-primary rounded-r-full" />}
                      </button>
                      <button
                        onClick={() => { setPriceSortOrder('desc'); setIsPriceFilterOpen(false); }}
                        className={`flex items-center px-3 py-2.5 w-full text-left rounded-lg transition-colors text-sm font-medium relative ${priceSortOrder === 'desc' ? 'bg-brand-primary/5 text-brand-primary' : 'hover:bg-brand-primary/5 hover:text-brand-primary text-gray-700'}`}
                      >
                        Dari Termahal
                        {priceSortOrder === 'desc' && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/4 bg-brand-primary rounded-r-full" />}
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
            <>
              <div className="relative group/carousel">
                {/* Floating Left Button (Carousel Style) */}
                {isDesktop && (
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className={`hidden md:flex absolute -left-4 xl:-left-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full items-center justify-center border shadow-xl transition-all ${currentPage === 1
                      ? 'border-gray-200 text-gray-300 bg-white/50 cursor-not-allowed dark:border-gray-800 dark:bg-surface/50'
                      : 'border-white text-brand-primary bg-white hover:scale-110 hover:shadow-brand-primary/20 dark:bg-surface dark:border-brand-primary dark:text-brand-primary'
                      }`}
                    aria-label="Halaman Sebelumnya"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                  </button>
                )}

                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
                >
                  {currentProducts.map((product) => {
                    const productImageUrl = product.imageUrl ?? "/street-food-festival.jpg";

                    // Format deadline
                    let deadlineText = "Tidak ada batas waktu";
                    if (product.deadlineDate) {
                      deadlineText = new Date(product.deadlineDate).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        timeZone: WIB_TIMEZONE,
                      });
                    }

                    return (
                      <motion.div variants={itemVariants} key={product.id}>
                        <div
                          className="group bg-white border border-gray-100 dark:bg-border dark:border-gray-800 rounded-[20px] p-2.5 sm:p-3 flex flex-row gap-3 sm:gap-4 hover:shadow-md transition-all duration-300 relative h-full"
                        >
                          {/* Left Image Area */}
                          <div className="relative w-[110px] h-[110px] sm:w-[120px] sm:h-[120px] shrink-0 rounded-[14px] overflow-hidden bg-gray-50 border border-black/5">
                            <Image
                              src={productImageUrl}
                              alt={product.name}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                              sizes="120px"
                            />
                            {/* Promo Badge Optional */}
                            {product.price > 50000 && (
                              <div className="absolute top-0 left-0 bg-[#ff4b4b] text-white text-[10px] font-bold px-2 py-0.5 rounded-br-xl shadow-sm z-10">
                                Terlaris!
                              </div>
                            )}
                            {/* Rating Badge */}
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-sm px-2.5 py-0.5 rounded-full flex items-center justify-center gap-1 shadow-[0_2px_8px_rgba(0,0,0,0.12)] border border-gray-100 z-10 min-w-[50px]">
                              <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-yellow-500 fill-yellow-500 shrink-0" />
                              <span className="text-[10px] sm:text-[11px] font-bold text-gray-800 leading-none pb-[1px]">{(product.averageRating ?? 0) > 0 ? product.averageRating!.toFixed(1) : 'Baru'}</span>
                            </div>
                          </div>

                          {/* Right Content Area */}
                          <div className="flex flex-col flex-1 min-w-0 pt-0.5">
                            {/* Title */}
                            <h3 className="text-[13px] sm:text-sm font-bold text-gray-900 dark:text-gray-100 leading-snug line-clamp-2 mb-1 group-hover:text-brand-primary transition-colors">
                              {product.name}
                            </h3>

                            {/* Subtitle / Tags */}
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mb-1.5 line-clamp-1">
                              {product.sellerName || 'Toko'} • {(product as any).category || 'Makanan'}
                            </p>

                            <div className="mb-auto"></div>

                            {/* Location / Meta Info */}
                            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-gray-500 font-medium mb-1 w-full overflow-hidden">
                              <Calendar className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                              <span className="truncate">{deadlineText}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-gray-500 font-medium mb-1 w-full overflow-hidden">
                              <MapPin className="w-3.5 h-3.5 text-[#ff4b4b] shrink-0" />
                              <span className="truncate">{product.sellerAddress || product.storeAddress || 'Alamat tidak tersedia'}</span>
                            </div>

                            {/* Price Row */}
                            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold mb-2">
                              <span className="text-brand-primary truncate font-bold text-sm">
                                Rp {product.price.toLocaleString('id-ID')}
                              </span>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-1.5 sm:gap-2 mt-auto w-full">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleInternalPresalesChat(product.storeName || product.sellerName || 'Toko UMKM', product.id, product.name, product.sellerId || '', product.sellerLogoUrl || product.sellerAvatar, product.price, product.imageUrl || '');
                                }}
                                className="w-full flex items-center justify-center gap-1 bg-brand-primary text-white py-1.5 rounded-lg text-[10px] sm:text-xs font-bold hover:bg-brand-primary-hover transition-colors relative z-20 group/btn"
                              >
                                <MessageCircle className="w-3 h-3 group-hover/btn:scale-110 transition-transform shrink-0" />
                                <span className="truncate">Chat Penjual</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </motion.div>

                {/* Floating Right Button (Carousel Style) */}
                {isDesktop && (
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage >= totalPages}
                    className={`hidden md:flex absolute -right-4 xl:-right-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full items-center justify-center border shadow-xl transition-all ${currentPage >= totalPages
                      ? 'border-gray-200 text-gray-300 bg-white/50 cursor-not-allowed dark:border-gray-800 dark:bg-surface/50'
                      : 'border-white text-brand-primary bg-white hover:scale-110 hover:shadow-brand-primary/20 dark:bg-surface dark:border-brand-primary dark:text-brand-primary'
                      }`}
                    aria-label="Halaman Selanjutnya"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                  </button>
                )}
              </div>

              {/* Mobile Load More Controls */}
              {!isDesktop && displayProducts.length > visibleMobileItems && (
                <div className="flex md:hidden justify-center items-center mt-8 mb-4">
                  <button
                    onClick={() => setVisibleMobileItems(prev => prev + 12)}
                    className="px-6 py-2.5 rounded-full border border-border text-sm font-semibold text-text-primary hover:border-brand-primary hover:text-brand-primary transition-colors bg-surface shadow-sm"
                  >
                    Tampilkan Lebih Banyak
                  </button>
                </div>
              )}

              {/* Desktop Pagination Controls */}
              {isDesktop && (
                <div className="hidden md:flex justify-center items-center gap-2 mt-12 mb-4">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${currentPage === 1 ? 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed dark:border-gray-700 dark:bg-gray-800' : 'border-gray-300 text-gray-700 bg-white hover:border-brand-primary hover:text-brand-primary hover:bg-brand-primary/5 dark:bg-surface dark:border-border dark:text-gray-300'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                  </button>

                  <div className="flex items-center gap-1.5 px-2">
                    {Array.from({ length: totalPages }).map((_, idx) => {
                      const page = idx + 1;
                      // simple pagination logic to show max 5 pages
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all ${currentPage === page ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/20' : 'bg-transparent text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-border'}`}
                          >
                            {page}
                          </button>
                        );
                      }
                      if (
                        page === currentPage - 2 ||
                        page === currentPage + 2
                      ) {
                        return <span key={page} className="text-gray-400">...</span>;
                      }
                      return null;
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${currentPage === totalPages ? 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed dark:border-gray-700 dark:bg-gray-800' : 'border-gray-300 text-gray-700 bg-white hover:border-brand-primary hover:text-brand-primary hover:bg-brand-primary/5 dark:bg-surface dark:border-border dark:text-gray-300'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* About Platform Section */}
        <section id="about-platform" className="scroll-mt-24 px-4 container mx-auto pb-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-brand-primary rounded-[2.5rem] border border-brand-primary/10 overflow-hidden flex flex-col md:flex-row items-center gap-10 p-8 sm:p-12 lg:p-16 relative shadow-lg"
          >
            <div className="flex-1 flex flex-col justify-center">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-8 text-white leading-snug tracking-tight">
                Kenapa harus pilih <span className="relative inline-block">
                  <strong className="text-white">Pesanku?</strong>
                  <svg className="absolute -bottom-1 lg:-bottom-2 left-0 w-full text-white" viewBox="0 0 100 20" preserveAspectRatio="none">
                    <path d="M0 10 Q 50 20 100 10" fill="transparent" stroke="currentColor" strokeWidth="4" />
                  </svg>
                </span>
              </h2>
              <ul className="space-y-6 text-white/95 text-lg sm:text-xl lg:text-2xl max-w-2xl leading-relaxed">
                <li className="flex items-start gap-4">
                  <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 mt-2.5 sm:mt-3.5 rounded-full bg-white shrink-0 shadow-sm" />
                  <span><strong className="text-white font-bold">Kualitas Terkurasi:</strong> Hidangan langsung dari tangan ahlinya untuk setiap acara Anda.</span>
                </li>
                <li className="flex items-start gap-4">
                  <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 mt-2.5 sm:mt-3.5 rounded-full bg-white shrink-0 shadow-sm" />
                  <span><strong className="text-white font-bold">Preorder Mudah & Transparan:</strong> Jadwal produksi dan batas minimum pemesanan yang jelas tanpa bingung.</span>
                </li>
                <li className="flex items-start gap-4">
                  <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 mt-2.5 sm:mt-3.5 rounded-full bg-white shrink-0 shadow-sm" />
                  <span><strong className="text-white font-bold">Komunikasi Langsung:</strong> Fitur chat langsung dengan pembuat makanan untuk kustomisasi pesanan.</span>
                </li>
              </ul>
            </div>

            {/* Chef Image */}
            <div className="flex-1 w-full flex justify-center md:justify-end">
              <div className="w-full max-w-[240px] aspect-[4/5] relative group flex items-center justify-center">
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
        <section id="alur-pemesanan" className="px-4 container mx-auto pb-24">
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
            {/* Connecting Line for Tablet and Desktop */}
            <div data-flow-connector="desktop" className="hidden md:block absolute top-[2.5rem] left-0 w-full h-1 bg-border -translate-y-1/2 z-0 rounded-full overflow-hidden">
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
                    className={`w-20 h-20 border-2 rounded-2xl flex items-center justify-center mb-6 shadow-lg transition-all duration-300 relative overflow-hidden cursor-pointer ${isActive
                      ? 'bg-brand-primary border-brand-primary text-white shadow-brand-primary/40 rotate-3'
                      : 'bg-surface border-brand-primary/20 shadow-brand-primary/10 group-hover:bg-brand-primary group-hover:text-white group-hover:border-brand-primary group-hover:rotate-3'
                      }`}
                  >
                    <div className={`absolute inset-0 transition-opacity ${isActive ? 'bg-black/10' : 'bg-brand-primary/5 group-hover:opacity-0'}`} />
                    <step.icon className={`w-8 h-8 transition-colors duration-300 relative z-10 ${isActive ? 'text-white' : 'text-brand-primary group-hover:text-white'}`} />
                  </motion.div>
                  <h3 className={`text-lg font-bold mb-3 transition-colors cursor-default ${isActive ? 'text-brand-primary' : 'text-text-primary group-hover:text-brand-primary'}`}>{step.title}</h3>
                  <p className="text-sm text-text-secondary leading-relaxed max-w-[200px] cursor-default">{step.desc}</p>
                  {idx < 3 && (
                    <div
                      aria-hidden="true"
                      data-flow-connector="mobile"
                      className="md:hidden absolute left-1/2 top-full h-8 w-1 -translate-x-1/2 overflow-hidden rounded-full bg-border"
                    >
                      <motion.div
                        animate={{ height: activeStep > idx ? '100%' : '0%' }}
                        transition={{ duration: 0.8, ease: 'easeInOut' }}
                        className="absolute left-0 top-0 w-full rounded-full bg-brand-primary"
                      />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        </section>
      </main>
      <QRScannerModal isOpen={isQRScannerOpen} onClose={() => setIsQRScannerOpen(false)} />

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



      {/* Modals & Overlays */}
      <QRScannerModal isOpen={isQRScannerOpen} onClose={() => setIsQRScannerOpen(false)} />
      <PreChatModal
        isOpen={isPreChatModalOpen}
        onClose={() => setIsPreChatModalOpen(false)}
        target={chatTarget}
        user={user || null}
      />

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
            onClick={scrollToCatalog}
            className="flex flex-col items-center gap-1.5 text-text-secondary hover:text-brand-primary transition-colors pb-2 w-1/2"
          >
            <ShoppingBag className="w-6 h-6 stroke-[1.5]" />
            <span>Belanja</span>
          </button>
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
          <Link
            href={user ? (user.role === 'admin' ? '/admin' : user.role === 'penjual' ? '/seller' : '/buyer/orders') : '/buyer/orders'}
            className="flex flex-col items-center gap-1.5 text-text-secondary hover:text-brand-primary transition-colors pb-2 relative w-1/2"
          >
            <div className="relative">
              <FileText className="w-6 h-6 stroke-[1.5]" />
              {user && user.role === 'pembeli' && orderCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-brand-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-sm">
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
      <HelpWidget />
    </>
  );
}
