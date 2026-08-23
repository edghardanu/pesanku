"use client";

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  PackageCheck,
  Pencil,
  Plus,
  RefreshCw,
  Truck,
  UserRound,
  Phone,
  StickyNote,
  Wallet,
} from 'lucide-react';
import Swal from 'sweetalert2';

import { OrderItem } from '@/types';

type ProductOption = { id: string; name: string };
type FulfillmentStatus = NonNullable<OrderItem['fulfillmentStatus']>;

const fulfillmentOptions: Array<{ value: FulfillmentStatus; label: string }> = [
  { value: 'scheduled', label: 'Terjadwal' },
  { value: 'preparing', label: 'Sedang Disiapkan' },
  { value: 'ready', label: 'Siap Dikirim' },
  { value: 'shipped', label: 'Dalam Pengiriman' },
  { value: 'delivered', label: 'Terkirim' },
];

const fulfillmentStyles: Record<FulfillmentStatus, { label: string; badge: string; dot: string }> = {
  scheduled: { label: 'Terjadwal', badge: 'bg-blue-500/10 text-blue-700 dark:text-blue-300', dot: 'bg-blue-500' },
  preparing: { label: 'Disiapkan', badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
  ready: { label: 'Siap Dikirim', badge: 'bg-violet-500/10 text-violet-700 dark:text-violet-300', dot: 'bg-violet-500' },
  shipped: { label: 'Dikirim', badge: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300', dot: 'bg-cyan-500' },
  delivered: { label: 'Terkirim', badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
};

const dayNames = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const fromDateKey = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const formatLongDate = (dateKey: string) => fromDateKey(dateKey).toLocaleDateString('id-ID', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Asia/Jakarta',
});

const buildCalendarDays = (year: number, month: number) => {
  const firstDay = new Date(year, month, 1);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - mondayOffset);
  return Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));
};

export default function SellerPreorderCalendar({
  orders,
  products,
  productIdFilter,
  onOrderStatusChange,
}: {
  orders: OrderItem[];
  products: ProductOption[];
  productIdFilter?: string;
  onOrderStatusChange?: (orderId: string, status: string, cancelReason?: string) => void;
}) {
  const router = useRouter();
  const todayKey = toDateKey(new Date());
  const [localOrders, setLocalOrders] = useState(orders);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [productFilter, setProductFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setLocalOrders(orders);
  }, [orders]);

  useEffect(() => {
    if (productIdFilter) {
      setProductFilter(productIdFilter);
    }
  }, [productIdFilter]);

  const filteredOrders = useMemo(() => localOrders.filter((order) => (
    productFilter === 'all' || order.productId === productFilter
  )), [localOrders, productFilter]);

  const calendarDays = useMemo(
    () => buildCalendarDays(visibleMonth.getFullYear(), visibleMonth.getMonth()),
    [visibleMonth],
  );

  const hasSellerSchedule = (order: OrderItem) => Boolean(order.deliveryDate && order.fulfillmentStatus);
  const scheduledOrders = filteredOrders.filter(hasSellerSchedule);
  const unscheduledOrders = filteredOrders.filter((order) => (
    !hasSellerSchedule(order) && !['cancelled', 'failed', 'completed'].includes(order.status || '')
  ));

  const selectedDayOrders = scheduledOrders.filter((order) => order.deliveryDate === selectedDate);

  const monthPrefix = `${visibleMonth.getFullYear()}-${String(visibleMonth.getMonth() + 1).padStart(2, '0')}`;
  const monthOrders = scheduledOrders.filter((order) => order.deliveryDate?.startsWith(monthPrefix));
  const shippedSelected = scheduledOrders.filter((order) => {
    const isShippedFulfillment = ['ready', 'shipped', 'delivered'].includes(order.fulfillmentStatus || '');
    const isShippedStatus = ['processing', 'completed'].includes(order.status || '');
    const isSelected = order.deliveryDate === selectedDate;
    return isSelected && (isShippedFulfillment || isShippedStatus);
  }).length;

  const totalShipped = filteredOrders.filter((order) => (
    order.status === 'processing' || order.fulfillmentStatus === 'shipped'
  )).reduce((sum, order) => sum + (order.qty || 1), 0);

  const totalDelivered = filteredOrders.filter((order) => (
    order.status === 'completed' || order.fulfillmentStatus === 'delivered'
  )).reduce((sum, order) => sum + (order.qty || 1), 0);

  const goToMonth = (delta: number) => {
    const next = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + delta, 1);
    setVisibleMonth(next);
    setSelectedDate(toDateKey(next));
  };

  const goToToday = () => {
    const today = new Date();
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(todayKey);
  };

  const refreshOrders = () => {
    setIsRefreshing(true);
    router.refresh();
    window.setTimeout(() => setIsRefreshing(false), 900);
  };

  const saveSchedule = async (order: OrderItem, preferredDate = order.requestedDeliveryDate || selectedDate) => {
    const currentStatus = order.fulfillmentStatus || 'scheduled';
    const optionHtml = fulfillmentOptions.map((option) => (
      `<option value="${option.value}" ${currentStatus === option.value ? 'selected' : ''}>${option.label}</option>`
    )).join('');

    const result = await Swal.fire({
      title: order.deliveryDate ? 'Ubah Jadwal Pengiriman' : 'Jadwalkan Pengiriman',
      html: `
        <div class="text-left space-y-4 pt-2">
          <div class="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <p class="font-semibold text-gray-900">${escapeHtml(order.productName || 'Produk')}</p>
            <p class="mt-1 text-sm text-gray-500">${escapeHtml(order.buyerName || 'Pembeli')} · ${order.qty} porsi</p>
            ${order.requestedDeliveryDate ? `<p class="mt-1 text-sm font-semibold text-brand-primary">Tanggal yang diminta pembeli: ${escapeHtml(formatLongDate(order.requestedDeliveryDate))}</p>` : ''}
            ${order.selectedVariant ? `<p class="mt-1 text-sm font-semibold text-brand-primary">Varian: ${escapeHtml(order.selectedVariant)}${order.selectedVariantPrice !== null && order.selectedVariantPrice !== undefined ? ` · Rp ${order.selectedVariantPrice.toLocaleString('id-ID')}` : ''}</p>` : ''}
          </div>
          <div>
            <label for="schedule-date" class="mb-1.5 block text-sm font-semibold text-gray-700">Tanggal pengiriman</label>
            <input id="schedule-date" type="date" value="${order.deliveryDate || preferredDate}" class="swal2-input m-0 w-full" />
          </div>
          <div>
            <label for="schedule-status" class="mb-1.5 block text-sm font-semibold text-gray-700">Status penanganan</label>
            <select id="schedule-status" class="swal2-select m-0 w-full">${optionHtml}</select>
          </div>
          <div>
            <label for="schedule-reason" class="mb-1.5 block text-sm font-semibold text-gray-700">Alasan/Catatan jadwal <span class="font-normal text-gray-400">(opsional)</span></label>
            <textarea id="schedule-reason" maxlength="500" rows="3" class="w-full resize-y rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary" placeholder="Contoh: Jadwal disesuaikan dengan kesiapan produksi">${escapeHtml(order.scheduleReason || '')}</textarea>
          </div>
        </div>
      `,
      showCancelButton: true,
      showDenyButton: Boolean(order.deliveryDate),
      confirmButtonText: 'Simpan Jadwal',
      cancelButtonText: 'Batal',
      denyButtonText: 'Batalkan Jadwal',
      confirmButtonColor: '#800000',
      denyButtonColor: '#ef4444',
      preConfirm: () => {
        const deliveryDate = (document.getElementById('schedule-date') as HTMLInputElement)?.value;
        const fulfillmentStatus = (document.getElementById('schedule-status') as HTMLSelectElement)?.value as FulfillmentStatus;
        const scheduleReason = (document.getElementById('schedule-reason') as HTMLTextAreaElement)?.value.trim() || null;
        if (!deliveryDate) {
          Swal.showValidationMessage('Tanggal pengiriman wajib dipilih.');
          return false;
        }
        return { deliveryDate, fulfillmentStatus, scheduleReason };
      },
    });

    if (result.isDenied) {
      const response = await fetch(`/api/seller/preorder-schedule?orderId=${encodeURIComponent(order.id)}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) {
        await Swal.fire('Gagal', data.error || 'Jadwal tidak dapat dihapus.', 'error');
        return;
      }
      setLocalOrders((current) => current.map((item) => item.id === order.id
        ? { ...item, deliveryDate: null, fulfillmentStatus: null, scheduleReason: null, scheduleUpdatedAt: null }
        : item));
      router.refresh();
      await Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Jadwal dihapus', showConfirmButton: false, timer: 2500 });
      return;
    }

    if (!result.isConfirmed || !result.value) return;

    const response = await fetch('/api/seller/preorder-schedule', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: order.id, ...result.value }),
    });
    const data = await response.json();
    if (!response.ok) {
      await Swal.fire('Gagal', data.error || 'Jadwal tidak dapat disimpan.', 'error');
      return;
    }

    setLocalOrders((current) => current.map((item) => item.id === order.id
      ? {
        ...item,
        deliveryDate: data.schedule.deliveryDate,
        fulfillmentStatus: data.schedule.fulfillmentStatus,
        scheduleReason: data.schedule.scheduleReason,
        scheduleUpdatedAt: data.schedule.updatedAt,
      }
      : item));
    setSelectedDate(data.schedule.deliveryDate);
    const scheduledDate = fromDateKey(data.schedule.deliveryDate);
    setVisibleMonth(new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), 1));
    router.refresh();
    await Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Jadwal pengiriman tersimpan', showConfirmButton: false, timer: 2500 });
  };

  const updateOrderStatus = async (orderId: string, status: string, title: string, cancelReason?: string) => {
    try {
      Swal.fire({ title: 'Memproses...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      const payload: any = { orderId, status };
      if (cancelReason) payload.cancelReason = cancelReason;

      const res = await fetch('/api/orders/update-status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengubah status pesanan');

      setLocalOrders((current) => current.map((item) => item.id === orderId ? { ...item, status, cancelReason } : item));
      if (onOrderStatusChange) onOrderStatusChange(orderId, status, cancelReason);
      Swal.fire('Berhasil', title, 'success');
    } catch (e: any) {
      Swal.fire('Gagal', e.message, 'error');
    }
  };

  const konfirmasiPesanan = async (order: OrderItem) => {
    const defaultDeliveryDate = order.deliveryDate || order.requestedDeliveryDate || selectedDate || todayKey;
    const result = await Swal.fire({
      title: 'Konfirmasi Pesanan',
      html: `
        <div class="seller-confirm-form space-y-4 pt-2 text-left">
          <div class="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <p class="font-semibold text-gray-900">${escapeHtml(order.productName || 'Produk')}</p>
            <p class="mt-1 text-sm text-gray-500">${escapeHtml(order.buyerName || 'Pembeli')} · ${order.qty} porsi</p>
            ${order.requestedDeliveryDate ? `<p class="mt-1 text-sm text-gray-500">Tanggal yang diminta pembeli: <span class="font-semibold text-brand-primary">${escapeHtml(formatLongDate(order.requestedDeliveryDate))}</span></p>` : ''}
          </div>
          <div>
            <label for="confirmation-delivery-date" class="mb-1.5 block text-sm font-semibold text-gray-700">Jadwal pengiriman</label>
            <input id="confirmation-delivery-date" type="date" value="${defaultDeliveryDate}" class="swal2-input m-0 w-full" />
            <p class="mt-2 text-xs leading-relaxed text-gray-500">Tanggal sudah terisi otomatis. Ubah hanya jika jadwal pengiriman perlu disesuaikan.</p>
          </div>
          <div>
            <label for="confirmation-schedule-reason" class="mb-1.5 block text-sm font-semibold text-gray-700">Alasan/Catatan <span class="font-normal text-gray-400">(opsional)</span></label>
            <textarea id="confirmation-schedule-reason" maxlength="500" rows="3" class="w-full resize-y rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary" placeholder="Isi jika tanggal atau jadwal perlu diberi penjelasan">${escapeHtml(order.scheduleReason || '')}</textarea>
          </div>
          <p class="text-center text-sm text-gray-600">Pesanan akan dikonfirmasi dan statusnya diteruskan ke pembeli.</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, Konfirmasi',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#10b981',
      focusConfirm: false,
      customClass: {
        popup: 'seller-confirm-popup',
        icon: 'seller-confirm-icon',
        title: 'seller-confirm-title',
        htmlContainer: 'seller-confirm-content',
        actions: 'seller-confirm-actions',
        confirmButton: 'seller-confirm-button',
        cancelButton: 'seller-confirm-button',
      },
      preConfirm: () => {
        const deliveryDate = (document.getElementById('confirmation-delivery-date') as HTMLInputElement)?.value;
        const scheduleReason = (document.getElementById('confirmation-schedule-reason') as HTMLTextAreaElement)?.value.trim() || null;
        if (!deliveryDate) {
          Swal.showValidationMessage('Tanggal pengiriman wajib dipilih.');
          return false;
        }
        return { deliveryDate, scheduleReason };
      },
    });

    if (!result.isConfirmed || !result.value) return;

    try {
      Swal.fire({ title: 'Memproses...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      const response = await fetch('/api/seller/preorder-schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          deliveryDate: result.value.deliveryDate,
          fulfillmentStatus: order.fulfillmentStatus || 'scheduled',
          scheduleReason: result.value.scheduleReason,
          confirmOrder: true,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Pesanan tidak dapat dikonfirmasi.');

      setLocalOrders((current) => current.map((item) => item.id === order.id
        ? {
          ...item,
          status: 'verified',
          deliveryDate: data.schedule.deliveryDate,
          fulfillmentStatus: data.schedule.fulfillmentStatus,
          scheduleReason: data.schedule.scheduleReason,
          scheduleUpdatedAt: data.schedule.updatedAt,
        }
        : item));
      onOrderStatusChange?.(order.id, 'verified');
      setSelectedDate(data.schedule.deliveryDate);
      const scheduledDate = fromDateKey(data.schedule.deliveryDate);
      setVisibleMonth(new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), 1));
      router.refresh();
      await Swal.fire('Berhasil', 'Pesanan berhasil dikonfirmasi dan jadwal pengiriman telah disimpan.', 'success');
    } catch (error) {
      await Swal.fire('Gagal', error instanceof Error ? error.message : 'Pesanan tidak dapat dikonfirmasi.', 'error');
    }
  };

  const batalkanPesanan = (order: OrderItem) => {
    Swal.fire({
      title: 'Perhatian!',
      html: `
        <p class="mb-4 text-gray-600">Pesanan ini akan dibatalkan secara permanen, lalu diteruskan kepada Pembeli.</p>
        <div class="text-left w-full mt-2">
          <label class="block text-sm font-semibold text-gray-700 mb-1.5">Alasan Pembatalan (Opsional)</label>
          <textarea id="cancel-reason" class="w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary placeholder:text-gray-400 min-h-[100px] resize-y" placeholder="Misal: Stok bahan baku telah habis..."></textarea>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Batalkan',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#ef4444',
      preConfirm: () => {
        return (document.getElementById('cancel-reason') as HTMLTextAreaElement)?.value || undefined;
      },
    }).then((result) => {
      if (result.isConfirmed) {
        updateOrderStatus(order.id, 'cancelled', 'Pesanan berhasil dibatalkan', result.value);
      }
    });
  };

  return (
    <section className="card mb-8 overflow-hidden border border-border" aria-labelledby="preorder-calendar-title">
      {/* Product Filter Header */}
      <div className="px-4 py-3 border-b border-border bg-base flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 id="preorder-calendar-title" className="font-bold text-sm text-text-secondary flex items-center gap-1.5">
          <CalendarDays className="w-4 h-4 text-brand-primary" />
          Jadwal & Agenda Preorder
        </h2>
        <div className="flex items-center gap-2">
          <label htmlFor="calendar-product-filter" className="text-xs font-semibold text-text-secondary whitespace-nowrap">Filter Produk:</label>
          <select
            id="calendar-product-filter"
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="text-xs font-semibold rounded-lg border border-border bg-surface px-2.5 py-1.5 outline-none cursor-pointer text-text-primary focus:border-brand-primary min-w-[160px]"
          >
            <option value="all">Semua Produk</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 border-b border-border p-4 sm:grid-cols-5 sm:p-5">
        <div className="rounded-xl border border-border bg-base p-4">
          <p className="text-[10px] sm:text-xs font-medium text-text-secondary line-clamp-1">Terjadwal Bulan Ini</p>
          <p className="mt-1 text-2xl font-bold text-text-primary">{monthOrders.length}</p>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="text-[10px] sm:text-xs font-medium text-text-secondary line-clamp-1">Belum Dijadwalkan</p>
          <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-300">{unscheduledOrders.length}</p>
        </div>
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4">
          <p className="text-[10px] sm:text-xs font-medium text-text-secondary line-clamp-1">Siap (Tgl Terpilih)</p>
          <p className="mt-1 text-2xl font-bold text-cyan-700 dark:text-cyan-300">{shippedSelected}</p>
        </div>
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">
          <p className="text-[10px] sm:text-xs font-medium text-text-secondary line-clamp-1">Total Dikirim</p>
          <p className="mt-1 text-2xl font-bold text-blue-700 dark:text-blue-300">{totalShipped}</p>
        </div>
        <div className="rounded-xl border border-status-success/30 bg-status-success/5 p-4">
          <p className="text-[10px] sm:text-xs font-medium text-text-secondary line-clamp-1">Total Sampai</p>
          <p className="mt-1 text-2xl font-bold text-status-success dark:text-emerald-400">{totalDelivered}</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-border">
        <div className="min-w-0 border-b border-border p-3 sm:p-5 lg:border-b-0 w-full lg:w-[65%] shrink-0">
          <div className="mb-4 flex items-center justify-between gap-3">
            <button onClick={() => goToMonth(-1)} className="rounded-full border border-border p-2 text-text-secondary hover:text-brand-primary" aria-label="Bulan sebelumnya"><ChevronLeft className="h-5 w-5" /></button>
            <h3 className="text-center text-base font-bold capitalize text-text-primary sm:text-lg">
              {visibleMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })}
            </h3>
            <button onClick={() => goToMonth(1)} className="rounded-full border border-border p-2 text-text-secondary hover:text-brand-primary" aria-label="Bulan berikutnya"><ChevronRight className="h-5 w-5" /></button>
          </div>

          <div className="grid grid-cols-7 overflow-hidden rounded-t-xl border border-border bg-base">
            {dayNames.map((day) => <div key={day} className="py-2 text-center text-[10px] font-bold uppercase text-text-secondary sm:text-xs">{day}</div>)}
          </div>
          <div className="grid grid-cols-7 overflow-hidden rounded-b-xl border-x border-b border-border">
            {calendarDays.map((date) => {
              const dateKey = toDateKey(date);
              const dayOrders = scheduledOrders.filter((order) => order.deliveryDate === dateKey);
              const isCurrentMonth = date.getMonth() === visibleMonth.getMonth();
              const isSelected = selectedDate === dateKey;
              const isToday = todayKey === dateKey;

              return (
                <button
                  key={dateKey}
                  onClick={() => setSelectedDate(dateKey)}
                  className={`relative min-h-20 border-b border-r border-border p-1 text-left transition-colors sm:p-2 xl:min-h-28 ${isCurrentMonth ? 'bg-surface hover:bg-brand-primary/10' : 'bg-base/50 text-text-secondary/40 hover:bg-brand-primary/5'
                    } ${isSelected ? 'z-10 ring-2 ring-inset ring-brand-primary bg-brand-primary/5' : ''}`}
                  aria-label={`${formatLongDate(dateKey)}, ${dayOrders.length} pengiriman`}
                >
                  <span
                    className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full text-xs font-semibold transition-all shadow-sm ${dayOrders.length > 0
                        ? fulfillmentStyles[dayOrders[0].fulfillmentStatus || 'scheduled'].dot + ' text-white'
                        : isToday
                          ? 'bg-brand-primary text-white'
                          : 'text-text-primary hover:bg-border/60'
                      }`}
                    title="Lihat Detail Jadwal"
                  >
                    {date.getDate()}
                  </span>
                  <div className="mt-1 space-y-1 block max-h-24 overflow-y-auto w-full">
                    {dayOrders.slice(0, 2).map((order) => {
                      const style = fulfillmentStyles[order.fulfillmentStatus || 'scheduled'];
                      return <div key={order.id} className={`rounded px-1.5 py-1 text-[10px] font-semibold break-words whitespace-normal text-left ${style.badge}`}>{order.productName}</div>;
                    })}
                    {dayOrders.length > 2 && <p className="pl-1 text-[10px] font-semibold text-text-secondary">+{dayOrders.length - 2} lainnya</p>}
                  </div>
                  {dayOrders.length > 0 && (
                    <span className="absolute bottom-1 right-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-primary px-1 text-[10px] font-bold text-white sm:hidden">{dayOrders.length}</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            {fulfillmentOptions.map((option) => (
              <span key={option.value} className="flex items-center gap-1.5 text-[11px] text-text-secondary"><span className={`h-2.5 w-2.5 rounded-full ${fulfillmentStyles[option.value].dot}`} />{option.label}</span>
            ))}
          </div>
        </div>

        <aside className="p-4 sm:p-5 w-full lg:w-[35%] shrink-0">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">Agenda Pengiriman</p>
            <h3 className="mt-1 font-bold capitalize text-text-primary">{formatLongDate(selectedDate)}</h3>
          </div>

          {selectedDayOrders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
              <Truck className="mx-auto mb-3 h-9 w-9 text-text-secondary/30" />
              <p className="text-sm font-semibold text-text-primary">Belum ada pengiriman</p>
              <p className="mt-1 text-xs text-text-secondary">Pilih pesanan belum terjadwal untuk tanggal ini.</p>
            </div>
          ) : (
            <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
              {selectedDayOrders.map((order) => {
                let statusLabel = 'Terjadwal';
                let statusBadge = 'bg-blue-500/10 text-blue-700 dark:text-blue-300';

                if (order.status === 'completed') {
                  statusLabel = 'Selesai (Barang Sudah Sampai)';
                  statusBadge = 'bg-status-success/10 text-status-success border border-status-success/20';
                } else if (order.status === 'processing') {
                  statusLabel = 'Barang sedang Dikirim';
                  statusBadge = 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20';
                } else if (order.status === 'cancelled') {
                  statusLabel = 'Dibatalkan';
                  statusBadge = 'bg-status-error/10 text-status-error border border-status-error/20';
                } else if (order.status === 'verified') {
                  statusLabel = 'Diproses (Verifikasi)';
                  statusBadge = 'bg-brand-secondary/10 text-brand-secondary border border-brand-secondary/20';
                } else if (order.status === 'waiting_verification') {
                  statusLabel = 'Menunggu Konfirmasi';
                  statusBadge = 'bg-status-warning/10 text-status-warning border border-status-warning/20';
                }

                return (
                  <div key={order.id} className="rounded-xl border border-border bg-base p-3 relative group">
                    {/* Status badge on top, full width */}
                    <div className="mb-2">
                      <span className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-bold leading-tight ${statusBadge}`}>{statusLabel}</span>
                    </div>
                    {/* Product name — full width, wraps freely */}
                    <p className="text-sm font-bold text-text-primary leading-snug">{order.productName}</p>
                    {order.selectedVariant && <p className="mt-0.5 text-xs font-semibold text-brand-primary">Varian: {order.selectedVariant}{order.selectedVariantPrice !== null && order.selectedVariantPrice !== undefined ? ` · Rp ${order.selectedVariantPrice.toLocaleString('id-ID')}` : ''}</p>}
                    <p className="mt-1 text-[10px] text-text-secondary truncate max-w-full">{order.qty} porsi · <span className="font-mono">{order.id}</span></p>
                    <div className="mt-3 space-y-1.5 text-xs text-text-secondary pt-2 border-t border-border/50">
                      <p className="flex items-center gap-2"><UserRound className="h-3.5 w-3.5 shrink-0" /><span className="font-semibold text-text-primary">{order.buyerName || 'Pembeli'}</span></p>
                      {order.buyerPhone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 shrink-0" />{order.buyerPhone}</p>}
                      {order.buyerAddress && <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span className="line-clamp-2">{order.buyerAddress}</span></p>}
                      {order.notes && (
                        <div className="flex items-start gap-2 mt-1">
                          <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-primary" />
                          <span className="italic text-brand-primary-dark line-clamp-3">{order.notes}</span>
                        </div>
                      )}
                      {order.scheduleReason && <p className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-2 text-amber-700 dark:text-amber-300"><StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>Alasan jadwal: {order.scheduleReason}</span></p>}
                      <p className="flex items-center gap-2 font-bold text-text-primary"><Wallet className="h-3.5 w-3.5 shrink-0 text-status-success" />Rp {(order.totalPrice || 0).toLocaleString('id-ID')}</p>
                    </div>
                    {order.status === 'waiting_verification' ? (
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => konfirmasiPesanan(order)} className="flex-1 rounded-lg bg-brand-primary px-3 py-2 text-xs font-bold text-white hover:bg-brand-primary-hover">Konfirmasi</button>
                        <button onClick={() => batalkanPesanan(order)} className="flex-1 rounded-lg bg-status-error px-3 py-2 text-xs font-bold text-white hover:bg-red-600">Batalkan</button>
                      </div>
                    ) : (
                      <button onClick={() => saveSchedule(order)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-border py-2 text-xs font-semibold text-text-primary hover:border-brand-primary hover:text-brand-primary"><Pencil className="h-3.5 w-3.5" />Kelola Jadwal</button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </aside>
      </div>

      <div className="border-t border-border bg-base/40 p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 font-bold text-text-primary"><Clock3 className="h-5 w-5 text-amber-500" />Pesanan Belum Dijadwalkan</h3>
            <p className="mt-1 text-xs text-text-secondary">Tentukan tanggal agar produksi dan pengiriman tidak terlewat.</p>
          </div>
          <span className="mt-2 w-fit rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-300 sm:mt-0">{unscheduledOrders.length} pesanan</span>
        </div>

        {unscheduledOrders.length === 0 ? (
          <div className="flex items-center gap-3 rounded-xl border border-status-success/20 bg-status-success/5 p-4 text-sm text-status-success">
            <PackageCheck className="h-5 w-5" /> Semua pesanan aktif sudah memiliki jadwal pengiriman.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {unscheduledOrders.map((order) => (
              <div key={order.id} className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-start md:flex-col md:items-stretch 2xl:flex-row 2xl:items-start">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-bold text-text-primary">{order.productName}</p>
                    {order.status === 'verified' && (
                      <span className="shrink-0 rounded-full border border-brand-secondary/20 bg-brand-secondary/10 px-2 py-1 text-[10px] font-bold text-brand-secondary">
                        Diproses (Verifikasi)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary">{order.qty} porsi · {order.id}</p>
                  {order.requestedDeliveryDate && <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">Diminta pembeli: {formatLongDate(order.requestedDeliveryDate)}</p>}
                  {order.selectedVariant && <p className="text-xs font-semibold text-brand-primary">Varian: {order.selectedVariant}{order.selectedVariantPrice !== null && order.selectedVariantPrice !== undefined ? ` · Rp ${order.selectedVariantPrice.toLocaleString('id-ID')}` : ''}</p>}

                  <div className="mt-2 space-y-1 text-xs text-text-secondary pt-2 border-t border-border/50">
                    <p className="flex items-center gap-1.5"><UserRound className="h-3 w-3 shrink-0" /><span className="font-semibold text-text-primary">{order.buyerName || 'Pembeli'}</span></p>
                    {order.buyerPhone && <p className="flex items-center gap-1.5"><Phone className="h-3 w-3 shrink-0" />{order.buyerPhone}</p>}
                    {order.buyerAddress && <p className="flex items-start gap-1.5"><MapPin className="mt-0.5 h-3 w-3 shrink-0" /><span className="line-clamp-1">{order.buyerAddress}</span></p>}
                    {order.notes && (
                      <div className="flex items-start gap-1.5 mt-1">
                        <StickyNote className="mt-0.5 h-3 w-3 shrink-0 text-brand-primary" />
                        <span className="italic text-brand-primary-dark line-clamp-2">{order.notes}</span>
                      </div>
                    )}
                    <p className="flex items-center gap-1.5 font-bold text-text-primary"><Wallet className="h-3.5 w-3.5 shrink-0 text-status-success" />Rp {(order.totalPrice || 0).toLocaleString('id-ID')}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  {order.status === 'waiting_verification' ? (
                    <div className="flex md:flex-col lg:flex-row gap-2">
                      <button onClick={() => konfirmasiPesanan(order)} className="flex-1 rounded-lg bg-brand-primary px-3 py-2 text-xs font-bold text-white hover:bg-brand-primary-hover">Konfirmasi</button>
                      <button onClick={() => batalkanPesanan(order)} className="flex-1 rounded-lg bg-status-error px-3 py-2 text-xs font-bold text-white hover:bg-red-600">Batalkan</button>
                    </div>
                  ) : (
                    <button onClick={() => saveSchedule(order)} className="flex items-center justify-center gap-1.5 rounded-lg bg-brand-primary px-3 py-2 text-xs font-bold text-white hover:bg-brand-primary-hover"><Plus className="h-3.5 w-3.5" />Jadwalkan</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
