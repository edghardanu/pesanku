// ============================================================
//  src/hooks/useDarkMode.ts
//  Custom hook untuk manajemen Dark Mode
// ============================================================
'use client';

import { useState, useEffect } from 'react';

interface UseDarkModeReturn {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

/**
 * Hook untuk membaca dan mengubah dark mode.
 * Menyinkronkan state React dengan localStorage dan kelas CSS di <html>.
 */
export function useDarkMode(): UseDarkModeReturn {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Baca preferensi dari localStorage atau system preference
    const timer = window.setTimeout(() => {
      const prefersDark =
        localStorage.theme === 'dark' ||
        (!('theme' in localStorage) &&
          window.matchMedia('(prefers-color-scheme: dark)').matches);

      setIsDarkMode(prefersDark);
      document.documentElement.classList.toggle('dark', prefersDark);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle('dark', next);
      localStorage.theme = next ? 'dark' : 'light';
      return next;
    });
  };

  return { isDarkMode, toggleDarkMode };
}
