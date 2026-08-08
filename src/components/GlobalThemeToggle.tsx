"use client";
import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function GlobalThemeToggle() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setMounted(true);
      if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        setIsDarkMode(true);
        document.documentElement.classList.add('dark');
      } else {
        setIsDarkMode(false);
        document.documentElement.classList.remove('dark');
      }
    }, 0);
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

  if (!mounted) return null;

  return (
    <button 
      onClick={toggleDarkMode}
      className={`fixed z-[99] p-3 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.15)] transition-transform hover:scale-110 flex items-center justify-center 
        ${isDarkMode ? 'bg-slate-800 border border-slate-700 shadow-brand-secondary/20' : 'bg-white border border-gray-100 shadow-brand-primary/20'}
        bottom-28 left-4 md:bottom-8 md:left-8`}
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
            <Moon className="w-6 h-6 text-brand-secondary" />
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
            <Sun className="w-6 h-6 text-brand-primary stroke-[2px]" />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Invisible spacer to maintain button size */}
      <div className="w-6 h-6 opacity-0"></div>
    </button>
  );
}
