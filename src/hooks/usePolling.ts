// ============================================================
//  src/hooks/usePolling.ts
//  Generic hook untuk polling data dari API secara berkala
// ============================================================
'use client';

import { useEffect, useRef } from 'react';
import { POLLING_INTERVAL_MS } from '@/lib/constants';

interface UsePollingOptions {
  /** URL API yang di-poll */
  url: string;
  /** Callback saat data berhasil diambil */
  onSuccess: (data: unknown) => void;
  /** Callback opsional saat terjadi error */
  onError?: (error: Error) => void;
  /** Interval polling dalam ms. Default: POLLING_INTERVAL_MS (15 detik) */
  interval?: number;
  /** Apakah polling aktif */
  enabled?: boolean;
}

/**
 * Hook untuk polling data dari satu endpoint API secara berkala.
 * Otomatis membersihkan timer dan request saat komponen unmount.
 *
 * @example
 * usePolling({
 *   url: '/api/seller/orders',
 *   onSuccess: (data) => setOrders(data.orders),
 *   enabled: isLoggedIn,
 * });
 */
export function usePolling({
  url,
  onSuccess,
  onError,
  interval = POLLING_INTERVAL_MS,
  enabled = true,
}: UsePollingOptions): void {
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const poll = async () => {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const res = await fetch(`${url}?t=${Date.now()}`, {
          cache: 'no-store',
          signal: controller.signal,
        });

        if (!res.ok) return;

        const data = await res.json();
        onSuccess(data);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    };

    // Jalankan pertama kali, lalu set interval
    poll();
    const timerId = window.setInterval(poll, interval);

    return () => {
      window.clearInterval(timerId);
      abortControllerRef.current?.abort();
    };
  }, [url, interval, enabled, onSuccess, onError]);
}
