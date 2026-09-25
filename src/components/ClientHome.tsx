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
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import CartSidebar from "@/components/CartSidebar";
import Logo from "@/components/ui/Logo";
import { useCart } from "@/lib/cart";
import MobileBottomNav from "@/components/MobileBottomNav";
import { CustomBagIcon } from "@/components/ui/CustomBagIcon";
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

export default function ClientHome({
  initialProducts,
  user,
  categoryFilter,
  isFavoritesPage = false,
}: {
  initialProducts: ProductItem[];
  user?: AuthUser | null;
  categoryFilter?: string;
  isFavoritesPage?: boolean;
}) {
  const router = useRouter();
  const { addItem: addCartItem, totalItems, setIsOpen: setIsCartOpen } = useCart();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

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

  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem('pesanku_favorites');
      if (stored) {
        setFavorites(new Set(JSON.parse(stored)));
      }
    } catch (e) { }
  }, []);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem('pesanku_favorites', JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const [visibleMobileItems, setVisibleMobileItems] = useState(12);
  const [isDesktop, setIsDesktop] = useState(false);




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





  const filteredProducts = useMemo(() => {
    return initialProducts.filter(product => {
      if (isFavoritesPage) {
        if (!favorites.has(product.id.toString())) return false;
      }

      if (categoryFilter) {
        if (product.batchCategory !== categoryFilter) return false;
      }

      const productName = product.name || '';
      const sellerName = product.sellerName || '';
      const query = debouncedSearchQuery || '';

      return productName.toLowerCase().includes(query.toLowerCase()) ||
        sellerName.toLowerCase().includes(query.toLowerCase());
    });
  }, [initialProducts, categoryFilter, debouncedSearchQuery, isFavoritesPage, favorites]);

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
                <Logo className="w-32 md:w-36 lg:w-[150px] xl:w-[180px]" priority={true} />
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
              <Link
                href="/favorites"
                className={`p-2 rounded-full transition-colors relative flex items-center justify-center w-10 h-10 border border-border hover:bg-gray-100 dark:hover:bg-border text-text-primary group`}
                title="Favorit"
                aria-label="Wishlist Favorit"
              >
                <Heart className={`w-5 h-5 transition-colors ${favorites.size > 0 ? 'text-[#ff4b4b] fill-[#ff4b4b]' : 'group-hover:text-[#ff4b4b] group-hover:fill-[#ff4b4b]/20'}`} />
                {favorites.size > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#ff4b4b] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-sm">
                    {favorites.size}
                  </span>
                )}
              </Link>
              <button
                onClick={() => setIsCartOpen(true)}
                className={`p-2 rounded-full transition-colors relative flex items-center justify-center w-10 h-10 border border-border hover:bg-gray-100 dark:hover:bg-border text-text-primary group`}
                aria-label="Keranjang Belanja"
              >
                <ShoppingBag className="w-5 h-5 group-hover:text-brand-primary" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-sm">
                    {totalItems}
                  </span>
                )}
              </button>

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

      <main className="flex-1 bg-white dark:bg-base overflow-x-hidden pt-[110px] sm:pt-[130px] lg:pt-[140px]">
        {/* Full-width Unified Search Bar */}
        <div className="w-full mb-0 px-4 sm:px-6 lg:px-8">
          <div className="relative w-full max-w-4xl mx-auto">
            <input
              id="global-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              placeholder="Cari menu..."
              className="w-full pl-12 pr-12 py-3.5 bg-white dark:bg-surface text-text-primary rounded-2xl shadow-sm border border-border focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 text-base outline-none transition-all duration-300"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />

            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-border/50 transition-colors"
                aria-label="Clear search"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            {searchQuery && isSearchFocused && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-surface border border-border rounded-xl shadow-xl overflow-hidden z-[100] max-h-72 overflow-y-auto">
                {filteredProducts.length > 0 ? (
                  filteredProducts.slice(0, 8).map(product => (
                    <button
                      key={product.id}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setSearchQuery(product.name);
                        setIsSearchFocused(false);
                        router.push(product.sellerId ? `/store/${encodeURIComponent((product.sellerName || 'toko').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))}-${product.sellerId}?view=katalog` : `/product/${encodeURIComponent((product.name || 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))}-${product.id}`);
                      }}
                      className="w-full text-left px-5 py-3 hover:bg-brand-primary/5 border-b border-border last:border-b-0 flex items-center gap-4 transition-colors text-text-primary group"
                    >
                      {product.imageUrl ? (
                        <div className="w-12 h-12 rounded-lg bg-base overflow-hidden shrink-0 shadow-sm">
                          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-base flex items-center justify-center shrink-0 shadow-sm">
                          <ShoppingBag className="w-6 h-6 text-text-secondary" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-text-primary truncate">{product.name}</p>
                        <p className="text-sm text-text-secondary truncate mt-0.5">Rp {product.price?.toLocaleString('id-ID')} • {(product.sellerName || 'Toko').toUpperCase()}</p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-5 py-6 text-center text-text-secondary">
                    Pencarian tidak ditemukan
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Hero Section */}
        {!categoryFilter && !isFavoritesPage && (
          <section className="relative flex min-h-[440px] md:min-h-[500px] items-center justify-center px-6 pt-6 pb-16 sm:px-8 sm:pt-8 sm:pb-20 bg-transparent">

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
                      Pre Order
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
                  <div className="relative w-full max-w-[350px] sm:max-w-[480px] md:max-w-lg lg:max-w-2xl">
                    <DotLottieReact
                      src="/food%20delivery%20driver.lottie"
                      loop
                      autoplay
                      className="w-full h-auto scale-[1.25] sm:scale-[1.35] md:scale-[1.35] object-contain drop-shadow-[0_15px_35px_rgba(128,0,0,0.2)] hover:scale-[1.40] transition-transform duration-700 ease-out relative z-10"
                    />
                  </div>
                </motion.div>

              </div>
            </div>
          </section>
        )}

        {/* Katalog Section */}
        <section id="katalog" className={`scroll-mt-24 px-4 container mx-auto ${categoryFilter ? 'py-16' : 'pb-16 pt-8'}`}>





          {/* Alur Pemesanan Section */}
          {!categoryFilter && !isFavoritesPage && (
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
          )}

          {/* Categories Section */}
          <section id="kategori-pilihan" className="scroll-mt-24 px-4 container mx-auto mb-16 pt-8">
            {!categoryFilter && !isFavoritesPage && (
              <div>
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  className="mb-8 flex flex-col md:flex-row justify-center items-center relative gap-4"
                >
                  <div className="text-center w-full">
                    <div className="flex items-center justify-center mb-1 sm:mb-2">
                      <h2 className="text-h2 tracking-tight mb-0 pb-4 text-text-primary relative inline-block">
                        Kategori Pilihan
                        <div className="absolute bottom-0 left-[20%] right-[20%] h-1.5 sm:h-2 bg-brand-primary/80 rounded-full"></div>
                      </h2>
                    </div>
                    <p className="text-body-base text-text-secondary mt-3">Eksplorasi ragam menu sesuai selera Anda.</p>
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
            {isFavoritesPage ? (
              <div className="text-center sm:text-left w-full sm:w-auto mt-4 sm:mt-0 mb-4 sm:mb-0">
                <div className="inline-block relative">
                  <h2 className="text-h2 tracking-tight mb-0 pb-3 text-text-primary relative z-10">Menu Favorit</h2>
                  <div className="absolute bottom-1 left-0 right-0 h-1.5 sm:h-2 bg-[#ff4b4b] rounded-full z-0"></div>
                </div>
                <p className="text-body-base text-text-secondary mt-1">Daftar hidangan terpilih yang Anda sukai.</p>
              </div>
            ) : (
              <div>
                <h2 className="text-h2 mb-2 tracking-tight">{categoryFilter ? `Kategori: ${categoryFilter}` : 'Rekomendasi Untuk Kamu'}</h2>
                <p className="text-body-base text-text-secondary">
                  {searchQuery ? `Hasil pencarian untuk "${searchQuery}"` : (categoryFilter ? `Produk pilihan di kategori ${categoryFilter}.` : "Temukan pilihan produk UMKM yang mungkin kamu sukai.")}
                </p>
              </div>
            )}

            {/* Action Buttons Container */}
            <div className="flex items-center gap-3 relative z-40">

              {/* Category Filter Dropdown */}
              <div className="relative">
                <button
                  onClick={() => { setIsCategoryDropdownOpen(!isCategoryDropdownOpen); setIsPriceFilterOpen(false); }}
                  className={`relative flex items-center justify-between w-36 sm:w-44 bg-surface border px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl transition-all duration-300 group hover:border-brand-primary/60 outline-none focus:border-brand-primary ${isCategoryDropdownOpen ? 'border-brand-primary shadow-sm' : 'border-border'}`}
                >
                  <span className={`absolute -top-2 left-3 px-1.5 text-[10px] sm:text-[11px] font-medium bg-surface transition-colors duration-300 z-10 ${isCategoryDropdownOpen ? 'text-brand-primary' : 'text-text-secondary group-hover:text-brand-primary/80'}`}>
                    Kategori Makanan
                  </span>
                  <span className="text-[13px] sm:text-sm font-semibold text-text-primary truncate text-left w-full">
                    {localCategoryFilter || 'Semua'}
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 shrink-0 transition-transform duration-300 ml-1 ${isCategoryDropdownOpen ? 'rotate-180 text-brand-primary' : 'text-text-secondary'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                  className={`relative flex items-center justify-between w-36 sm:w-44 bg-surface border px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl transition-all duration-300 group hover:border-brand-primary/60 outline-none focus:border-brand-primary ${isPriceFilterOpen ? 'border-brand-primary shadow-sm' : 'border-border'}`}
                >
                  <span className={`absolute -top-2 left-3 px-1.5 text-[10px] sm:text-[11px] font-medium bg-surface transition-colors duration-300 z-10 ${isPriceFilterOpen ? 'text-brand-primary' : 'text-text-secondary group-hover:text-brand-primary/80'}`}>
                    Urutkan Harga
                  </span>
                  <span className="text-[13px] sm:text-sm font-semibold text-text-primary truncate text-left w-full">
                    {priceSortOrder === 'asc' ? 'Termurah' : (priceSortOrder === 'desc' ? 'Termahal' : 'Semua')}
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 shrink-0 transition-transform duration-300 ml-1 ${isPriceFilterOpen ? 'rotate-180 text-brand-primary' : 'text-text-secondary'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                            <div className="flex justify-between items-start gap-1">
                              {/* Title */}
                              <h3 className="text-[13px] sm:text-sm font-bold text-text-primary leading-snug line-clamp-2 mb-1 group-hover:text-brand-primary transition-colors flex-1">
                                {product.name}
                              </h3>
                              {/* Favorite Heart Button (Top Right Card) */}
                              <button
                                onClick={(e) => toggleFavorite(product.id.toString(), e)}
                                className="p-1 sm:p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-border transition-colors shrink-0 group/fav mt-[-4px] sm:mt-[-2px] -mr-1 sm:-mr-2 flex items-center justify-center"
                                aria-label="Tandai Favorit"
                              >
                                <Heart className={`w-4 h-4 sm:w-4 sm:h-4 transition-colors ${favorites.has(product.id.toString()) ? 'text-[#ff4b4b] fill-[#ff4b4b]' : 'text-gray-300 group-hover/fav:text-[#ff4b4b] group-hover/fav:fill-[#ff4b4b]/10'}`} />
                              </button>
                            </div>

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
                              {!isFavoritesPage ? (
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
                                  <CustomBagIcon className="w-3 h-3 group-hover/btn:scale-110 transition-transform shrink-0" />
                                  <span className="truncate">Tambah Pesanan</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleInternalPresalesChat(
                                      product.storeName || 'Toko UMKM',
                                      product.id,
                                      product.name || 'Produk',
                                      product.sellerId || '',
                                      product.sellerAvatar || null,
                                      product.price,
                                      product.imageUrl || ''
                                    );
                                  }}
                                  className="w-full flex items-center justify-center gap-1 border border-brand-primary/40 text-brand-primary hover:bg-brand-primary/10 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-colors relative z-20 group/btn"
                                >
                                  <MessageCircle className="w-3 h-3 group-hover/btn:scale-110 transition-transform shrink-0" />
                                  <span className="truncate">Berikan Penawaran</span>
                                </button>
                              )}
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
              <Image
                src="/pesanku-white.png"
                alt="Pesanku"
                width={220}
                height={52}
                quality={100}
                priority={true}
                className="object-contain drop-shadow-sm"
              />
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

      <MobileBottomNav user={user || null} orderCount={orderCount} />
      <HelpWidget />
      <CartSidebar />
    </>
  );
}
