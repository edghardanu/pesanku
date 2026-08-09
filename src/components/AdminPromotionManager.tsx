"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { BadgeCheck, CalendarClock, Check, Clock3, Megaphone, Power, Sparkles, Store, X } from 'lucide-react';
import Swal from 'sweetalert2';

import { formatPromotionDeadline, formatRupiah, getPromotionCountdown } from '@/lib/promotionFormatting';
import { PromotionOfferItem, PromotionRequestItem, PromotionRequestStatus } from '@/types';

type AdminPromotionManagerProps = {
  initialOffers: PromotionOfferItem[];
  initialRequests: PromotionRequestItem[];
  onRequestReviewed?: (requestId: string, status: 'approved' | 'rejected', reviewedAt: string | Date) => void;
};

const statusStyle: Record<PromotionRequestStatus, string> = {
  pending: 'bg-status-warning/10 text-status-warning border-status-warning/20',
  approved: 'bg-status-success/10 text-status-success border-status-success/20',
  rejected: 'bg-status-error/10 text-status-error border-status-error/20',
  cancelled: 'bg-border/60 text-text-secondary border-border',
};

const statusLabel: Record<PromotionRequestStatus, string> = {
  pending: 'Menunggu tinjauan',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  cancelled: 'Dibatalkan',
};

const toLocalInputValue = (date: Date) => {
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
};

export default function AdminPromotionManager({ initialOffers, initialRequests, onRequestReviewed }: AdminPromotionManagerProps) {
  const [offers, setOffers] = useState(initialOffers);
  const [requests, setRequests] = useState(initialRequests);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [minimumDeadline, setMinimumDeadline] = useState('');
  const [now, setNow] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const initialization = window.setTimeout(() => {
      setMinimumDeadline(toLocalInputValue(new Date(Date.now() + 60_000)));
      setNow(Date.now());
    }, 0);
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      window.clearTimeout(initialization);
      window.clearInterval(interval);
    };
  }, []);

  const pendingCount = requests.filter((request) => request.status === 'pending').length;
  const activeCount = offers.filter((offer) => offer.isActive && new Date(offer.expiresAt).getTime() > now).length;
  const orderedRequests = useMemo(() => [...requests].sort((first, second) => {
    if (first.status === 'pending' && second.status !== 'pending') return -1;
    if (first.status !== 'pending' && second.status === 'pending') return 1;
    return new Date(second.requestedAt ?? 0).getTime() - new Date(first.requestedAt ?? 0).getTime();
  }), [requests]);

  const createOffer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, price: Number(price), expiresAt: new Date(expiresAt).toISOString() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal membuat paket promosi.');

      setOffers((current) => [data.offer, ...current]);
      setName('');
      setPrice('');
      setExpiresAt('');
      await Swal.fire({ icon: 'success', title: 'Promosi diterbitkan', text: 'Penawaran baru sekarang dapat dilihat penjual.', timer: 1800, showConfirmButton: false });
    } catch (error) {
      await Swal.fire('Gagal', error instanceof Error ? error.message : 'Gagal membuat paket promosi.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleOffer = async (offer: PromotionOfferItem) => {
    setBusyId(offer.id);
    try {
      const nextStatus = !offer.isActive;
      const response = await fetch('/api/admin/promotions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: offer.id, isActive: nextStatus }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal memperbarui promosi.');
      setOffers((current) => current.map((item) => item.id === offer.id ? { ...item, isActive: nextStatus } : item));
    } catch (error) {
      await Swal.fire('Gagal', error instanceof Error ? error.message : 'Gagal memperbarui promosi.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const reviewRequest = async (requestId: string, status: 'approved' | 'rejected') => {
    const confirmation = await Swal.fire({
      icon: status === 'approved' ? 'question' : 'warning',
      title: status === 'approved' ? 'Setujui promosi produk?' : 'Tolak pengajuan ini?',
      text: status === 'approved'
        ? 'Produk akan tampil paling atas dengan label Paling Populer sampai deadline.'
        : 'Penjual akan melihat bahwa pengajuannya ditolak.',
      showCancelButton: true,
      confirmButtonText: status === 'approved' ? 'Ya, setujui' : 'Ya, tolak',
      cancelButtonText: 'Batal',
      confirmButtonColor: status === 'approved' ? '#10b981' : '#ef4444',
    });
    if (!confirmation.isConfirmed) return;

    setBusyId(requestId);
    try {
      const response = await fetch('/api/admin/promotions/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal memproses pengajuan.');
      setRequests((current) => current.map((item) => item.id === requestId
        ? { ...item, status, reviewedAt: data.reviewedAt }
        : item));
      onRequestReviewed?.(requestId, status, data.reviewedAt);
      await Swal.fire({ icon: 'success', title: data.message, timer: 1600, showConfirmButton: false });
    } catch (error) {
      await Swal.fire('Gagal', error instanceof Error ? error.message : 'Gagal memproses pengajuan.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-brand-primary/20 bg-brand-primary/10 px-3 py-1 text-xs font-bold text-brand-primary">
            <Megaphone className="h-4 w-4" /> Pusat Promosi
          </div>
          <h1 className="text-h1 mb-1">Promosi Produk UMKM</h1>
          <p className="max-w-2xl text-body-base text-text-secondary">Terbitkan penawaran, tinjau produk dari penjual, lalu tempatkan produk terpilih di urutan teratas rekomendasi.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:min-w-[290px]">
          <div className="card p-3 text-center border border-border"><p className="text-2xl font-black text-brand-primary">{activeCount}</p><p className="text-caption text-text-secondary">Paket aktif</p></div>
          <div className="card p-3 text-center border border-border"><p className="text-2xl font-black text-status-warning">{pendingCount}</p><p className="text-caption text-text-secondary">Perlu ditinjau</p></div>
        </div>
      </div>

      <section className="card overflow-hidden border border-border p-0">
        <div className="border-b border-border p-5 sm:p-6" style={{ backgroundImage: 'linear-gradient(to right, rgba(224, 86, 56, 0.10), rgba(244, 162, 97, 0.10))' }}>
          <h2 className="flex items-center gap-2 text-h3"><Sparkles className="h-5 w-5 text-brand-primary" /> Buat Penawaran Baru</h2>
          <p className="mt-1 text-sm text-text-secondary">Deadline menentukan kapan penawaran dan penempatan produk berakhir otomatis.</p>
        </div>
        <form onSubmit={createOffer} className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1.2fr_0.8fr_1fr_auto] lg:items-end">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-text-primary">Nama promosi</span>
            <input className="input-field w-full" required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="Contoh: Sorotan Akhir Pekan" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-text-primary">Harga penawaran</span>
            <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-brand-primary">Rp</span><input className="input-field w-full pl-10" type="number" inputMode="numeric" min="0" max="1000000000" required value={price} onChange={(event) => setPrice(event.target.value)} placeholder="50000" /></div>
            {price && <span className="mt-1 block text-xs text-text-secondary">{formatRupiah(Number(price) || 0)}</span>}
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-text-primary">Hari, tanggal & jam berakhir</span>
            <input className="input-field w-full" type="datetime-local" min={minimumDeadline} required value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
          </label>
          <button className="btn-primary h-[46px] whitespace-nowrap px-6" type="submit" disabled={isSaving}>{isSaving ? 'Menerbitkan…' : 'Terbitkan Promo'}</button>
        </form>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-h3">Paket yang Ditawarkan</h2><span className="text-sm text-text-secondary">{offers.length} paket</span></div>
        {offers.length === 0 ? (
          <div className="card border border-dashed border-border p-10 text-center"><Megaphone className="mx-auto mb-3 h-10 w-10 text-text-secondary/50" /><p className="font-semibold">Belum ada paket promosi</p><p className="mt-1 text-sm text-text-secondary">Gunakan formulir di atas untuk membuat penawaran pertama.</p></div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {offers.map((offer) => {
              const expired = now > 0 && new Date(offer.expiresAt).getTime() <= now;
              const active = Boolean(offer.isActive) && !expired;
              return <article key={offer.id} className={`card border p-5 ${active ? 'border-brand-primary/25' : 'border-border opacity-80'}`}>
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${active ? 'border-status-success/20 bg-status-success/10 text-status-success' : 'border-border bg-border/50 text-text-secondary'}`}>{active ? 'Aktif ditawarkan' : expired ? 'Telah berakhir' : 'Dinonaktifkan'}</span><h3 className="mt-3 truncate text-lg font-bold text-text-primary">{offer.name}</h3></div><button type="button" onClick={() => toggleOffer(offer)} disabled={busyId === offer.id || expired} className="rounded-xl border border-border p-2.5 text-text-secondary transition-colors hover:border-brand-primary hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-40" aria-label={offer.isActive ? 'Nonaktifkan paket' : 'Aktifkan paket'} title={offer.isActive ? 'Nonaktifkan paket' : 'Aktifkan paket'}><Power className="h-5 w-5" /></button></div>
                <p className="mt-4 text-2xl font-black text-brand-primary">{formatRupiah(offer.price)}</p>
                <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm"><p className="flex gap-2 text-text-primary"><CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-brand-secondary-dark" /><span>{formatPromotionDeadline(offer.expiresAt)}</span></p><p className="flex items-center gap-2 font-semibold text-text-secondary"><Clock3 className="h-4 w-4" />{getPromotionCountdown(offer.expiresAt, now)}</p></div>
              </article>;
            })}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4"><h2 className="text-h3">Pengajuan dari Penjual</h2><p className="mt-1 text-sm text-text-secondary">Setujui produk yang layak mendapat posisi teratas dan label Paling Populer.</p></div>
        {orderedRequests.length === 0 ? (
          <div className="card border border-dashed border-border p-10 text-center"><BadgeCheck className="mx-auto mb-3 h-10 w-10 text-text-secondary/50" /><p className="font-semibold">Belum ada pengajuan</p><p className="mt-1 text-sm text-text-secondary">Pengajuan penjual akan tampil di sini.</p></div>
        ) : (
          <div className="space-y-3">
            {orderedRequests.map((item) => {
              const status = item.status ?? 'pending';
              const expired = now > 0 && new Date(item.expiresAt).getTime() <= now;
              return <article key={item.id} className="card border border-border p-4 sm:p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-[1.3fr_1fr_1.3fr]">
                    <div><p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Produk</p><p className="mt-1 truncate font-bold text-text-primary">{item.productName}</p><p className="mt-1 flex items-center gap-1.5 text-sm text-text-secondary"><Store className="h-4 w-4" />{item.storeName || 'Toko penjual'}</p></div>
                    <div><p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Penawaran</p><p className="mt-1 font-semibold text-text-primary">{item.offerName}</p><p className="mt-1 text-sm font-bold text-brand-primary">{formatRupiah(item.offerPrice)}</p></div>
                    <div><p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Deadline</p><p className="mt-1 text-sm text-text-primary">{formatPromotionDeadline(item.expiresAt)}</p><span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${expired && status === 'approved' ? statusStyle.cancelled : statusStyle[status]}`}>{expired && status === 'approved' ? 'Promosi berakhir' : statusLabel[status]}</span></div>
                  </div>
                  {status === 'pending' && <div className="flex shrink-0 gap-2 sm:justify-end"><button type="button" onClick={() => reviewRequest(item.id, 'rejected')} disabled={busyId === item.id} className="btn-outline flex flex-1 items-center justify-center gap-2 px-4 py-2 text-status-error sm:flex-none"><X className="h-4 w-4" />Tolak</button><button type="button" onClick={() => reviewRequest(item.id, 'approved')} disabled={busyId === item.id || expired} className="btn-primary flex flex-1 items-center justify-center gap-2 px-4 py-2 sm:flex-none"><Check className="h-4 w-4" />Setujui</button></div>}
                </div>
              </article>;
            })}
          </div>
        )}
      </section>
    </div>
  );
}
