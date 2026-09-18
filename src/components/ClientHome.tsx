"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, Search, ShoppingBag, Menu, X, Heart, ChevronUp, ChevronDown, Sun, Moon, LogOut, User, FileText, Home, Store, LayoutDashboard, Sparkles, MessageCircle, ScanLine, MapPin, Star, MessageSquare, Calendar, ChefHat, Check } from "lucide-react";
import { motion, Variants, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";
import dynamic from "next/dynamic";
const QRScannerModal = dynamic(() => import("@/components/QRScannerModal"), { ssr: false });
import HelpWidget from "@/components/HelpWidget";
import CartSidebar from "@/components/CartSidebar";
import { useCart } from "@/lib/cart";
import { ProductItem, AuthUser } from "@/types";
import ProductRating from "@/components/ProductRating";
import PreChatModal from '@/components/PreChatModal';
import { WIB_TIMEZONE } from "@/lib/promotionFormatting";
import { useDarkMode } from "@/hooks";
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
  const { addItem: addCartItem } = useCart();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const { isDarkMode, toggleDarkMode } = useDarkMode();
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

  const [isAlurOpen, setIsAlurOpen] = useState(false);
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

  const [orderCount, setOrderCount] = useState(0);

  // Pre-Chat Modal State
  const [isPreChatModalOpen, setIsPreChatModalOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        .catch((_e) => { });
    }
  }, [user]);

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
      <div className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 pt-4 px-4 sm:px-6`}>
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
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm transition-colors duration-300 bg-brand-primary">
                  <ShoppingBag className="w-5 h-5 transition-colors duration-300 text-white" />
                </div>
                <div className="flex items-baseline">
                  <span className="text-h2 font-extrabold tracking-tight transition-colors duration-300 text-gray-900 dark:text-white">
                    pesanku
                  </span>
                  <span className="text-h2 font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-rose-500 ml-1.5 drop-shadow-sm">
                    nusantara
                  </span>
                </div>
              </motion.div>
            </Link>



            <div className="hidden lg:flex items-center gap-3 lg:gap-6 flex-1 justify-center px-4 whitespace-nowrap">
              <Link
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToTop();
                }}
                className="text-body-small font-medium transition-all relative group text-text-secondary hover:text-brand-primary"
              >
                Beranda
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-primary transition-all duration-300 group-hover:w-full" />
              </Link>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  scrollToCategories();
                }}
                className="text-body-small font-medium transition-all relative group cursor-pointer text-text-secondary hover:text-brand-primary"
              >
                Katalog Makanan / Minuman
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-primary transition-all duration-300 group-hover:w-full" />
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  scrollToAbout();
                }}
                className="text-body-small font-medium transition-all relative group cursor-pointer text-text-secondary hover:text-brand-primary"
              >
                Tentang Kami
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-primary transition-all duration-300 group-hover:w-full" />
              </button>
              <Link
                href="/seller"
                className="text-body-small font-medium transition-all relative group text-text-secondary hover:text-brand-primary"
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
                          className={`input-field w-full pl-4 pr-10 rounded-full focus:bg-surface transition-all duration-300 border-transparent focus:border-brand-primary/50 focus:ring-4 focus:ring-brand-primary/10 bg-base`}
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
                          <div className="absolute top-full left-0 right-0 mt-2 bg-brand-primary border border-brand-primary text-white rounded-xl shadow-lg shadow-brand-primary/20 overflow-hidden z-[100] w-[240px]">
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
                                    className="w-full text-left px-4 py-3 hover:bg-white/10 border-b border-white/20 last:border-b-0 flex items-center gap-3 transition-colors"
                                  >
                                    {product.imageUrl ? (
                                      <div className="w-10 h-10 rounded-lg bg-white/10 overflow-hidden shrink-0">
                                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                      </div>
                                    ) : (
                                      <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                                        <ShoppingBag className="w-5 h-5 text-white/80" />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold text-white truncate">{product.name}</p>
                                      <p className="text-xs text-white/80 truncate">Rp {product.price?.toLocaleString('id-ID')} • {(product.sellerName || 'Toko').toUpperCase()}</p>
                                    </div>
                                  </button>
                                ))
                              ) : (
                                <div className="px-4 py-4 text-center text-sm text-white/90">
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
                  className={`p-2 rounded-full transition-colors relative flex items-center justify-center w-10 h-10 border border-border hover:bg-gray-100 dark:hover:bg-border text-text-primary`}
                  aria-label="Toggle Search"
                >
                  <Search className="w-5 h-5" />
                </button>
              </div>

              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-full transition-colors relative overflow-hidden flex items-center justify-center w-10 h-10 border border-border hover:bg-gray-100 dark:hover:bg-border`}
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
                      <Moon className={`w-5 h-5 text-brand-primary`} />
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
                      <Sun className={`w-5 h-5 text-brand-primary`} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>



              {user ? (
                <div className="flex items-center gap-2">
                  <Link
                    href={user.role === 'admin' ? '/admin' : user.role === 'penjual' ? '/seller' : '/buyer/orders'}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-all duration-200 shadow-lg active:scale-95 hover:-translate-y-0.5 relative bg-brand-primary text-white shadow-brand-primary/20 hover:bg-brand-primary-hover hover:shadow-brand-primary/40`}
                  >
                    {user.role === 'admin' || user.role === 'penjual' ? 'Dashboard' : 'Lihat Pesanan Saya'}
                    {user.role === 'pembeli' && orderCount > 0 && (
                      <span className="bg-brand-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center absolute -top-2 -right-2 border-2 border-white shadow-sm">
                        {orderCount}
                      </span>
                    )}
                  </Link>

                  <div className="relative">
                    <button
                      onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                      className={`flex items-center justify-center p-2 rounded-xl transition-all border border-transparent text-text-secondary hover:text-brand-primary hover:bg-brand-primary/5`}
                      title="Profil Akun"
                    >
                      <User className="w-5 h-5" />
                    </button>
                    {isUserDropdownOpen && (
                      <div className="hidden md:block absolute right-0 top-full mt-2 w-52 bg-white dark:bg-surface border border-border rounded-xl shadow-xl z-[100] py-1 overflow-hidden">
                        <div className="px-4 py-3 border-b border-border">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs text-text-secondary">Masuk sebagai</p>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary uppercase tracking-wide">{user.role}</span>
                          </div>
                          <p className="font-bold text-text-primary text-sm truncate">{user.name}</p>
                        </div>
                        <Link
                          href="/profile"
                          onClick={() => setIsUserDropdownOpen(false)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-primary hover:bg-surface-secondary transition-colors"
                        >
                          <User className="w-4 h-4 text-text-secondary" />
                          Pengaturan Akun
                        </Link>
                        <div className="border-t border-border mt-1 pt-1">
                          <button
                            onClick={() => { setIsUserDropdownOpen(false); handleLogout(); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-status-error hover:bg-status-error/10 transition-colors"
                          >
                            <LogOut className="w-4 h-4" />
                            Keluar Akun
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <Link href="/login" className="px-4 py-2 rounded-lg font-medium transition-all shadow-md bg-brand-primary text-white shadow-brand-primary/20 hover:bg-brand-primary-hover hover:shadow-brand-primary/40">
                    Masuk
                  </Link>
                  <Link href="/register" className="px-4 py-2 rounded-lg font-medium transition-all border border-brand-primary text-brand-primary bg-transparent hover:bg-brand-primary/5">
                    Daftar
                  </Link>
                </>
              )}
            </div>

            <div className="md:hidden flex items-center gap-1 relative right-2">
              {user && (user.role === 'admin' || user.role === 'penjual') && (
                <Link
                  href={user.role === 'admin' ? '/admin' : '/seller'}
                  className={`p-2 rounded-full transition-colors relative flex items-center justify-center w-10 h-10 group hover:bg-brand-primary/10`}
                  aria-label="Dashboard"
                  title="Buka Dashboard"
                >
                  <LayoutDashboard className={`w-5 h-5 transition-colors text-text-primary group-hover:text-brand-primary`} />
                </Link>
              )}

              {/* Mobile Search Toggle */}
              <button
                onClick={() => {
                  setIsMobileSearchOpen(!isMobileSearchOpen);
                  if (!isMobileSearchOpen) setTimeout(() => document.querySelector<HTMLInputElement>('#mobile-search')?.focus(), 100);
                }}
                className={`p-2 rounded-full transition-colors relative flex items-center justify-center w-10 h-10 hover:bg-brand-primary/10`}
                aria-label="Toggle Search"
              >
                <Search className={`w-5 h-5 ${isMobileSearchOpen ? 'text-brand-primary' : 'text-text-primary'}`} />
              </button>

              {/* Mobile Theme Toggle */}
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-full transition-colors relative overflow-hidden flex items-center justify-center w-10 h-10 hover:bg-brand-primary/10`}
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
                      <Moon className={`w-5 h-5 text-brand-primary`} />
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
                      <Sun className={`w-5 h-5 text-brand-primary`} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>

              {/* Mobile User Icon and Dropdown */}
              <div className="relative">
                <button
                  onClick={() => user ? setIsUserDropdownOpen(!isUserDropdownOpen) : router.push('/login')}
                  className={`p-2 rounded-full transition-colors relative flex items-center justify-center w-10 h-10 hover:bg-brand-primary/10`}
                  aria-label="Profil Akun"
                  title="Profil Akun"
                >
                  <User className={`w-5 h-5 text-text-primary`} />
                </button>
                {isUserDropdownOpen && user && (
                  <div className="md:hidden absolute right-0 top-full mt-2 w-56 bg-white dark:bg-surface border border-border rounded-xl shadow-xl z-[100] py-1 overflow-hidden">
                    <div className="px-4 py-3 border-b border-border">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs text-text-secondary">Masuk sebagai</p>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary uppercase tracking-wide">{user.role}</span>
                      </div>
                      <p className="font-bold text-text-primary text-sm truncate">{user.name}</p>
                    </div>
                    <Link
                      href="/profile"
                      onClick={() => setIsUserDropdownOpen(false)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-text-primary hover:bg-surface-secondary transition-colors"
                    >
                      <User className="w-4 h-4 text-text-secondary" />
                      Pengaturan Akun
                    </Link>
                    <Link
                      href={user.role === 'admin' ? '/admin' : user.role === 'penjual' ? '/seller' : '/buyer/orders'}
                      onClick={() => setIsUserDropdownOpen(false)}
                      className="md:hidden w-full flex items-center gap-3 px-4 py-3 text-sm text-text-primary hover:bg-surface-secondary transition-colors"
                    >
                      {user.role === 'admin' || user.role === 'penjual' ? <LayoutDashboard className="w-4 h-4 text-text-secondary" /> : <ShoppingBag className="w-4 h-4 text-text-secondary" />}
                      {user.role === 'admin' || user.role === 'penjual' ? 'Dashboard' : 'Pesanan Saya'}
                    </Link>
                    <div className="border-t border-border mt-1 pt-1">
                      <button
                        onClick={() => { setIsUserDropdownOpen(false); handleLogout(); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-status-error hover:bg-status-error/10 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Keluar Akun
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
                    <div className="absolute top-full left-0 right-0 mt-2 bg-brand-primary border border-brand-primary text-white rounded-xl shadow-lg shadow-brand-primary/20 overflow-hidden z-50">
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
                              className="w-full text-left px-4 py-3 hover:bg-white/10 border-b border-white/20 last:border-b-0 flex items-center gap-3 transition-colors"
                            >
                              {product.imageUrl ? (
                                <div className="w-10 h-10 rounded-lg bg-white/10 overflow-hidden shrink-0">
                                  <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                </div>
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                                  <ShoppingBag className="w-5 h-5 text-white/80" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white truncate">{product.name}</p>
                                <p className="text-xs text-white/80 truncate">Rp {product.price?.toLocaleString('id-ID')} • {(product.sellerName || 'Toko').toUpperCase()}</p>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-4 text-center text-sm text-white/90">
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
                    <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="btn-primary w-full text-center">
                      Masuk
                    </Link>
                    <Link href="/register" onClick={() => setIsMobileMenuOpen(false)} className="btn-outline w-full text-center">
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
          <section className="relative flex min-h-[440px] md:min-h-[500px] items-center justify-center overflow-hidden px-6 pt-24 pb-16 sm:px-8 sm:pt-32 sm:pb-20 bg-white dark:bg-base">

            <div className="container mx-auto relative z-10 mt-8">
              <div className="flex flex-col-reverse lg:flex-row items-center justify-between text-left gap-8 lg:gap-8 w-full">

                {/* Text Content */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ opacity: { duration: 0.6, ease: "easeOut" }, y: { duration: 0.6, ease: "easeOut" } }}
                  className="max-w-2xl lg:w-1/2 flex flex-col items-center sm:items-start text-center sm:text-left"
                >
                  <h1
                    className="mb-5 leading-[1.1] tracking-tight text-gray-900 dark:text-white font-extrabold"
                    style={{ fontSize: 'clamp(2rem, 5vw, 3.8rem)' }}
                  >
                    Pesan Makanan UMKM Favoritmu,{' '}
                    <span className="relative inline-block text-brand-primary">
                      Kapan Saja
                      <svg className="absolute -bottom-2 left-0 w-full text-brand-primary/30" viewBox="0 0 200 12" preserveAspectRatio="none">
                        <path d="M0 8 Q 100 0 200 8" fill="transparent" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                      </svg>
                    </span>
                  </h1>
                  <p
                    className="mb-10 max-w-xl leading-relaxed font-medium text-gray-600 dark:text-gray-300"
                    style={{ fontSize: 'clamp(1rem, 2vw, 1.15rem)' }}
                  >
                    Sistem preorder makanan dan minuman dari UMKM lokal dengan minimum order yang jelas. Rasakan hidangan segar langsung dari tangan ahlinya.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center sm:items-center justify-start gap-4 w-full sm:w-auto">
                    <Link
                      href="#alur-pemesanan"
                      className="w-full rounded-xl bg-brand-primary px-8 py-3.5 text-center text-lg font-bold text-white shadow-lg shadow-brand-primary/20 transition-all hover:scale-105 hover:bg-brand-primary-hover active:scale-95 sm:w-auto flex items-center justify-center gap-2"
                      style={{ letterSpacing: '0.01em' }}
                    >
                      📖 Tata Cara Pemesanan
                    </Link>
                    <Link
                      href="#rekomendasi"
                      className="w-full cursor-pointer rounded-xl bg-brand-primary border border-brand-primary px-8 py-3.5 text-center text-lg font-bold text-white transition-all shadow-md hover:bg-brand-primary-hover hover:scale-105 active:scale-95 sm:w-auto"
                    >
                      Pesan Order
                    </Link>
                  </div>
                </motion.div>

                {/* Hero Image Block */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
                  className="w-full lg:w-1/2 flex justify-center lg:justify-end relative mb-4 lg:mb-0"
                >
                  <div className="relative w-full max-w-sm sm:max-w-md lg:max-w-lg">
                    {/* Decorative Blob Context */}
                    <div className="absolute inset-0 bg-brand-primary/20 blur-[64px] rounded-full scale-125 -z-10 translate-x-4 translate-y-4"></div>
                    
                    <img 
                      src="/background-header.jpeg" 
                      alt="Pesan Makanan UMKM Favoritmu" 
                      className="w-full h-auto object-cover rounded-3xl shadow-[0_20px_60px_-15px_rgba(128,0,0,0.3)] ring-1 ring-gray-900/5 rotate-2 hover:rotate-0 transition-transform duration-700 ease-out relative z-10"
                    />
                  </div>
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
                              <ProductRating averageRating={seller.averageRating} ratingCount={seller.totalCount} className="[&>span]:text-text-secondary" />
                            </div>
                          ) : (
                            <span className="text-[10px] text-text-secondary">Belum ada rating</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                </div>
              </div>
            );
          })()}



          {/* Alur Pemesanan Section */}
          <section id="alur-pemesanan" className="px-4 container mx-auto mb-16 pt-8">
            <div className="bg-brand-primary rounded-3xl shadow-xl shadow-brand-primary/20 overflow-hidden">
              {/* Header / Toggle */}
              <button
                onClick={() => setIsAlurOpen(!isAlurOpen)}
                className="w-full text-left px-6 py-6 sm:px-10 sm:py-8 flex items-center justify-between group focus:outline-none"
              >
                <div>
                  <h2 className="text-h2 text-white mb-2 tracking-tight group-hover:text-white/90 transition-colors">Bagaimana Cara Pesan?</h2>
                  <p className="text-body-base text-white/80 max-w-2xl">4 langkah mudah untuk menikmati hidangan segar langsung dari UMKM pilihan Anda.</p>
                </div>
                <motion.div
                  animate={{ rotate: isAlurOpen ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0 ml-4"
                >
                  <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </motion.div>
              </button>

              {/* Dropdown Content */}
              <AnimatePresence>
                {isAlurOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                    className="px-6 sm:px-10 pb-8 sm:pb-12"
                  >
                    <motion.div
                      onViewportEnter={() => setFlowInView(true)}
                      className="grid grid-cols-1 md:grid-cols-4 gap-8 relative max-w-5xl mx-auto pt-8 border-t border-white/20"
                    >
                      {/* Connecting Line for Tablet and Desktop */}
                      <div data-flow-connector="desktop" className="hidden md:block absolute top-[3.5rem] left-0 w-full h-1 bg-white/20 -translate-y-1/2 z-0 rounded-full overflow-hidden">
                        <motion.div
                          animate={{ width: activeStep >= 0 ? `${(activeStep * 25) + 12.5}%` : "0%" }}
                          transition={{ duration: 0.8, ease: "easeInOut" }}
                          className="h-full bg-white rounded-full opacity-80"
                        />
                      </div>

                      {/* Steps */}
                      {[
                        { icon: Search, title: "1. Pilih Produk", desc: "Temukan hidangan favorit dari katalog UMKM.", delay: 0.2 },
                        { icon: MessageCircle, title: "2. Diskusi & Pesan", desc: "Chat penjual untuk kustomisasi preorder.", delay: 0.4 },
                        { icon: Store, activeIcon: ChefHat, title: "3. Proses Produksi", desc: "Penjual menyiapkan pesanan segar.", delay: 0.6 },
                        { icon: ShoppingBag, activeIcon: Check, activeBg: "bg-green-500", title: "4. Pesanan Tiba", desc: "Terima hidangan tepat waktu.", delay: 0.8 }
                      ].map((step, idx) => {
                        const isActive = activeStep === idx;
                        const CurrentIcon = isActive && step.activeIcon ? step.activeIcon : step.icon;

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
                              whileHover={{ scale: 1.15, rotate: 6 }}
                              animate={{
                                y: isActive ? [0, -12, 0] : [0, -4, 0],
                                scale: isActive ? 1.15 : 1
                              }}
                              transition={{
                                y: { repeat: Infinity, duration: isActive ? 2 : 4, delay: idx * 0.2, ease: "easeInOut" },
                                scale: { type: "spring", stiffness: 300, damping: 15 }
                              }}
                              className={`w-20 h-20 border-2 flex items-center justify-center mb-6 shadow-lg transition-all duration-500 relative overflow-hidden cursor-pointer ${isActive
                                ? (step.activeBg ? `${step.activeBg} border-transparent text-white shadow-green-500/40 rotate-3 rounded-2xl ring-4 ring-green-500/20` : 'bg-white border-white text-brand-primary shadow-white/40 rotate-3 rounded-2xl ring-4 ring-white/20')
                                : 'bg-brand-primary border-white/30 shadow-black/10 rounded-[1.75rem] group-hover:bg-white group-hover:border-white group-hover:rotate-6 group-hover:shadow-white/20 group-hover:rounded-2xl group-hover:text-brand-primary'
                                }`}
                            >
                              <div className={`absolute inset-0 transition-opacity ${isActive ? 'bg-transparent' : 'bg-black/10 group-hover:opacity-0'}`} />

                              <AnimatePresence mode="wait">
                                <motion.div
                                  key={isActive ? 'active' : 'inactive'}
                                  initial={{ scale: 0, rotate: -45 }}
                                  animate={{ scale: 1, rotate: 0 }}
                                  exit={{ scale: 0, rotate: 45 }}
                                  transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                                  className="relative z-10"
                                >
                                  <motion.div
                                    animate={isActive ? (step.activeIcon === ChefHat ? { rotate: [0, -15, 15, -15, 15, 0], y: [0, -3, 3, -3, 3, 0] } : (step.activeIcon === Check ? { scale: [1, 1.3, 1] } : { rotate: [0, -15, 15, -15, 15, 0] })) : {}}
                                    transition={{
                                      duration: step.activeIcon === ChefHat ? 1.5 : 0.6,
                                      repeat: step.activeIcon === ChefHat ? Infinity : 0,
                                      ease: "easeInOut"
                                    }}
                                  >
                                    <CurrentIcon className={`w-8 h-8 transition-colors duration-300 relative z-10 ${isActive ? (step.activeBg ? 'text-white' : 'text-brand-primary') : 'text-white group-hover:text-brand-primary'}`} />
                                  </motion.div>
                                </motion.div>
                              </AnimatePresence>
                            </motion.div>
                            <h3 className="text-lg font-bold mb-3 transition-colors cursor-default text-white">{step.title}</h3>
                            <p className="text-sm text-white/80 leading-relaxed max-w-[200px] cursor-default">{step.desc}</p>
                            {idx < 3 && (
                              <div
                                aria-hidden="true"
                                data-flow-connector="mobile"
                                className="md:hidden absolute left-1/2 top-full h-8 w-1 -translate-x-1/2 overflow-hidden rounded-full bg-white/20"
                              >
                                <motion.div
                                  animate={{ height: activeStep > idx ? '100%' : '0%' }}
                                  transition={{ duration: 0.8, ease: 'easeInOut' }}
                                  className="absolute left-0 top-0 w-full rounded-full bg-white"
                                />
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>

          {/* Categories Section */}
          <section id="kategori-pilihan" className="scroll-mt-24 px-4 container mx-auto mb-16 pt-8">
            {!categoryFilter && (
              <div>
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  className="mb-8 flex flex-col md:flex-row justify-center items-center relative gap-4"
                >
                  <div className="text-center w-full">
                    <div className="flex items-center justify-center gap-4 mb-2">
                      <div className="h-1 w-12 sm:w-16 bg-brand-primary/80 rounded-full"></div>
                      <h2 className="text-h2 tracking-tight mb-0 text-text-primary">Kategori Pilihan</h2>
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
                      <span className="font-bold text-sm sm:text-base text-center text-text-primary">{category.name}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <motion.div
            id="rekomendasi"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8 pt-4 lg:pt-0 mt-4 scroll-mt-24"
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
                  <span className={`absolute -top-2 left-3 px-1.5 text-[10px] sm:text-[11px] font-medium bg-surface transition-colors duration-300 z-10 ${isCategoryDropdownOpen ? 'text-brand-primary' : 'text-text-secondary group-hover:text-brand-primary/80'}`}>
                    Kategori Makanan
                  </span>
                  <span className="text-[13px] sm:text-sm font-semibold text-text-primary truncate text-left w-full">
                    {localCategoryFilter || 'Semua'}
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
                    className="absolute left-0 mt-3 w-48 bg-surface border border-border rounded-xl shadow-xl overflow-hidden z-50 ring-1 ring-black/5"
                  >
                    <div className="p-2 flex flex-col gap-1">
                      {['Semua Makanan', 'Makanan Manis', 'Makanan Pedas', 'Makanan Gurih'].map(cat => (
                        <button
                          key={cat}
                          onClick={() => { setLocalCategoryFilter(cat === 'Semua Makanan' ? null : (localCategoryFilter === cat ? null : cat)); setIsCategoryDropdownOpen(false); }}
                          className={`flex items-center px-3 py-2.5 w-full text-left rounded-lg transition-colors text-sm font-medium relative ${((cat === 'Semua Makanan' && !localCategoryFilter) || localCategoryFilter === cat)
                            ? 'bg-brand-primary/5 text-brand-primary'
                            : 'hover:bg-brand-primary/5 hover:text-brand-primary text-text-primary'
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
                  <span className={`absolute -top-2 left-3 px-1.5 text-[10px] sm:text-[11px] font-medium bg-surface transition-colors duration-300 z-10 ${isPriceFilterOpen ? 'text-brand-primary' : 'text-text-secondary group-hover:text-brand-primary/80'}`}>
                    Urutkan Harga
                  </span>
                  <span className="text-[13px] sm:text-sm font-semibold text-text-primary truncate text-left w-full">
                    {priceSortOrder === 'asc' ? 'Termurah' : (priceSortOrder === 'desc' ? 'Termahal' : 'Semua')}
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
                    className="absolute right-0 sm:left-0 sm:right-auto mt-3 w-48 sm:w-56 bg-surface border border-border rounded-xl shadow-xl overflow-hidden z-50 ring-1 ring-black/5"
                  >
                    <div className="p-2 flex flex-col gap-1">
                      <button
                        onClick={() => { setPriceSortOrder('asc'); setIsPriceFilterOpen(false); }}
                        className={`flex items-center px-3 py-2.5 w-full text-left rounded-lg transition-colors text-sm font-medium relative ${priceSortOrder === 'asc' ? 'bg-brand-primary/5 text-brand-primary' : 'hover:bg-brand-primary/5 hover:text-brand-primary text-text-primary'}`}
                      >
                        Dari Termurah
                        {priceSortOrder === 'asc' && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/4 bg-brand-primary rounded-r-full" />}
                      </button>
                      <button
                        onClick={() => { setPriceSortOrder('desc'); setIsPriceFilterOpen(false); }}
                        className={`flex items-center px-3 py-2.5 w-full text-left rounded-lg transition-colors text-sm font-medium relative ${priceSortOrder === 'desc' ? 'bg-brand-primary/5 text-brand-primary' : 'hover:bg-brand-primary/5 hover:text-brand-primary text-text-primary'}`}
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
                              <span className="text-[10px] sm:text-[11px] font-bold text-text-primary leading-none pb-[1px]">{(product.averageRating ?? 0) > 0 ? product.averageRating!.toFixed(1) : 'Baru'}</span>
                            </div>
                          </div>

                          {/* Right Content Area */}
                          <div className="flex flex-col flex-1 min-w-0 pt-0.5">
                            {/* Title */}
                            <h3 className="text-[13px] sm:text-sm font-bold text-text-primary leading-snug line-clamp-2 mb-1 group-hover:text-brand-primary transition-colors">
                              {product.name}
                            </h3>

                            {/* Subtitle / Tags */}
                            <p className="text-[11px] text-text-secondary truncate mb-1.5 line-clamp-1">
                              {product.sellerName || 'Toko'} • {(product as any).category || 'Makanan'}
                            </p>

                            <div className="mb-auto"></div>
                            {/* Location / Meta Info */}
                            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-text-secondary font-medium mb-1 w-full overflow-hidden">
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
                                  addCartItem({
                                    productId: product.id,
                                    name: product.name,
                                    price: product.price,
                                    sellerId: product.sellerId || '',
                                    sellerName: product.sellerName || product.storeName || 'Toko UMKM',
                                    imageUrl: product.imageUrl || '',
                                    minQty: product.minOrderQty || product.minQty || 1
                                  });

                                  // Optional sweet alert feedback
                                  Swal.fire({
                                    icon: 'success',
                                    title: 'Berhasil dimasukkan',
                                    text: `${product.name} dimasukkan ke pesanan`,
                                    timer: 1200,
                                    showConfirmButton: false,
                                    toast: true,
                                    position: 'top-end'
                                  });
                                }}
                                className="w-full flex items-center justify-center gap-1 bg-brand-primary text-white py-1.5 rounded-lg text-[10px] sm:text-xs font-bold hover:bg-brand-primary-hover transition-colors relative z-20 group/btn shadow-md"
                              >
                                <ShoppingBag className="w-3 h-3 group-hover/btn:scale-110 transition-transform shrink-0" />
                                <span className="truncate">Tambah Pesanan</span>
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
              <div className="flex items-baseline relative inline-block">
                <span className="text-h2 text-white font-extrabold tracking-tight">
                  pesanku
                </span>
                <span className="text-h2 font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-[#FCDC2A] to-rose-200 ml-1.5 drop-shadow-sm">
                  nusantara
                </span>
              </div>
            </motion.div>
          </div>
          <p className="text-body-base text-white/90 mb-8 max-w-md mx-auto">
            Platform preorder makanan dan minuman dari UMKM lokal terpercaya. Pesan langsung dari ahlinya.
          </p>

          {/* Payment Methods */}
          <div className="flex flex-col items-center mb-8">
            <p className="text-white/70 text-xs uppercase tracking-widest mb-3 font-bold">Metode Pembayaran</p>
            <div className="flex flex-col gap-2.5 items-center max-w-lg">
              {/* Row 1: Banks */}
              <div className="flex flex-wrap justify-center gap-2.5">
                <div className="px-3 py-1 bg-white text-blue-900 font-black italic rounded-md text-xs shadow-sm flex items-center justify-center min-w-[50px]">BCA</div>
                <div className="px-3 py-1 bg-white text-orange-500 font-black italic rounded-md text-xs shadow-sm flex items-center justify-center min-w-[50px]">BNI</div>
                <div className="px-3 py-1 bg-white text-yellow-500 font-black italic rounded-md text-xs shadow-sm flex items-center justify-center min-w-[50px]">Mandiri</div>
                <div className="px-3 py-1 bg-white text-blue-600 font-black italic rounded-md text-xs shadow-sm flex items-center justify-center min-w-[50px]">BRI</div>
                <div className="px-3 py-1 bg-white text-teal-600 font-black italic rounded-md text-xs shadow-sm flex items-center justify-center min-w-[50px]">BSI</div>
              </div>
              {/* Row 2: E-Wallets & QRIS */}
              <div className="flex flex-wrap justify-center gap-2.5">
                <div className="px-3 py-1 bg-white text-purple-600 font-bold italic rounded-md text-xs shadow-sm flex items-center justify-center min-w-[50px]">OVO</div>
                <div className="px-3 py-1 bg-white text-blue-500 font-bold italic rounded-md text-xs shadow-sm flex items-center justify-center min-w-[50px]">DANA</div>
                <div className="px-3 py-1 bg-white text-orange-600 font-bold italic rounded-md text-xs shadow-sm flex items-center justify-center min-w-[50px]">ShopeePay</div>
                <div className="px-3 py-1 bg-[#ED2C39] text-white font-bold italic rounded-md text-xs shadow-sm flex items-center justify-center min-w-[50px] border border-white/20">QRIS</div>
              </div>
            </div>
          </div>

          {/* Navigasi Legalitas */}
          <div className="flex flex-wrap justify-center gap-4 md:gap-6 text-sm text-white/90 font-medium mb-8">
            <Link href="/faq" className="hover:text-white hover:underline transition-all">FAQ</Link>
            <span className="text-white/40 hidden sm:inline">•</span>
            <Link href="/refund-policy" className="hover:text-white hover:underline transition-all">Refund Policy</Link>
            <span className="text-white/40 hidden sm:inline">•</span>
            <Link href="/terms" className="hover:text-white hover:underline transition-all">Syarat & Ketentuan</Link>
            <span className="text-white/40 hidden sm:inline">•</span>
            <Link href="/kontak" className="hover:text-white hover:underline transition-all">Kontak</Link>
          </div>

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
        <div className="flex flex-1 justify-around">
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

        

        <div className="flex flex-1 justify-around">
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
      <CartSidebar />
    </>
  );
}
