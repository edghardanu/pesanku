"use client";

import { useState, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag } from "lucide-react";

import { Suspense } from "react";

function LoaderContent() {
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Show loader on mount (first load)
    let active = true;
    setTimeout(() => {
      if (active) setIsLoading(true);
    }, 0);
    const timer = setTimeout(() => {
      if (active) setIsLoading(false);
    }, 1000);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []); // Only run once on full page load

  useEffect(() => {
    // Show loader on route change
    let active = true;
    setTimeout(() => {
      if (active) setIsLoading(true);
    }, 0);
    const timer = setTimeout(() => {
      if (active) setIsLoading(false);
    }, 500); // Shorter for route changes
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [pathname, searchParams]);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div 
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] bg-base flex flex-col items-center justify-center pointer-events-none"
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
  );
}

export default function GlobalLoader() {
  return (
    <Suspense fallback={null}>
      <LoaderContent />
    </Suspense>
  );
}
