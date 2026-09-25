"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, Heart, FileText, User } from "lucide-react";
import { motion } from "framer-motion";
import { useCart } from "@/lib/cart";
import { useEffect, useState, useMemo } from "react";
import { CustomBagIcon } from "@/components/ui/CustomBagIcon";

export default function MobileBottomNav({ user, orderCount = 0 }: { user: any; orderCount?: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const { setIsOpen: setIsCartOpen, totalItems } = useCart();
  const [favorites, setFavorites] = useState<Set<string>>(new Set());



  // Avoid running on server unhydrated
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const updateFavorites = () => {
      try {
        const stored = localStorage.getItem('pesanku_favorites');
        if (stored) {
          setFavorites(new Set(JSON.parse(stored)));
        } else {
          setFavorites(new Set());
        }
      } catch (e) {}
    };

    updateFavorites();
    // Listen for custom event if any
    window.addEventListener('favorites-updated', updateFavorites);
    return () => window.removeEventListener('favorites-updated', updateFavorites);
  }, []);

  // Hide on admin and seller routes or specific layouts where bottom nav isn't needed
  if (pathname?.startsWith('/admin') || pathname?.startsWith('/seller')) return null;

  // Determine active tab based on path
  const activeTabId = useMemo(() => {
    if (pathname === '/') return 'home';
    if (pathname?.startsWith('/favorites')) return 'favorites';
    if (pathname?.startsWith('/buyer/orders')) return 'orders';
    if (pathname === '/login' || pathname === '/register' || pathname === '/profile') return 'account';
    return ''; // none
  }, [pathname]);

  const [localActiveTab, setLocalActiveTab] = useState(activeTabId);

  useEffect(() => {
    setLocalActiveTab(activeTabId);
  }, [activeTabId]);

  const tabs = [
    { id: 'home', path: '/', label: 'Beranda', icon: Home },
    { id: 'favorites', path: '/favorites', label: 'Favorite', icon: Heart, badge: favorites.size > 0 ? favorites.size : null },
    { id: 'orders', path: '#', label: 'Keranjang', icon: CustomBagIcon, badge: totalItems > 0 ? totalItems : null },
    { id: 'account', path: user ? '/profile' : '/login', label: user ? 'Akun' : 'Masuk', icon: User },
  ];

  const handleTabClick = (tab: any) => {
    if (tab.id === 'orders') {
      setIsCartOpen(true);
      return; // DO NOT NAVIGATE
    }
    setLocalActiveTab(tab.id); // instant visual shift
    router.push(tab.path);
  };

  if (!mounted) return null;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-surface border-t border-border px-4 py-2 flex justify-between items-end pb-8 shadow-[0_-4px_15px_rgba(0,0,0,0.05)] text-[10px] font-medium rounded-t-2xl">
      {tabs.map((tab) => {
        const isActive = localActiveTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab)}
            className="w-1/4 flex flex-col justify-end items-center relative h-full pb-1 transition-all outline-none group"
            aria-label={tab.label}
          >
            {/* The Floating Container */}
            <div className="h-10 flex items-center justify-center relative w-full mt-1">
               {/* Background Circle & Icon Wrapper */}
               <div className={`absolute flex items-center justify-center transition-all duration-300 ${isActive ? '-top-4' : 'top-1'}`}>
                 {/* Background Circle */}
                 {isActive && (
                   <motion.div
                     layoutId="mobile-nav-indicator"
                     className="absolute w-14 h-14 bg-brand-primary rounded-full shadow-lg"
                     transition={{ type: "spring", stiffness: 350, damping: 25, mass: 1 }}
                   />
                 )}
                 
                 {/* Icon */}
                 <span className={`relative z-10 flex items-center justify-center ${isActive ? 'w-14 h-14 text-white' : 'w-8 h-8 text-text-secondary group-hover:text-brand-primary'}`}>
                    <tab.icon className={`w-6 h-6 stroke-[1.5] ${isActive ? 'w-[26px] h-[26px]' : ''} ${(isActive && tab.badge) ? 'fill-white' : ''}`} />
                    
                    {/* Badge */}
                    {tab.badge && (
                      <span className={`absolute ${isActive ? 'top-1 right-1' : '-top-1.5 -right-1.5'} bg-[#ff4b4b] text-white font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-sm border-2 ${isActive ? 'border-brand-primary text-[10px]' : 'border-white text-[9px]'}`}>
                        {tab.badge > 99 ? '99+' : tab.badge}
                      </span>
                    )}
                 </span>
               </div>
            </div>
            
            {/* Label */}
            <span className={`mt-1 transition-colors ${isActive ? 'text-brand-primary font-semibold' : 'text-text-secondary'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
